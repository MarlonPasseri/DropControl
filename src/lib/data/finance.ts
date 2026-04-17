import { FinancialCategory, FinancialEntryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";

export type FinancialEntryFilters = {
  query?: string;
  type?: FinancialEntryType;
  from?: Date;
  to?: Date;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

const orderFinanceSelect = {
  id: true,
  orderNumber: true,
  customerName: true,
  purchaseDate: true,
  saleAmount: true,
  totalCost: true,
  status: true,
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
  financialEntries: {
    select: {
      id: true,
      type: true,
      category: true,
      amount: true,
      referenceDate: true,
      description: true,
    },
    orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
  },
} satisfies Prisma.OrderSelect;

type OrderFinanceRecord = Prisma.OrderGetPayload<{
  select: typeof orderFinanceSelect;
}>;

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createMonthlyBuckets(monthCount: number, referenceDate = new Date()) {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      revenue: number;
      costs: number;
      refunds: number;
      netProfit: number;
      orderCount: number;
      entryCount: number;
    }
  >();

  const firstMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - (monthCount - 1),
    1,
  );

  for (let index = 0; index < monthCount; index += 1) {
    const monthDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = getMonthKey(monthDate);
    const monthLabel = monthFormatter.format(monthDate).replace(".", "");
    const yearLabel = String(monthDate.getFullYear()).slice(-2);

    buckets.set(key, {
      key,
      label: `${monthLabel}/${yearLabel}`,
      revenue: 0,
      costs: 0,
      refunds: 0,
      netProfit: 0,
      orderCount: 0,
      entryCount: 0,
    });
  }

  return buckets;
}

function addEntryToBucket(
  buckets: Map<
    string,
    {
      key: string;
      label: string;
      revenue: number;
      costs: number;
      refunds: number;
      netProfit: number;
      orderCount: number;
      entryCount: number;
    }
  >,
  date: Date,
  updater: (bucket: {
    key: string;
    label: string;
    revenue: number;
    costs: number;
    refunds: number;
    netProfit: number;
    orderCount: number;
    entryCount: number;
  }) => void,
) {
  const bucket = buckets.get(getMonthKey(date));

  if (bucket) {
    updater(bucket);
  }
}

function buildFinancialEntryWhere(
  userId: string,
  filters: FinancialEntryFilters = {},
): Prisma.FinancialEntryWhereInput {
  return {
    userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.from || filters.to
      ? {
          referenceDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { description: { contains: filters.query, mode: "insensitive" } },
            {
              order: {
                is: {
                  orderNumber: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
            {
              order: {
                is: {
                  customerName: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
            {
              order: {
                is: {
                  product: {
                    name: { contains: filters.query, mode: "insensitive" },
                  },
                },
              },
            },
            {
              order: {
                is: {
                  supplier: {
                    name: { contains: filters.query, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function calculateOrderFinance(order: OrderFinanceRecord) {
  let additionalIncome = 0;
  let additionalExpense = 0;
  let refundAmount = 0;

  for (const entry of order.financialEntries) {
    const amount = toNumber(entry.amount);

    if (entry.type === FinancialEntryType.INCOME) {
      additionalIncome += amount;
      continue;
    }

    if (entry.type === FinancialEntryType.EXPENSE) {
      additionalExpense += amount;
      continue;
    }

    refundAmount += amount;
  }

  const baseRevenue = toNumber(order.saleAmount);
  const baseCost = toNumber(order.totalCost);
  const netProfit =
    baseRevenue - baseCost + additionalIncome - additionalExpense - refundAmount;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    purchaseDate: order.purchaseDate,
    status: order.status,
    productId: order.product.id,
    productName: order.product.name,
    productSku: order.product.sku,
    supplierId: order.supplier.id,
    supplierName: order.supplier.name,
    baseRevenue,
    baseCost,
    additionalIncome,
    additionalExpense,
    refundAmount,
    adjustmentNet: additionalIncome - additionalExpense - refundAmount,
    netProfit,
    marginPercent: baseRevenue > 0 ? (netProfit / baseRevenue) * 100 : 0,
    linkedEntryCount: order.financialEntries.length,
  };
}

export async function getFinancialEntriesByUser(
  userId: string,
  filters: FinancialEntryFilters = {},
) {
  return prisma.financialEntry.findMany({
    where: buildFinancialEntryWhere(userId, filters),
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getFinancialEntryById(userId: string, entryId: string) {
  return prisma.financialEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
  });
}

export async function createFinancialEntry(input: {
  userId: string;
  orderId: string | null;
  type: FinancialEntryType;
  category: FinancialCategory;
  amount: number;
  referenceDate: Date;
  description?: string;
}) {
  return prisma.financialEntry.create({
    data: input,
  });
}

export async function updateFinancialEntry(
  entryId: string,
  input: {
    orderId: string | null;
    type: FinancialEntryType;
    category: FinancialCategory;
    amount: number;
    referenceDate: Date;
    description?: string;
  },
) {
  return prisma.financialEntry.update({
    where: {
      id: entryId,
    },
    data: input,
  });
}

export async function deleteFinancialEntry(entryId: string) {
  return prisma.financialEntry.delete({
    where: {
      id: entryId,
    },
  });
}

export async function getCurrentMonthFinanceSnapshot(
  userId: string,
  referenceDate = new Date(),
) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  const [orderAggregate, entryGroups] = await prisma.$transaction([
    prisma.order.aggregate({
      where: {
        userId,
        purchaseDate: {
          gte: monthStart,
          lt: nextMonth,
        },
      },
      _sum: {
        saleAmount: true,
        totalCost: true,
      },
    }),
    prisma.financialEntry.groupBy({
      by: ["type"],
      orderBy: {
        type: "asc",
      },
      where: {
        userId,
        referenceDate: {
          gte: monthStart,
          lt: nextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const incomeGroup = entryGroups.find((group) => group.type === FinancialEntryType.INCOME);
  const expenseGroup = entryGroups.find((group) => group.type === FinancialEntryType.EXPENSE);
  const refundGroup = entryGroups.find((group) => group.type === FinancialEntryType.REFUND);
  const revenueAdjustments = incomeGroup?._sum?.amount?.toNumber() ?? 0;
  const expenseAdjustments = expenseGroup?._sum?.amount?.toNumber() ?? 0;
  const refunds = refundGroup?._sum?.amount?.toNumber() ?? 0;
  const revenue = (orderAggregate._sum.saleAmount?.toNumber() ?? 0) + revenueAdjustments;
  const costs = (orderAggregate._sum.totalCost?.toNumber() ?? 0) + expenseAdjustments;

  return {
    revenue,
    costs,
    refunds,
    netProfit: revenue - costs - refunds,
  };
}

export async function getFinanceAnalytics(userId: string, monthCount = 6) {
  const [orders, standaloneEntries, refundEntries] = await prisma.$transaction([
    prisma.order.findMany({
      where: {
        userId,
      },
      select: orderFinanceSelect,
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.financialEntry.findMany({
      where: {
        userId,
        orderId: null,
      },
      select: {
        id: true,
        type: true,
        category: true,
        amount: true,
        referenceDate: true,
        description: true,
      },
      orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.financialEntry.findMany({
      where: {
        userId,
        type: FinancialEntryType.REFUND,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
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
        },
      },
      orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const monthlyBuckets = createMonthlyBuckets(monthCount);
  const currentMonthKey = getMonthKey(new Date());
  const orderProfitability = orders.map(calculateOrderFinance);
  const productMap = new Map<
    string,
    {
      id: string;
      label: string;
      sku: string;
      netProfit: number;
      revenue: number;
      refundAmount: number;
      orderCount: number;
    }
  >();
  const supplierMap = new Map<
    string,
    {
      id: string;
      label: string;
      netProfit: number;
      revenue: number;
      refundAmount: number;
      orderCount: number;
    }
  >();

  for (const order of orders) {
    addEntryToBucket(monthlyBuckets, order.purchaseDate, (bucket) => {
      bucket.revenue += toNumber(order.saleAmount);
      bucket.costs += toNumber(order.totalCost);
      bucket.orderCount += 1;
    });
  }

  for (const order of orderProfitability) {
    const currentProduct = productMap.get(order.productId) ?? {
      id: order.productId,
      label: order.productName,
      sku: order.productSku,
      netProfit: 0,
      revenue: 0,
      refundAmount: 0,
      orderCount: 0,
    };
    currentProduct.netProfit += order.netProfit;
    currentProduct.revenue += order.baseRevenue + order.additionalIncome;
    currentProduct.refundAmount += order.refundAmount;
    currentProduct.orderCount += 1;
    productMap.set(order.productId, currentProduct);

    const currentSupplier = supplierMap.get(order.supplierId) ?? {
      id: order.supplierId,
      label: order.supplierName,
      netProfit: 0,
      revenue: 0,
      refundAmount: 0,
      orderCount: 0,
    };
    currentSupplier.netProfit += order.netProfit;
    currentSupplier.revenue += order.baseRevenue + order.additionalIncome;
    currentSupplier.refundAmount += order.refundAmount;
    currentSupplier.orderCount += 1;
    supplierMap.set(order.supplierId, currentSupplier);
  }

  for (const order of orders) {
    for (const entry of order.financialEntries) {
      addEntryToBucket(monthlyBuckets, entry.referenceDate, (bucket) => {
        const amount = toNumber(entry.amount);

        if (entry.type === FinancialEntryType.INCOME) {
          bucket.revenue += amount;
        } else if (entry.type === FinancialEntryType.EXPENSE) {
          bucket.costs += amount;
        } else {
          bucket.refunds += amount;
        }

        bucket.entryCount += 1;
      });
    }
  }

  for (const entry of standaloneEntries) {
    addEntryToBucket(monthlyBuckets, entry.referenceDate, (bucket) => {
      const amount = toNumber(entry.amount);

      if (entry.type === FinancialEntryType.INCOME) {
        bucket.revenue += amount;
      } else if (entry.type === FinancialEntryType.EXPENSE) {
        bucket.costs += amount;
      } else {
        bucket.refunds += amount;
      }

      bucket.entryCount += 1;
    });
  }

  const monthlySummary = Array.from(monthlyBuckets.values()).map((bucket) => ({
    ...bucket,
    netProfit: bucket.revenue - bucket.costs - bucket.refunds,
  }));

  const maxProductProfit = Math.max(
    ...Array.from(productMap.values()).map((item) => Math.max(item.netProfit, 0)),
    1,
  );
  const maxSupplierProfit = Math.max(
    ...Array.from(supplierMap.values()).map((item) => Math.max(item.netProfit, 0)),
    1,
  );
  const currentMonth =
    monthlySummary.find((month) => month.key === currentMonthKey) ?? {
      key: currentMonthKey,
      label: monthFormatter.format(new Date()),
      revenue: 0,
      costs: 0,
      refunds: 0,
      netProfit: 0,
      orderCount: 0,
      entryCount: 0,
    };

  return {
    currentMonth,
    monthlySummary,
    orderProfitability: orderProfitability.slice(0, 8),
    profitByProduct: Array.from(productMap.values())
      .sort((left, right) => right.netProfit - left.netProfit)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        share: item.netProfit > 0 ? Math.max((item.netProfit / maxProductProfit) * 100, 6) : 0,
      })),
    profitBySupplier: Array.from(supplierMap.values())
      .sort((left, right) => right.netProfit - left.netProfit)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        share: item.netProfit > 0 ? Math.max((item.netProfit / maxSupplierProfit) * 100, 6) : 0,
      })),
    refunds: refundEntries,
  };
}
