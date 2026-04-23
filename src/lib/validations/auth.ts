import { z } from "zod";

const emailField = z.string().trim().toLowerCase().email("Digite um e-mail valido.");
const signInPasswordField = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha precisa ter no maximo 72 caracteres.");
const registerPasswordField = z
  .string()
  .min(12, "Use pelo menos 12 caracteres para a senha.")
  .max(72, "A senha precisa ter no maximo 72 caracteres.");

export const signInSchema = z.object({
  email: emailField,
  password: signInPasswordField,
  redirectTo: z.string().optional(),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "O nome precisa ter no maximo 80 caracteres."),
    email: emailField,
    password: registerPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais.",
  });

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(80, "O nome precisa ter no maximo 80 caracteres."),
  phone: z
    .string()
    .trim()
    .max(40, "O telefone precisa ter no maximo 40 caracteres.")
    .optional()
    .transform((value) => value || null),
  company: z
    .string()
    .trim()
    .max(120, "A empresa precisa ter no maximo 120 caracteres.")
    .optional()
    .transform((value) => value || null),
});
