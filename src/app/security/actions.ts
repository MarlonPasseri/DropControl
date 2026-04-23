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
import { assertTrustedActionOrigin } from "@/lib/security/action-origin";
import { recordAuditLog, recordSecurityEvent } from "@/lib/security/audit";
import {
  assertMfaChallengeAllowed,
  clearMfaChallengeFailures,
  recordMfaChallengeFailure,
} from "@/lib/security/auth-guard";
import {
  buildPendingMfaSetupValue,
  buildRecoveryCodesDisplayValue,
  buildVerifiedMfaSessionValue,
  consumeRecoveryCode,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  getMfaRecoveryCodesCookieName,
  getMfaSetupCookieName,
  getMfaVerificationCookieName,
  getMfaVerificationCookieOptions,
  getPendingMfaSetupCookieOptions,
  getRecoveryCodeCount,
  getRecoveryCodesCookieOptions,
  hashRecoveryCodes,
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

async function ensureTrustedSecurityAction() {
  try {
    return await assertTrustedActionOrigin();
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Acao administrativa bloqueada por origem nao confiavel.",
    });
    securityRedirect({
      error: "Solicitacao bloqueada por seguranca. Recarregue a pagina e tente novamente.",
    });
  }
}

function matchesMfaOrRecoveryCode(input: {
  securityUser: Awaited<ReturnType<typeof getUserSecurityById>>;
  code: string;
}) {
  const secret = decryptMfaSecret(input.securityUser?.mfaSecretCiphertext);

  if (secret && verifyTotpCode({ secret, code: input.code })) {
    return {
      matched: true,
      nextRecoveryCodes:
        Array.isArray(input.securityUser?.mfaRecoveryCodes) &&
        input.securityUser.mfaRecoveryCodes.every((value) => typeof value === "string")
          ? (input.securityUser.mfaRecoveryCodes as string[])
          : null,
      usedRecoveryCode: false,
    };
  }

  const recoveryResult = consumeRecoveryCode(input.securityUser?.mfaRecoveryCodes, input.code);

  return {
    matched: recoveryResult.matched,
    nextRecoveryCodes: recoveryResult.nextCodes,
    usedRecoveryCode: recoveryResult.matched,
  };
}

async function storeRecoveryCodesForDisplay(userId: string, codes: string[]) {
  const cookieStore = await cookies();
  cookieStore.set(
    getMfaRecoveryCodesCookieName(),
    buildRecoveryCodesDisplayValue({
      userId,
      codes,
      createdAt: Date.now(),
    }),
    getRecoveryCodesCookieOptions(),
  );
}

export async function updateUserAccess(formData: FormData) {
  const actor = await requireAdminUser();
  const { context } = await ensureTrustedSecurityAction();
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
    context,
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
    context,
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
  await ensureTrustedSecurityAction();
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
  await ensureTrustedSecurityAction();
  const cookieStore = await cookies();
  cookieStore.delete(getMfaSetupCookieName());

  securityRedirect({
    success: "Configuracao MFA temporaria descartada.",
  });
}

export async function confirmMfaSetup(formData: FormData) {
  const actor = await requireAdminUser();
  const { context } = await ensureTrustedSecurityAction();
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

  const recoveryCodes = generateRecoveryCodes();

  await updateUserMfaSettings(actor.id, {
    mfaEnabled: true,
    mfaSecretCiphertext: encryptMfaSecret(pendingSetup.secret),
    mfaRecoveryCodes: hashRecoveryCodes(recoveryCodes),
    mfaEnrolledAt: new Date(),
  });
  await recordAuditLog({
    actor,
    action: "ENABLE_MFA",
    resource: "user_security",
    resourceId: actor.id,
    summary: "Autenticacao multifator ativada.",
    context,
  });
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_ENABLED",
    severity: "INFO",
    message: "Autenticacao multifator ativada para conta administrativa.",
    context,
  });

  cookieStore.delete(getMfaSetupCookieName());
  cookieStore.delete(getMfaRecoveryCodesCookieName());
  cookieStore.set(
    getMfaVerificationCookieName(),
    buildVerifiedMfaSessionValue({
      userId: actor.id,
      verifiedAt: Date.now(),
    }),
    getMfaVerificationCookieOptions(),
  );
  await storeRecoveryCodesForDisplay(actor.id, recoveryCodes);

  revalidatePath("/security");
  revalidatePath("/profile");
  securityRedirect({
    success: "MFA ativado com sucesso. Guarde os recovery codes mostrados abaixo em local seguro.",
  });
}

export async function disableMfa(formData: FormData) {
  const actor = await requireAdminUser();
  const { context } = await ensureTrustedSecurityAction();
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

  const validation = matchesMfaOrRecoveryCode({
    securityUser,
    code: parsed.data.code,
  });

  if (!validation.matched) {
    securityRedirect({
      error: "Codigo MFA ou recovery code invalido. A desativacao nao foi realizada.",
    });
  }

  await updateUserMfaSettings(actor.id, {
    mfaEnabled: false,
    mfaSecretCiphertext: null,
    mfaRecoveryCodes: null,
    mfaEnrolledAt: null,
  });
  await recordAuditLog({
    actor,
    action: "DISABLE_MFA",
    resource: "user_security",
    resourceId: actor.id,
    summary: "Autenticacao multifator desativada.",
    context,
  });
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_DISABLED",
    severity: "WARN",
    message: "Autenticacao multifator desativada para conta administrativa.",
    metadata: {
      viaRecoveryCode: validation.usedRecoveryCode,
    },
    context,
  });

  const cookieStore = await cookies();
  cookieStore.delete(getMfaSetupCookieName());
  cookieStore.delete(getMfaRecoveryCodesCookieName());
  cookieStore.delete(getMfaVerificationCookieName());

  revalidatePath("/security");
  revalidatePath("/profile");
  securityRedirect({
    success: "MFA desativado para sua conta.",
  });
}

export async function regenerateMfaRecoveryCodes(formData: FormData) {
  const actor = await requireAdminUser();
  const { context } = await ensureTrustedSecurityAction();
  const parsed = verifyMfaCodeSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    securityRedirect({
      error:
        parsed.error.issues[0]?.message ??
        "Informe um codigo valido para regenerar os recovery codes.",
    });
  }

  const securityUser = await getUserSecurityById(actor.id);

  if (!securityUser?.mfaEnabled || !securityUser.mfaSecretCiphertext) {
    securityRedirect({
      error: "Ative MFA antes de gerar recovery codes.",
    });
  }

  const validation = matchesMfaOrRecoveryCode({
    securityUser,
    code: parsed.data.code,
  });

  if (!validation.matched) {
    securityRedirect({
      error: "Codigo MFA ou recovery code invalido. Nenhum recovery code foi alterado.",
    });
  }

  const recoveryCodes = generateRecoveryCodes();

  await updateUserMfaSettings(actor.id, {
    mfaEnabled: true,
    mfaSecretCiphertext: securityUser.mfaSecretCiphertext,
    mfaRecoveryCodes: hashRecoveryCodes(recoveryCodes),
    mfaEnrolledAt: securityUser.mfaEnrolledAt ?? new Date(),
  });
  await recordAuditLog({
    actor,
    action: "REGENERATE_MFA_RECOVERY_CODES",
    resource: "user_security",
    resourceId: actor.id,
    summary: "Recovery codes regenerados para MFA.",
    metadata: {
      viaRecoveryCode: validation.usedRecoveryCode,
    },
    context,
  });
  await recordSecurityEvent({
    userId: actor.id,
    email: actor.email ?? null,
    type: "MFA_RECOVERY_CODES_REGENERATED",
    severity: "WARN",
    message: "Recovery codes da MFA foram regenerados.",
    metadata: {
      viaRecoveryCode: validation.usedRecoveryCode,
    },
    context,
  });

  const cookieStore = await cookies();
  cookieStore.delete(getMfaRecoveryCodesCookieName());
  await storeRecoveryCodesForDisplay(actor.id, recoveryCodes);

  revalidatePath("/security");
  securityRedirect({
    success: "Recovery codes atualizados. Guarde o novo conjunto mostrado abaixo.",
  });
}

export async function dismissRecoveryCodes() {
  await requireAdminUser();
  await ensureTrustedSecurityAction();
  const cookieStore = await cookies();
  cookieStore.delete(getMfaRecoveryCodesCookieName());

  securityRedirect({
    success: "Painel de recovery codes ocultado.",
  });
}

export async function verifyMfaChallenge(formData: FormData) {
  const actor = await requireAdminSessionWithoutMfa();
  const { headers: requestHeaders, context } = await assertTrustedActionOrigin();
  const challengeKey = actor.id;

  try {
    assertMfaChallengeAllowed(challengeKey, requestHeaders);
  } catch {
    await recordSecurityEvent({
      userId: actor.id,
      email: actor.email ?? null,
      type: "MFA_CHALLENGE_RATE_LIMITED",
      severity: "WARN",
      message: "Segundo fator bloqueado temporariamente por excesso de tentativas.",
      context,
    });
    redirect(
      `/login/mfa?error=${encodeURIComponent(
        "Muitas tentativas no segundo fator. Aguarde alguns minutos e tente novamente.",
      )}&callbackUrl=${encodeURIComponent(resolveRedirectTarget(`${formData.get("callbackUrl") ?? ""}`))}`,
    );
  }

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
  const recoveryResult = consumeRecoveryCode(securityUser.mfaRecoveryCodes, parsed.data.code);
  const totpMatched = Boolean(secret && verifyTotpCode({ secret, code: parsed.data.code }));

  if (!totpMatched && !recoveryResult.matched) {
    recordMfaChallengeFailure(challengeKey, requestHeaders);
    await recordSecurityEvent({
      userId: actor.id,
      email: actor.email ?? null,
      type: "MFA_CHALLENGE_FAILED",
      severity: "WARN",
      message: "Falha ao validar segundo fator.",
      context,
    });
    redirect(
      `/login/mfa?error=${encodeURIComponent(
        "Codigo do autenticador ou recovery code invalido.",
      )}&callbackUrl=${encodeURIComponent(redirectTarget)}`,
    );
  }

  clearMfaChallengeFailures(challengeKey, requestHeaders);

  if (recoveryResult.matched) {
    await updateUserMfaSettings(actor.id, {
      mfaEnabled: true,
      mfaSecretCiphertext: securityUser.mfaSecretCiphertext,
      mfaRecoveryCodes: recoveryResult.nextCodes,
      mfaEnrolledAt: securityUser.mfaEnrolledAt,
    });
    await recordSecurityEvent({
      userId: actor.id,
      email: actor.email ?? null,
      type: "MFA_RECOVERY_CODE_USED",
      severity: "WARN",
      message: "Recovery code usado para concluir o segundo fator.",
      metadata: {
        remainingRecoveryCodes: getRecoveryCodeCount(recoveryResult.nextCodes),
      },
      context,
    });
    revalidatePath("/security");
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
    type: recoveryResult.matched ? "MFA_CHALLENGE_SUCCESS_WITH_RECOVERY" : "MFA_CHALLENGE_SUCCESS",
    severity: recoveryResult.matched ? "WARN" : "INFO",
    message: recoveryResult.matched
      ? "Segundo fator validado com recovery code."
      : "Segundo fator validado com sucesso.",
    context,
  });

  redirect(redirectTarget);
}

export async function abortMfaChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(getMfaVerificationCookieName());
  cookieStore.delete(getMfaSetupCookieName());
  cookieStore.delete(getMfaRecoveryCodesCookieName());
  await signOut({ redirectTo: "/login" });
}
