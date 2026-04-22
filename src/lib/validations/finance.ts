import { FinancialCategory, FinancialEntryType } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .transform((value) => value || undefined),
  );

export const financialEntrySchema = z.object({
  id: optionalText,
  orderId: optionalText,
  type: z.nativeEnum(FinancialEntryType),
  category: z.nativeEnum(FinancialCategory),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  referenceDate: z.string().trim().min(1, "Informe a data de referencia."),
  description: optionalText,
});
