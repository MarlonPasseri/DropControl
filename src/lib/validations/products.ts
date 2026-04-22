import { ProductStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .transform((value) => value || undefined),
  );

const optionalUrl = optionalText.pipe(
  z.string().url("Informe uma URL valida.").optional(),
);

export const productSchema = z.object({
  id: optionalText,
  supplierId: z.string().trim().min(1, "Selecione um fornecedor."),
  name: z.string().trim().min(2, "Informe o nome do produto."),
  sku: z.string().trim().min(2, "Informe o SKU interno."),
  category: optionalText,
  storeLink: optionalUrl,
  supplierLink: optionalUrl,
  costPrice: z.coerce.number().positive("Informe o custo do produto."),
  shippingCost: z.coerce.number().min(0, "Informe o custo do frete."),
  salePrice: z.coerce.number().positive("Informe o preco de venda."),
  status: z.nativeEnum(ProductStatus),
  notes: optionalText,
});
