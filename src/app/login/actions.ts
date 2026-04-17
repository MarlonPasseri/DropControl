"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { type FormState, initialFormState } from "@/app/login/form-state";
import { createUser, getUserByEmail, getUserCount } from "@/lib/data/users";
import { hashPassword } from "@/lib/password";
import { registerSchema, signInSchema } from "@/lib/validations/auth";

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
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            status: "error",
            message: "E-mail ou senha invalidos.",
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

export async function registerOperator(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados da conta.",
    };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return {
        status: "error",
        message: "Ja existe uma conta com esse e-mail.",
      };
    }

    const totalUsers = await getUserCount();
    const passwordHash = await hashPassword(password);

    await createUser({
      name,
      email,
      passwordHash,
    });

    return {
      status: "success",
      message:
        totalUsers === 0
          ? "Conta inicial criada. Entre com esse e-mail e senha."
          : "Conta criada com sucesso. Agora e so entrar.",
    };
  } catch {
    return {
      status: "error",
      message:
        "Nao foi possivel criar a conta. Confira DATABASE_URL, migrations e a conexao com o banco.",
    };
  }
}
