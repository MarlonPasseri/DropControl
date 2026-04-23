"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import {
  countUsersByAccessRole,
  getUserById,
  getUserSecurityById,
  updateUserAccessRole,
  updateUserMfaSettings,
} from "@/lib/data/users";
import { requireAdminUser } from "@/lib/require-user";
import { recordAuditLog, recordSecurityEvent } from "@/lib/security/audit";
import {
  buildPendingMfaSetupValue,
  buildVerifiedMfaSessionValue,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  getMfaSetupCookieName,
  getMfaVerificationCookieName,
  getMfaVerificationCookieOptions,
  getPendingMfaSetupCookieOptions,
  readPendingMfaSetupValue,
  verifyTotpCode,
} from "@/lib/security/mfa";
import { getRoleLabel, isAdminRole, resolveAppRoleForUser } from "@/lib/security/roles";
import { updateUserAccessSchema, verifyMfaCodeSchema } from "@/lib/validations/security";

function securityRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/security?${query}` : "/security");
}

function resolveRedirectTarget(rawTarget?: string) {
  if (!rawTarget) {
    return "/dashboard";
  }

  if (rawTarget.startsWith("/")) {
    return rawTarget;
  }

  try {
    const url = new URL(rawTarget);
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

async function requireAdminSessionWithoutMfa() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  return session.user;
}

export async function updateUserAccess(formData: FormData) {
  const actor = await requireAdminUser();
  const parsed = updateUserAccessSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    securityRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do acesso.",
    });
  }

  const targetUser = await getUserById(parsed.data.userId);

  if (!targetUser) {
    securityRedirect({
      error: "Usuario nao encontrado.",
    });
  }

  const currentRole = await resolveAppRoleForUser(targetUser);

  if (parsed.data.role === currentRole) {
    securityRedirect({
      success: `O acesso de ${targetUser.name} ja estava como ${getRoleLabel(currentRole)}.`,
    });
  }

  if (targetUser.id === actor.id && parsed.data.role !== "ADMIN") {
    securityRedirect({
      error: "Voce nao pode remover seu proprio acesso administrativo por aqui.",
    });
  }

  if (currentRole === "ADMIN" && parsed.data.role !== "ADMIN") {
    const roleSummary = await countUsersByAccessRole();

    if (roleSummary.ADMIN <= 1) {
      securityRedirect({
        error: "O ambiente precisa manter pelo menos um administrador.",
      });
    }
  }

  await updateUserAccessRole(targetUser.id, parsed.data.role);
  await recordAuditLog({
    actor,
    action: "UPDATE_ROLE",
    resource: "user_access",
    resourceId: targetUser.id,
    summary: `Nivel de acesso de ${targetUser.email} alterado para ${parsed.data.role}.`,
    metadata: {
      targetUserEmail: targetUser.email,
      previousRole: currentRole,
      newRole: parsed.data.role,
    },
  });
  await recordSecurityEvent({
    userId: targetUser.id,
    email: targetUser.email,
    type: "USER_ACCESS_ROLE_UPDATED",
    severity: "WARN",
    message: `Nivel de acesso alterado para ${parsed.data.role}.`,
    metadata: {
      actorUserId: actor.id,
      actorEmail: actor.email ?? null,
      previousRole: currentRole,
      newRole: parsed.data.role,
    },
  });

  revalidatePath("/security");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  securityRedirect({
    success: `Acesso de ${targetUser.name} atualizado para ${getRoleLabel(parsed.data.role)}.`,
  });
}

export async function beginMfaSetup() {
  const actor = await requireAdminUser();
  const secret = generateTotpSecret();
  const cookieStore = await cookies();

  cookieStore.set(
    getMfaSetupCookieName(),
    buildPendingMfaSetupValue({
      userId: actor.id,
      secret,
      createdAt: Date.now(),
    }),
    getPendingMfaSetupCookieOptions(),
  );

  securityRedirect({
    success: "Configuracao MFA gerada. Cadastre a chave no autenticador e confirme o codigo.",
  });
}

export async function cancelMfaSetup() {
  await requireAdminUser();
  const cookieStore = await cookies();
  cookieStore.delete(getMfaSetupCookieName());

  securityRedirect({
    success: "Configuracao MFA temporaria descartada.",
  });
}

export async function confirmMfaSetup(formData: FormData) {
  const actor = await requireAdminUser();
  const parsed = verifyMfaCodeSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    securityRedirect({
      error: parsed.error.issues[0]?.message ?? "Informe um codigo MFA valido.",
    });
  }

  const cookieStore = await cookies();
  const pendingSetup = readPendingMfaSetupValue(
    cookieStore.get(getMfaSetupCookieName())?.value,
    actor.id,
  );

  if (!pendingSetup) {
    securityRedirect({
      error: "A configuracao MFA expirou. Gere uma nova chave para continuar.",
    });
  }

  if (!verifyTotpCode({ secret: pendingSetup.secret, code: parsed.data.code })) {
    securityRedirect({
      error: "Codigo MFA invalido. Confira o autenticador e tente novamente.",
    });
  }

  await updateUserMfaSettings(actor.id, {
    mfaEnabled: true,
    mfaSecretCiphertext: encryptMfaSecret(pendingSetup.secret),
    mfaEnrolledAt: new Date(),
  });
  await recordAuditLog({
    actor,
    action: "ENABLE_MFA",
    resource: "user_security",
    resourceId: actor.id,
    summary: "Autenticacao multifator ativada.",
  });
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_ENABLED",
    severity: "INFO",
    message: "Autenticacao multifator ativada para conta administrativa.",
  });

  cookieStore.delete(getMfaSetupCookieName());
  cookieStore.set(
    getMfaVerificationCookieName(),
    buildVerifiedMfaSessionValue({
      userId: actor.id,
      verifiedAt: Date.now(),
    }),
    getMfaVerificationCookieOptions(),
  );

  revalidatePath("/security");
  revalidatePath("/profile");
  securityRedirect({
    success: "MFA ativado com sucesso para sua conta administrativa.",
  });
}

export async function disableMfa(formData: FormData) {
  const actor = await requireAdminUser();
  const parsed = verifyMfaCodeSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    securityRedirect({
      error: parsed.error.issues[0]?.message ?? "Informe um codigo MFA valido.",
    });
  }

  const securityUser = await getUserSecurityById(actor.id);

  if (!securityUser?.mfaEnabled || !securityUser.mfaSecretCiphertext) {
    securityRedirect({
      error: "MFA nao esta ativa para esta conta.",
    });
  }

  const secret = decryptMfaSecret(securityUser.mfaSecretCiphertext);

  if (!secret || !verifyTotpCode({ secret, code: parsed.data.code })) {
    securityRedirect({
      error: "Codigo MFA invalido. A desativacao nao foi realizada.",
    });
  }

  await updateUserMfaSettings(actor.id, {
    mfaEnabled: false,
    mfaSecretCiphertext: null,
    mfaEnrolledAt: null,
  });
  await recordAuditLog({
    actor,
    action: "DISABLE_MFA",
    resource: "user_security",
    resourceId: actor.id,
    summary: "Autenticacao multifator desativada.",
  });
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_DISABLED",
    severity: "WARN",
    message: "Autenticacao multifator desativada para conta administrativa.",
  });

  const cookieStore = await cookies();
  cookieStore.delete(getMfaSetupCookieName());
  cookieStore.delete(getMfaVerificationCookieName());

  revalidatePath("/security");
  revalidatePath("/profile");
  securityRedirect({
    success: "MFA desativado para sua conta.",
  });
}

export async function verifyMfaChallenge(formData: FormData) {
  const actor = await requireAdminSessionWithoutMfa();
  const parsed = verifyMfaCodeSchema.safeParse({
    code: formData.get("code"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    const redirectTarget = resolveRedirectTarget(`${formData.get("callbackUrl") ?? ""}`);
    redirect(
      `/login/mfa?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Informe um codigo MFA valido.",
      )}&callbackUrl=${encodeURIComponent(redirectTarget)}`,
    );
  }

  const securityUser = await getUserSecurityById(actor.id);

  if (!securityUser?.mfaEnabled || !securityUser.mfaSecretCiphertext) {
    redirect(resolveRedirectTarget(parsed.data.callbackUrl));
  }

  const secret = decryptMfaSecret(securityUser.mfaSecretCiphertext);
  const redirectTarget = resolveRedirectTarget(parsed.data.callbackUrl);

  if (!secret || !verifyTotpCode({ secret, code: parsed.data.code })) {
    await recordSecurityEvent({
      userId: actor.id,
      email: actor.email ?? null,
      type: "MFA_CHALLENGE_FAILED",
      severity: "WARN",
      message: "Falha ao validar segundo fator.",
    });
    redirect(
      `/login/mfa?error=${encodeURIComponent(
        "Codigo do autenticador invalido.",
      )}&callbackUrl=${encodeURIComponent(redirectTarget)}`,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(
    getMfaVerificationCookieName(),
    buildVerifiedMfaSessionValue({
      userId: actor.id,
      verifiedAt: Date.now(),
    }),
    getMfaVerificationCookieOptions(),
  );
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_CHALLENGE_SUCCESS",
    severity: "INFO",
    message: "Segundo fator validado com sucesso.",
  });

  redirect(redirectTarget);
}

export async function abortMfaChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(getMfaVerificationCookieName());
  cookieStore.delete(getMfaSetupCookieName());
  await signOut({ redirectTo: "/login" });
}
