import {
  ContactChannel,
  FinancialCategory,
  FinancialEntryType,
  OrderStatus,
  ProductStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

export const productStatusOptions = [
  { value: ProductStatus.TESTING, label: "Testando" },
  { value: ProductStatus.ACTIVE, label: "Ativo" },
  { value: ProductStatus.WINNER, label: "Vencedor" },
  { value: ProductStatus.PAUSED, label: "Pausado" },
  { value: ProductStatus.CLOSED, label: "Encerrado" },
] as const;

export const contactChannelOptions = [
  { value: ContactChannel.WHATSAPP, label: "WhatsApp" },
  { value: ContactChannel.WECHAT, label: "WeChat" },
  { value: ContactChannel.EMAIL, label: "E-mail" },
  { value: ContactChannel.TELEGRAM, label: "Telegram" },
  { value: ContactChannel.OTHER, label: "Outro" },
] as const;

export const taskPriorityOptions = [
  { value: TaskPriority.HIGH, label: "Alta" },
  { value: TaskPriority.MEDIUM, label: "Media" },
  { value: TaskPriority.LOW, label: "Baixa" },
] as const;

export const taskStatusOptions = [
  { value: TaskStatus.PENDING, label: "Pendente" },
  { value: TaskStatus.IN_PROGRESS, label: "Em andamento" },
  { value: TaskStatus.COMPLETED, label: "Concluida" },
] as const;

export const orderStatusOptions = [
  { value: OrderStatus.PAID, label: "Pago" },
  {
    value: OrderStatus.WAITING_SUPPLIER_PURCHASE,
    label: "Aguardando compra",
  },
  { value: OrderStatus.PURCHASED_FROM_SUPPLIER, label: "Comprado" },
  { value: OrderStatus.SHIPPED, label: "Enviado" },
  { value: OrderStatus.DELIVERED, label: "Entregue" },
  { value: OrderStatus.DELAYED, label: "Atraso" },
  { value: OrderStatus.ISSUE, label: "Problema" },
  { value: OrderStatus.REFUNDED, label: "Reembolsado" },
  { value: OrderStatus.CANCELED, label: "Cancelado" },
] as const;

export const financialEntryTypeOptions = [
  { value: FinancialEntryType.INCOME, label: "Receita" },
  { value: FinancialEntryType.EXPENSE, label: "Despesa" },
  { value: FinancialEntryType.REFUND, label: "Reembolso" },
] as const;

export const financialCategoryOptions = [
  { value: FinancialCategory.ORDER_REVENUE, label: "Receita de pedido" },
  { value: FinancialCategory.PRODUCT_COST, label: "Custo do produto" },
  { value: FinancialCategory.SHIPPING_COST, label: "Frete" },
  { value: FinancialCategory.PLATFORM_FEE, label: "Taxa de plataforma" },
  { value: FinancialCategory.AD_SPEND, label: "Anuncio" },
  { value: FinancialCategory.REFUND, label: "Reembolso" },
  { value: FinancialCategory.OPERATING_EXPENSE, label: "Despesa operacional" },
  { value: FinancialCategory.OTHER, label: "Outro" },
] as const;

export function getProductStatusLabel(status: ProductStatus) {
  return productStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getContactChannelLabel(channel: ContactChannel | null) {
  if (!channel) {
    return "-";
  }

  return contactChannelOptions.find((option) => option.value === channel)?.label ?? channel;
}

export function getTaskPriorityLabel(priority: TaskPriority) {
  return taskPriorityOptions.find((option) => option.value === priority)?.label ?? priority;
}

export function getTaskStatusLabel(status: TaskStatus) {
  return taskStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getOrderStatusLabel(status: OrderStatus) {
  return orderStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getFinancialEntryTypeLabel(type: FinancialEntryType) {
  return financialEntryTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function getFinancialCategoryLabel(category: FinancialCategory) {
  return (
    financialCategoryOptions.find((option) => option.value === category)?.label ?? category
  );
}
