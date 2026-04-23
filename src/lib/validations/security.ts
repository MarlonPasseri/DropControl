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
