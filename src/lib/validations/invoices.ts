import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

const optionalNumber = z.preprocess((value) => {
  const rawValue = `${value ?? ""}`.trim();

  if (!rawValue) {
    return undefined;
  }

  return Number(rawValue);
}, z.number().min(0, "Informe um valor igual ou maior que zero.").optional());

export const invoiceSchema = z.object({
  id: z.string().trim().optional(),
  orderId: optionalText,
  supplierId: optionalText,
  number: z.string().trim().min(1, "Informe o numero da nota fiscal."),
  series: optionalText,
  accessKey: optionalText,
  type: z.nativeEnum(InvoiceType),
  status: z.nativeEnum(InvoiceStatus),
  issueDate: z.string().trim().min(1, "Informe a data de emissao."),
  dueDate: optionalText,
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  taxAmount: optionalNumber,
  notes: optionalText,
});
