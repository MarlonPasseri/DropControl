import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .transform((value) => value || undefined),
  );

const requiredText = (message: string) =>
  z.preprocess((value) => value ?? "", z.string().trim().min(1, message));

const requiredMinText = (length: number, message: string) =>
  z.preprocess((value) => value ?? "", z.string().trim().min(length, message));

const optionalEmail = optionalText.pipe(
  z.string().email("Informe um e-mail valido.").optional(),
);

export const orderSchema = z.object({
  id: optionalText,
  orderNumber: requiredMinText(2, "Informe o numero do pedido."),
  customerName: requiredMinText(2, "Informe o nome do cliente."),
  customerEmail: optionalEmail,
  productId: requiredText("Selecione um produto."),
  supplierId: requiredText("Selecione um fornecedor."),
  purchaseDate: requiredText("Informe a data da compra."),
  saleAmount: z.coerce.number().positive("Informe o valor pago."),
  totalCost: z.coerce.number().min(0, "Informe o custo total."),
  status: z.nativeEnum(OrderStatus),
  trackingCode: optionalText,
  estimatedDeliveryDate: optionalText,
  deliveredDate: optionalText,
  notes: optionalText,
});
