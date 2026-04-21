"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { type FormState, initialFormState } from "@/app/login/form-state";
import { createUser, getUserByEmail, getUserCount } from "@/lib/data/users";
import { hashPassword } from "@/lib/password";
import {
  clearRegistrationFailures,
  getClientIp,
  isRegistrationBlocked,
  recordRegistrationFailure,
} from "@/lib/security/auth-guard";
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
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados da conta.",
    };
  }

  const { name, email, password } = parsed.data;

  try {
    const totalUsers = await getUserCount();

    if (totalUsers > 0) {
      return {
        status: "error",
        message: "Cadastro publico encerrado. Entre com uma conta ja liberada.",
      };
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      recordRegistrationFailure(clientIp);
      return {
        status: "error",
        message: "Ja existe uma conta com esse e-mail.",
      };
    }

    const passwordHash = await hashPassword(password);

    await createUser({
      name,
      email,
      passwordHash,
    });

    clearRegistrationFailures(clientIp);

    return {
      status: "success",
      message:
        totalUsers === 0
          ? "Conta inicial criada. Entre com esse e-mail e senha."
          : "Conta criada com sucesso. Agora e so entrar.",
    };
  } catch {
    recordRegistrationFailure(clientIp);
    return {
      status: "error",
      message:
        "Nao foi possivel criar a conta. Confira DATABASE_URL, migrations e a conexao com o banco.",
    };
  }
}
