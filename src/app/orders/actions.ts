"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, Prisma } from "@prisma/client";
import {
  canDeleteOrder,
  createOrder,
  deleteOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
} from "@/lib/data/orders";
import { getProductById } from "@/lib/data/products";
import { getSupplierById } from "@/lib/data/suppliers";
import { requireUser } from "@/lib/require-user";
import { orderSchema } from "@/lib/validations/orders";

function ordersRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/orders?${query}` : "/orders");
}

function parseDate(value: string | undefined, fieldLabel: string, edit?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    ordersRedirect({
      error: `Informe um valor valido para ${fieldLabel}.`,
      edit,
    });
  }

  return date;
}

export async function saveOrder(formData: FormData) {
  const user = await requireUser();
  const parsed = orderSchema.safeParse({
    id: formData.get("id"),
    orderNumber: formData.get("orderNumber"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    productId: formData.get("productId"),
    supplierId: formData.get("supplierId"),
    purchaseDate: formData.get("purchaseDate"),
    saleAmount: formData.get("saleAmount"),
    totalCost: formData.get("totalCost"),
    status: formData.get("status"),
    trackingCode: formData.get("trackingCode"),
    estimatedDeliveryDate: formData.get("estimatedDeliveryDate"),
    deliveredDate: formData.get("deliveredDate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    ordersRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do pedido.",
      edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
    });
  }

  const data = parsed.data;
  const purchaseDate = parseDate(data.purchaseDate, "data da compra", data.id);
  const estimatedDeliveryDate = parseDate(
    data.estimatedDeliveryDate,
    "prazo estimado",
    data.id,
  );
  const shouldSetDeliveredDate =
    Boolean(data.deliveredDate) || data.status === OrderStatus.DELIVERED;
  const deliveredDate = shouldSetDeliveredDate
    ? parseDate(
        data.deliveredDate || new Date().toISOString(),
        "data de entrega",
        data.id,
      )
    : undefined;

  if (data.totalCost > data.saleAmount) {
    ordersRedirect({
      error: "O custo total nao pode ser maior que o valor pago.",
      edit: data.id,
    });
  }

  const [product, supplier] = await Promise.all([
    getProductById(user.id, data.productId),
    getSupplierById(user.id, data.supplierId),
  ]);

  if (!product) {
    ordersRedirect({ error: "Selecione um produto valido.", edit: data.id });
  }

  if (!supplier) {
    ordersRedirect({ error: "Selecione um fornecedor valido.", edit: data.id });
  }

  try {
    if (data.id) {
      const existingOrder = await getOrderById(user.id, data.id);

      if (!existingOrder) {
        ordersRedirect({ error: "Pedido nao encontrado." });
      }

      await updateOrder(data.id, {
        productId: data.productId,
        supplierId: data.supplierId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        purchaseDate: purchaseDate ?? new Date(),
        saleAmount: data.saleAmount,
        totalCost: data.totalCost,
        status: data.status,
        trackingCode: data.trackingCode,
        estimatedDeliveryDate,
        deliveredDate,
        notes: data.notes,
      });

      revalidatePath("/orders");
      revalidatePath("/dashboard");
      revalidatePath("/finance");
      ordersRedirect({
        success: "Pedido atualizado com sucesso.",
        edit: data.id,
      });
    }

    const order = await createOrder({
      userId: user.id,
      productId: data.productId,
      supplierId: data.supplierId,
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      purchaseDate: purchaseDate ?? new Date(),
      saleAmount: data.saleAmount,
      totalCost: data.totalCost,
      status: data.status,
      trackingCode: data.trackingCode,
      estimatedDeliveryDate,
      deliveredDate,
      notes: data.notes,
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    ordersRedirect({
      success: "Pedido criado com sucesso.",
      edit: order.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      ordersRedirect({
        error: "Ja existe um pedido com esse numero.",
        edit: data.id,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      ordersRedirect({
        error: "Nao foi possivel salvar o pedido.",
        edit: data.id,
      });
    }

    throw error;
  }
}

export async function removeOrder(formData: FormData) {
  const user = await requireUser();
  const orderId = `${formData.get("id") ?? ""}`.trim();

  if (!orderId) {
    ordersRedirect({ error: "Pedido invalido." });
  }

  const existingOrder = await getOrderById(user.id, orderId);

  if (!existingOrder) {
    ordersRedirect({ error: "Pedido nao encontrado." });
  }

  const canDelete = await canDeleteOrder(user.id, orderId);

  if (!canDelete) {
    ordersRedirect({
      error: "Esse pedido possui tarefas, lancamentos financeiros ou notas fiscais vinculadas.",
      edit: orderId,
    });
  }

  await deleteOrder(orderId);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  ordersRedirect({ success: "Pedido removido com sucesso." });
}

export async function changeOrderStatus(formData: FormData) {
  const user = await requireUser();
  const orderId = `${formData.get("id") ?? ""}`.trim();
  const statusValue = `${formData.get("status") ?? ""}`.trim();

  if (!orderId || !statusValue || !Object.values(OrderStatus).includes(statusValue as OrderStatus)) {
    ordersRedirect({ error: "Atualizacao de status invalida." });
  }

  const existingOrder = await getOrderById(user.id, orderId);

  if (!existingOrder) {
    ordersRedirect({ error: "Pedido nao encontrado." });
  }

  const status = statusValue as OrderStatus;
  const deliveredDate =
    status === OrderStatus.DELIVERED && !existingOrder.deliveredDate ? new Date() : undefined;

  await updateOrderStatus(orderId, status, deliveredDate);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  ordersRedirect({
    success: `Status do pedido ${existingOrder.orderNumber} atualizado.`,
    edit: orderId,
  });
}
