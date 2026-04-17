import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Digite um e-mail valido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha precisa ter no maximo 72 caracteres."),
  redirectTo: z.string().optional(),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "O nome precisa ter no maximo 80 caracteres."),
    email: z.string().trim().email("Digite um e-mail valido."),
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .max(72, "A senha precisa ter no maximo 72 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais.",
  });
