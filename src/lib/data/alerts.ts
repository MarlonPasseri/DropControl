import {
  FinancialEntryType,
  InvoiceStatus,
  OrderStatus,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/formatters";

export type AlertSeverity = "high" | "medium" | "low";
export type AlertCategory = "orders" | "products" | "suppliers" | "tasks" | "finance";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  sortDate: Date;
};

const finalOrderStatuses: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.REFUNDED,
  OrderStatus.CANCELED,
];

function severityRank(severity: AlertSeverity) {
  if (severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

export async function getAlertCenterData(userId: string) {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const soonCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const recentRefundCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    overdueOrders,
    staleOrders,
    riskyProducts,
    riskySuppliers,
    overdueTasks,
    tasksDueSoon,
    recentRefunds,
    openInvoices,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId,
        estimatedDeliveryDate: {
          lt: now,
        },
        status: {
          notIn: finalOrderStatuses,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        estimatedDeliveryDate: true,
        status: true,
        customerName: true,
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        estimatedDeliveryDate: "asc",
      },
      take: 6,
    }),
    prisma.order.findMany({
      where: {
        userId,
        updatedAt: {
          lt: staleCutoff,
        },
        status: {
          notIn: finalOrderStatuses,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        updatedAt: true,
        customerName: true,
        supplier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
      take: 4,
    }),
    prisma.product.findMany({
      where: {
        userId,
        estimatedMargin: {
          lt: 40,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        estimatedMargin: true,
      },
      orderBy: {
        estimatedMargin: "asc",
      },
      take: 5,
    }),
    prisma.supplier.findMany({
      where: {
        userId,
        OR: [
          {
            issueRate: {
              gt: 8,
            },
          },
          {
            avgShippingDays: {
              gt: 7,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        issueRate: true,
        avgShippingDays: true,
      },
      orderBy: [{ issueRate: "desc" }, { avgShippingDays: "desc" }],
      take: 4,
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: {
          not: TaskStatus.COMPLETED,
        },
        dueDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeName: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: {
          not: TaskStatus.COMPLETED,
        },
        dueDate: {
          gte: now,
          lte: soonCutoff,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeName: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 4,
    }),
    prisma.financialEntry.findMany({
      where: {
        userId,
        type: FinancialEntryType.REFUND,
        referenceDate: {
          gte: recentRefundCutoff,
        },
      },
      select: {
        id: true,
        amount: true,
        referenceDate: true,
        description: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
      orderBy: {
        referenceDate: "desc",
      },
      take: 4,
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: {
          in: [InvoiceStatus.PENDING, InvoiceStatus.ISSUED],
        },
        dueDate: {
          not: null,
          lte: soonCutoff,
        },
      },
      select: {
        id: true,
        number: true,
        amount: true,
        dueDate: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 5,
    }),
  ]);

  const alerts: AlertItem[] = [
    ...overdueOrders.map((order) => ({
      id: `order-overdue-${order.id}`,
      severity: "high" as const,
      category: "orders" as const,
      title: `Pedido ${order.orderNumber} com prazo vencido`,
      description: `${order.customerName} ainda nao recebeu ${order.product.name}.`,
      href: `/orders?edit=${order.id}`,
      actionLabel: "Abrir pedido",
      sortDate: order.estimatedDeliveryDate ?? now,
    })),
    ...staleOrders.map((order) => ({
      id: `order-stale-${order.id}`,
      severity: "medium" as const,
      category: "orders" as const,
      title: `Pedido ${order.orderNumber} sem atualizacao`,
      description: `Ultima movimentacao antiga para ${order.customerName}. Fornecedor ${order.supplier.name}.`,
      href: `/orders?edit=${order.id}`,
      actionLabel: "Cobrar andamento",
      sortDate: order.updatedAt,
    })),
    ...riskyProducts.map((product) => ({
      id: `product-margin-${product.id}`,
      severity: product.estimatedMargin.toNumber() < 20 ? ("high" as const) : ("medium" as const),
      category: "products" as const,
      title: `Margem pressionada em ${product.name}`,
      description: `SKU ${product.sku} com margem estimada em ${formatCurrency(
        product.estimatedMargin,
      )}.`,
      href: `/products?edit=${product.id}`,
      actionLabel: "Revisar produto",
      sortDate: now,
    })),
    ...riskySuppliers.map((supplier) => ({
      id: `supplier-risk-${supplier.id}`,
      severity:
        (supplier.issueRate?.toNumber() ?? 0) > 12 || (supplier.avgShippingDays ?? 0) > 10
          ? ("high" as const)
          : ("medium" as const),
      category: "suppliers" as const,
      title: `Fornecedor ${supplier.name} fora do alvo`,
      description: `Problema ${supplier.issueRate?.toNumber().toFixed(1) ?? "0.0"}% e prazo medio ${
        supplier.avgShippingDays ?? 0
      } dias.`,
      href: `/suppliers?edit=${supplier.id}`,
      actionLabel: "Avaliar fornecedor",
      sortDate: now,
    })),
    ...overdueTasks.map((task) => ({
      id: `task-overdue-${task.id}`,
      severity: "high" as const,
      category: "tasks" as const,
      title: `Tarefa vencida: ${task.title}`,
      description: `${task.assigneeName || "Sem responsavel"} precisa agir no fluxo operacional.`,
      href: `/tasks?edit=${task.id}`,
      actionLabel: "Abrir tarefa",
      sortDate: task.dueDate ?? now,
    })),
    ...tasksDueSoon.map((task) => ({
      id: `task-soon-${task.id}`,
      severity: "low" as const,
      category: "tasks" as const,
      title: `Prazo proximo para ${task.title}`,
      description: `${task.assigneeName || "Sem responsavel"} tem entrega prevista para hoje.`,
      href: `/tasks?edit=${task.id}`,
      actionLabel: "Priorizar tarefa",
      sortDate: task.dueDate ?? now,
    })),
    ...recentRefunds.map((refund) => ({
      id: `finance-refund-${refund.id}`,
      severity: refund.amount.toNumber() >= 100 ? ("high" as const) : ("medium" as const),
      category: "finance" as const,
      title: refund.order
        ? `Reembolso no pedido ${refund.order.orderNumber}`
        : "Reembolso financeiro recente",
      description: `${refund.description || "Lancamento de reembolso"} em ${formatCurrency(
        refund.amount,
      )}.`,
      href: refund.order ? `/orders?edit=${refund.order.id}` : "/finance",
      actionLabel: refund.order ? "Abrir pedido" : "Abrir financeiro",
      sortDate: refund.referenceDate,
    })),
    ...openInvoices.map((invoice) => {
      const dueDate = invoice.dueDate ?? now;
      const isOverdue = dueDate < now;

      return {
        id: `finance-invoice-${invoice.id}`,
        severity: isOverdue ? ("high" as const) : ("medium" as const),
        category: "finance" as const,
        title: isOverdue
          ? `NF ${invoice.number} com vencimento estourado`
          : `NF ${invoice.number} vence em breve`,
        description: `${
          invoice.order
            ? `Pedido ${invoice.order.orderNumber}`
            : invoice.supplier
              ? `Fornecedor ${invoice.supplier.name}`
              : "Sem vinculo"
        } em ${formatCurrency(invoice.amount)}.`,
        href: `/invoices?edit=${invoice.id}`,
        actionLabel: "Abrir nota fiscal",
        sortDate: dueDate,
      };
    }),
  ].sort((left, right) => {
    const severityDifference = severityRank(left.severity) - severityRank(right.severity);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return right.sortDate.getTime() - left.sortDate.getTime();
  });

  const summary = {
    total: alerts.length,
    high: alerts.filter((alert) => alert.severity === "high").length,
    medium: alerts.filter((alert) => alert.severity === "medium").length,
    low: alerts.filter((alert) => alert.severity === "low").length,
    orders: alerts.filter((alert) => alert.category === "orders").length,
    products: alerts.filter((alert) => alert.category === "products").length,
    suppliers: alerts.filter((alert) => alert.category === "suppliers").length,
    tasks: alerts.filter((alert) => alert.category === "tasks").length,
    finance: alerts.filter((alert) => alert.category === "finance").length,
  };

  return {
    alerts,
    summary,
  };
}
