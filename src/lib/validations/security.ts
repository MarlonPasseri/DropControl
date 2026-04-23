import { z } from "zod";

export const updateUserAccessSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "Usuario invalido."),
  role: z.enum(["ADMIN", "OPERATOR"], {
    message: "Selecione um nivel de acesso valido.",
  }),
});

export const verifyMfaCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Informe o codigo do autenticador.")
    .max(32, "Codigo MFA invalido."),
  callbackUrl: z.string().optional(),
});
