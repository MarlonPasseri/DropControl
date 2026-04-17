import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

export const orderSchema = z.object({
  id: z.string().trim().optional(),
  orderNumber: z.string().trim().min(2, "Informe o numero do pedido."),
  customerName: z.string().trim().min(2, "Informe o nome do cliente."),
  customerEmail: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .pipe(z.string().email("Informe um e-mail valido.").optional()),
  productId: z.string().trim().min(1, "Selecione um produto."),
  supplierId: z.string().trim().min(1, "Selecione um fornecedor."),
  purchaseDate: z.string().trim().min(1, "Informe a data da compra."),
  saleAmount: z.coerce.number().positive("Informe o valor pago."),
  totalCost: z.coerce.number().min(0, "Informe o custo total."),
  status: z.nativeEnum(OrderStatus),
  trackingCode: optionalText,
  estimatedDeliveryDate: optionalText,
  deliveredDate: optionalText,
  notes: optionalText,
});
