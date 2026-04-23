"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { type FormState, initialFormState } from "@/app/login/form-state";
import {
  clearUserPasswordResetToken,
  createUser,
  getUserByEmail,
  getUserByPasswordResetTokenHash,
  setUserPasswordResetToken,
  updateUserPassword,
} from "@/lib/data/users";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import {
  assertPasswordResetConsumeAllowed,
  assertPasswordResetRequestAllowed,
  clearPasswordResetConsumeFailures,
  clearPasswordResetRequestFailures,
  clearRegistrationFailures,
  getClientIp,
  isRegistrationBlocked,
  recordPasswordResetConsumeFailure,
  recordPasswordResetRequestFailure,
  recordRegistrationFailure,
} from "@/lib/security/auth-guard";
import { assertTrustedActionOrigin } from "@/lib/security/action-origin";
import { recordSecurityEvent } from "@/lib/security/audit";
import { generatePasswordResetToken, hashPasswordResetToken } from "@/lib/security/password-reset";
import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  registerSchema,
  signInSchema,
} from "@/lib/validations/auth";

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

function buildAppBaseUrl(requestHeaders: Headers) {
  const explicitUrl = process.env.APP_URL?.trim() || process.env.AUTH_URL?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

function passwordResetRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/login/reset-password?${query}` : "/login/reset-password");
}

export async function authenticate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await assertTrustedActionOrigin();
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Tentativa de login bloqueada por origem nao confiavel.",
    });

    return {
      status: "error",
      message: "Solicitacao bloqueada por seguranca. Recarregue a pagina e tente novamente.",
    };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados de acesso.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: resolveRedirectTarget(parsed.data.redirectTo),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const authError = error as AuthError & { code?: string };

      switch (error.type) {
        case "CredentialsSignin":
          return {
            status: "error",
            message:
              authError.code === "temporarily_blocked"
                ? "Muitas tentativas de acesso. Aguarde 10 minutos e tente novamente."
                : "E-mail ou senha invalidos.",
          };
        default:
          return {
            status: "error",
            message: "Nao foi possivel entrar agora.",
          };
      }
    }

    throw error;
  }

  return initialFormState;
}

export async function authenticateWithGoogle(formData: FormData) {
  try {
    await assertTrustedActionOrigin();
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Tentativa de login Google bloqueada por origem nao confiavel.",
    });
    redirect("/login?error=AccessDenied");
  }

  await signIn("google", {
    redirectTo: resolveRedirectTarget(`${formData.get("redirectTo") ?? ""}`),
  });
}

export async function registerOperator(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await assertTrustedActionOrigin();
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Cadastro bloqueado por origem nao confiavel.",
    });

    return {
      status: "error",
      message: "Solicitacao bloqueada por seguranca. Recarregue a pagina e tente novamente.",
    };
  }

  const clientIp = getClientIp(await headers());

  if (isRegistrationBlocked(clientIp)) {
    await recordSecurityEvent({
      type: "REGISTRATION_BLOCKED",
      severity: "WARN",
      message: "Cadastro bloqueado por excesso de tentativas.",
      metadata: { clientIp },
    });

    return {
      status: "error",
      message: "Cadastro temporariamente bloqueado. Aguarde alguns minutos e tente novamente.",
    };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    recordRegistrationFailure(clientIp);
    await recordSecurityEvent({
      type: "REGISTRATION_VALIDATION_FAILED",
      severity: "WARN",
      message: parsed.error.issues[0]?.message ?? "Falha de validacao no cadastro.",
      metadata: { clientIp },
    });

    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados da conta.",
    };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      recordRegistrationFailure(clientIp);
      await recordSecurityEvent({
        email,
        type: "REGISTRATION_DUPLICATE_EMAIL",
        severity: "WARN",
        message: "Tentativa de cadastro com e-mail ja existente.",
        metadata: { clientIp },
      });

      return {
        status: "error",
        message: "Ja existe uma conta com esse e-mail. Entre com ela para continuar.",
      };
    }

    const passwordHash = await hashPassword(password);

    const createdUser = await createUser({
      name,
      email,
      passwordHash,
    });
    await recordSecurityEvent({
      userId: createdUser.id,
      email: createdUser.email,
      type: "REGISTRATION_SUCCESS",
      severity: "INFO",
      message: "Conta criada com sucesso.",
      metadata: { clientIp },
    });

    clearRegistrationFailures(clientIp);
  } catch {
    recordRegistrationFailure(clientIp);
    await recordSecurityEvent({
      email,
      type: "REGISTRATION_ERROR",
      severity: "ERROR",
      message: "Erro ao criar conta.",
      metadata: { clientIp },
    });

    return {
      status: "error",
      message:
        "Nao foi possivel criar a conta. Confira DATABASE_URL, migrations e a conexao com o banco.",
    };
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: resolveRedirectTarget(`${formData.get("redirectTo") ?? ""}`),
  });

  return {
    status: "success",
    message: "Conta criada com sucesso.",
  };
}

export async function requestPasswordReset(formData: FormData) {
  const genericSuccessMessage =
    "Se existir uma conta com esse e-mail, enviamos um link seguro para redefinicao.";

  let requestHeaders: Headers;
  let context;

  try {
    ({ headers: requestHeaders, context } = await assertTrustedActionOrigin());
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Pedido de reset de senha bloqueado por origem nao confiavel.",
    });
    passwordResetRedirect({
      error: "Solicitacao bloqueada por seguranca. Recarregue a pagina e tente novamente.",
    });
  }

  const rawEmail = `${formData.get("email") ?? ""}`;

  try {
    assertPasswordResetRequestAllowed(rawEmail, requestHeaders);
  } catch {
    await recordSecurityEvent({
      email: rawEmail || null,
      type: "PASSWORD_RESET_RATE_LIMITED",
      severity: "WARN",
      message: "Reset de senha bloqueado temporariamente por excesso de tentativas.",
      context,
    });
    passwordResetRedirect({
      error: "Muitas tentativas de redefinicao. Aguarde alguns minutos e tente novamente.",
    });
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    recordPasswordResetRequestFailure(rawEmail, requestHeaders);
    await recordSecurityEvent({
      email: rawEmail || null,
      type: "PASSWORD_RESET_REQUEST_INVALID",
      severity: "WARN",
      message: parsed.error.issues[0]?.message ?? "Falha de validacao no reset de senha.",
      context,
    });
    passwordResetRedirect({
      error: parsed.error.issues[0]?.message ?? "Informe um e-mail valido.",
    });
  }

  if (!isPasswordResetEmailConfigured()) {
    await recordSecurityEvent({
      email: parsed.data.email,
      type: "PASSWORD_RESET_EMAIL_NOT_CONFIGURED",
      severity: "ERROR",
      message: "Reset de senha indisponivel: SMTP nao configurado.",
      context,
    });
    passwordResetRedirect({
      error: "Reset de senha indisponivel neste ambiente. Configure SMTP para liberar este fluxo.",
    });
  }

  const user = await getUserByEmail(parsed.data.email);

  if (!user) {
    clearPasswordResetRequestFailures(parsed.data.email, requestHeaders);
    await recordSecurityEvent({
      email: parsed.data.email,
      type: "PASSWORD_RESET_REQUESTED_UNKNOWN_EMAIL",
      severity: "WARN",
      message: "Pedido de reset para e-mail nao encontrado.",
      context,
    });
    passwordResetRedirect({
      success: genericSuccessMessage,
    });
  }

  const resetToken = generatePasswordResetToken();

  await setUserPasswordResetToken(user.id, {
    tokenHash: resetToken.tokenHash,
    expiresAt: resetToken.expiresAt,
  });

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl: `${buildAppBaseUrl(requestHeaders)}/login/reset-password?token=${encodeURIComponent(resetToken.token)}`,
      expiresAt: resetToken.expiresAt,
    });
  } catch (error) {
    await clearUserPasswordResetToken(user.id);
    recordPasswordResetRequestFailure(parsed.data.email, requestHeaders);
    await recordSecurityEvent({
      userId: user.id,
      email: user.email,
      type: "PASSWORD_RESET_EMAIL_FAILED",
      severity: "ERROR",
      message: "Nao foi possivel enviar o e-mail de reset de senha.",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
      context,
    });
    passwordResetRedirect({
      error: "Nao foi possivel enviar o e-mail de redefinicao agora. Tente novamente em instantes.",
    });
  }

  clearPasswordResetRequestFailures(parsed.data.email, requestHeaders);
  await recordSecurityEvent({
    userId: user.id,
    email: user.email,
    type: "PASSWORD_RESET_REQUESTED",
    severity: "INFO",
    message: "Link seguro de redefinicao de senha enviado por e-mail.",
    context,
  });
  passwordResetRedirect({
    success: genericSuccessMessage,
  });
}

export async function completePasswordReset(formData: FormData) {
  let requestHeaders: Headers;
  let context;

  try {
    ({ headers: requestHeaders, context } = await assertTrustedActionOrigin());
  } catch {
    await recordSecurityEvent({
      type: "SERVER_ACTION_ORIGIN_REJECTED",
      severity: "WARN",
      message: "Conclusao de reset de senha bloqueada por origem nao confiavel.",
    });
    passwordResetRedirect({
      error: "Solicitacao bloqueada por seguranca. Reabra o link e tente novamente.",
    });
  }

  const rawToken = `${formData.get("token") ?? ""}`;

  try {
    assertPasswordResetConsumeAllowed(rawToken.slice(0, 12) || "reset", requestHeaders);
  } catch {
    await recordSecurityEvent({
      type: "PASSWORD_RESET_CONSUME_RATE_LIMITED",
      severity: "WARN",
      message: "Confirmacao de reset de senha bloqueada temporariamente por excesso de tentativas.",
      context,
    });
    passwordResetRedirect({
      token: rawToken,
      error: "Muitas tentativas nesta redefinicao. Aguarde alguns minutos e tente novamente.",
    });
  }

  const parsed = passwordResetCompleteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    recordPasswordResetConsumeFailure(rawToken.slice(0, 12) || "reset", requestHeaders);
    passwordResetRedirect({
      token: rawToken,
      error: parsed.error.issues[0]?.message ?? "Revise a nova senha.",
    });
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const user = await getUserByPasswordResetTokenHash(tokenHash);

  if (!user) {
    recordPasswordResetConsumeFailure(rawToken.slice(0, 12) || "reset", requestHeaders);
    await recordSecurityEvent({
      type: "PASSWORD_RESET_TOKEN_INVALID",
      severity: "WARN",
      message: "Tentativa de uso de token de reset invalido ou expirado.",
      context,
    });
    passwordResetRedirect({
      error: "Este link de redefinicao e invalido ou expirou. Solicite um novo.",
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await updateUserPassword(user.id, {
    passwordHash,
  });
  clearPasswordResetConsumeFailures(rawToken.slice(0, 12) || "reset", requestHeaders);
  clearPasswordResetRequestFailures(user.email, requestHeaders);
  await recordSecurityEvent({
    userId: user.id,
    email: user.email,
    type: "PASSWORD_RESET_COMPLETED",
    severity: "WARN",
    message: "Senha redefinida com sucesso via token de recuperacao.",
    context,
  });

  redirect("/login?reset=success");
}
