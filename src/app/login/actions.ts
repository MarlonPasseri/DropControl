"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { type FormState, initialFormState } from "@/app/login/form-state";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { hashPassword } from "@/lib/password";
import {
  clearRegistrationFailures,
  getClientIp,
  isRegistrationBlocked,
  recordRegistrationFailure,
} from "@/lib/security/auth-guard";
import { recordSecurityEvent } from "@/lib/security/audit";
import { registerSchema, signInSchema } from "@/lib/validations/auth";

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

export async function authenticate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
  await signIn("google", {
    redirectTo: resolveRedirectTarget(`${formData.get("redirectTo") ?? ""}`),
  });
}

export async function registerOperator(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
