import { OrderStatus, Prisma, ProductStatus, TaskStatus } from "@prisma/client";
import { getCurrentMonthFinanceSnapshot } from "@/lib/data/finance";
import { prisma } from "@/lib/prisma";

export type OrderFilters = {
  query?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
};

const pendingStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.WAITING_SUPPLIER_PURCHASE,
  OrderStatus.PURCHASED_FROM_SUPPLIER,
  OrderStatus.SHIPPED,
];

function getOverduePredicate(now = new Date()): Prisma.OrderWhereInput {
  return {
    estimatedDeliveryDate: {
      lt: now,
    },
    status: {
      notIn: [OrderStatus.DELIVERED, OrderStatus.REFUNDED, OrderStatus.CANCELED],
    },
  };
}

export async function getOrdersByUser(userId: string, filters: OrderFilters = {}) {
  const where: Prisma.OrderWhereInput = {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          purchaseDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { orderNumber: { contains: filters.query, mode: "insensitive" } },
            { customerName: { contains: filters.query, mode: "insensitive" } },
            { customerEmail: { contains: filters.query, mode: "insensitive" } },
            { product: { name: { contains: filters.query, mode: "insensitive" } } },
            { supplier: { name: { contains: filters.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return prisma.order.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        purchaseDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function getOrderById(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          supplierId: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getOrderMetrics(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const tomorrow = new Date(startOfDay);
  tomorrow.setDate(startOfDay.getDate() + 1);

  const [pendingCount, delayedCount, problemCount, deliveredTodayCount] =
    await prisma.$transaction([
      prisma.order.count({
        where: {
          userId,
          status: {
            in: pendingStatuses,
          },
        },
      }),
      prisma.order.count({
        where: {
          userId,
          OR: [{ status: OrderStatus.DELAYED }, getOverduePredicate(now)],
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: OrderStatus.ISSUE,
        },
      }),
      prisma.order.count({
        where: {
          userId,
          deliveredDate: {
            gte: startOfDay,
            lt: tomorrow,
          },
        },
      }),
    ]);

  return {
    pendingCount,
    delayedCount,
    problemCount,
    deliveredTodayCount,
  };
}

export async function getOrderOptions(userId: string) {
  return prisma.order.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      orderNumber: true,
    },
    orderBy: {
      purchaseDate: "desc",
    },
  });
}

export async function getCriticalOrders(userId: string, limit = 5) {
  const now = new Date();

  return prisma.order.findMany({
    where: {
      userId,
      OR: [{ status: OrderStatus.DELAYED }, { status: OrderStatus.ISSUE }, getOverduePredicate(now)],
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
      supplier: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        estimatedDeliveryDate: "asc",
      },
      {
        updatedAt: "asc",
      },
    ],
    take: limit,
  });
}

export async function createOrder(input: {
  userId: string;
  productId: string;
  supplierId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  saleAmount: number;
  totalCost: number;
  status: OrderStatus;
  trackingCode?: string;
  purchaseDate: Date;
  estimatedDeliveryDate?: Date;
  deliveredDate?: Date;
  notes?: string;
}) {
  return prisma.order.create({
    data: input,
  });
}

export async function updateOrder(
  orderId: string,
  input: {
    productId: string;
    supplierId: string;
    orderNumber: string;
    customerName: string;
    customerEmail?: string;
    saleAmount: number;
    totalCost: number;
    status: OrderStatus;
    trackingCode?: string;
    purchaseDate: Date;
    estimatedDeliveryDate?: Date;
    deliveredDate?: Date;
    notes?: string;
  },
) {
  return prisma.order.update({
    where: {
      id: orderId,
    },
    data: input,
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  deliveredDate?: Date,
) {
  return prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status,
      ...(deliveredDate ? { deliveredDate } : {}),
    },
  });
}

export async function deleteOrder(orderId: string) {
  return prisma.order.delete({
    where: {
      id: orderId,
    },
  });
}

export async function canDeleteOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    select: {
      _count: {
        select: {
          financialEntries: true,
          tasks: true,
        },
      },
    },
  });

  if (!order) {
    return false;
  }

  return order._count.financialEntries === 0 && order._count.tasks === 0;
}

export async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const tomorrow = new Date(startOfDay);
  tomorrow.setDate(startOfDay.getDate() + 1);

  const sevenDaysAgo = new Date(startOfDay);
  sevenDaysAgo.setDate(startOfDay.getDate() - 6);

  const [todayAggregate, financeSnapshot, problemOrdersCount, pendingOrdersCount, criticalOrders, recentOrders, tasksToday, overdueTasks, lowMarginProducts, riskySuppliers] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          userId,
          purchaseDate: {
            gte: startOfDay,
            lt: tomorrow,
          },
        },
        _sum: {
          saleAmount: true,
          totalCost: true,
        },
      }),
      getCurrentMonthFinanceSnapshot(userId, now),
      prisma.order.count({
        where: {
          userId,
          status: OrderStatus.ISSUE,
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: {
            in: pendingStatuses,
          },
        },
      }),
      prisma.order.findMany({
        where: {
          userId,
          OR: [{ status: OrderStatus.DELAYED }, { status: OrderStatus.ISSUE }, getOverduePredicate(now)],
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          {
            estimatedDeliveryDate: "asc",
          },
          {
            updatedAt: "asc",
          },
        ],
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          userId,
          purchaseDate: {
            gte: sevenDaysAgo,
            lte: now,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              estimatedMargin: true,
              status: true,
              supplier: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: {
            not: TaskStatus.COMPLETED,
          },
          dueDate: {
            lte: tomorrow,
          },
        },
        include: {
          relatedOrder: {
            select: {
              orderNumber: true,
            },
          },
          relatedProduct: {
            select: {
              sku: true,
              name: true,
            },
          },
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
            lt: now,
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 3,
      }),
      prisma.product.findMany({
        where: {
          userId,
          estimatedMargin: {
            lt: 40,
          },
        },
        orderBy: {
          estimatedMargin: "asc",
        },
        take: 3,
      }),
      prisma.supplier.findMany({
        where: {
          userId,
          issueRate: {
            gt: 8,
          },
        },
        orderBy: {
          issueRate: "desc",
        },
        take: 3,
      }),
    ]);

  const salesTrend = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + offset);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dailyRevenue = recentOrders
      .filter((order) => order.purchaseDate >= date && order.purchaseDate < nextDate)
      .reduce((sum, order) => sum + order.saleAmount.toNumber(), 0);

    return {
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date),
      value: dailyRevenue,
    };
  });

  const productMap = new Map<
    string,
    {
      id: string;
      name: string;
      sku: string;
      supplier: string;
      status: ProductStatus;
      estimatedMargin: number;
      orders: number;
      revenue: number;
    }
  >();

  for (const order of recentOrders) {
    const current = productMap.get(order.productId) ?? {
      id: order.productId,
      name: order.product.name,
      sku: order.product.sku,
      supplier: order.product.supplier.name,
      status: order.product.status,
      estimatedMargin: order.product.estimatedMargin.toNumber(),
      orders: 0,
      revenue: 0,
    };

    current.orders += 1;
    current.revenue += order.saleAmount.toNumber();
    productMap.set(order.productId, current);
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, 3);

  const alerts = [
    ...criticalOrders
      .filter((order) => order.updatedAt < new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))
      .map((order) => `Pedido ${order.orderNumber} sem atualizacao ha mais de 3 dias.`),
    ...lowMarginProducts.map(
      (product) =>
        `Produto ${product.name} com margem estimada em ${product.estimatedMargin.toNumber().toFixed(2)}.`,
    ),
    ...riskySuppliers.map(
      (supplier) =>
        `Fornecedor ${supplier.name} com taxa de problema em ${supplier.issueRate?.toNumber().toFixed(1)}%.`,
    ),
    ...overdueTasks.map((task) => `Tarefa "${task.title}" esta vencida.`),
  ].slice(0, 5);

  return {
    metrics: {
      revenueToday: todayAggregate._sum.saleAmount?.toNumber() ?? 0,
      revenueMonth: financeSnapshot.revenue,
      estimatedProfitMonth: financeSnapshot.netProfit,
      problemOrdersCount,
      pendingOrdersCount,
    },
    salesTrend,
    criticalOrders,
    topProducts,
    tasksToday,
    alerts,
  };
}
