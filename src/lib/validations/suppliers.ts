import { ContactChannel } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}, z.number().finite().optional());

export const supplierSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Informe o nome do fornecedor."),
  contactName: optionalText,
  contactChannel: z.nativeEnum(ContactChannel).optional(),
  region: optionalText,
  avgShippingDays: optionalNumber,
  reliabilityScore: optionalNumber,
  issueRate: optionalNumber,
  notes: optionalText,
});
