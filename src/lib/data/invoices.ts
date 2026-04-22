import { InvoiceStatus, InvoiceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";

export type InvoiceFilters = {
  query?: string;
  type?: InvoiceType;
  status?: InvoiceStatus;
  from?: Date;
  to?: Date;
};

export type InvoiceArchiveMonth = {
  year: number;
  month: number;
  storedCount: number;
  reportableCount: number;
  canceledCount: number;
  totalAmount: number;
  totalTaxAmount: number;
  purchaseAmount: number;
  saleAmount: number;
};

export type InvoiceArchiveYear = {
  year: number;
  storedCount: number;
  reportableCount: number;
  canceledCount: number;
  totalAmount: number;
  totalTaxAmount: number;
  purchaseAmount: number;
  saleAmount: number;
  months: InvoiceArchiveMonth[];
};

export type InvoiceArchiveSnapshot = {
  years: InvoiceArchiveYear[];
};

const openStatuses: InvoiceStatus[] = [InvoiceStatus.PENDING, InvoiceStatus.ISSUED];

const invoiceListSelect = {
  id: true,
  userId: true,
  orderId: true,
  supplierId: true,
  number: true,
  series: true,
  accessKey: true,
  type: true,
  status: true,
  issueDate: true,
  dueDate: true,
  amount: true,
  taxAmount: true,
  notes: true,
  xmlFileName: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
    },
  },
  supplier: {
    select: {
      id: true,
      name: true,
    },
  },
  invoiceProducts: {
    select: {
      id: true,
      itemNumber: true,
      quantity: true,
      unitPrice: true,
      lineAmount: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
    orderBy: {
      itemNumber: "asc",
    },
  },
} satisfies Prisma.InvoiceSelect;

const invoiceDetailSelect = {
  id: true,
  userId: true,
  orderId: true,
  supplierId: true,
  number: true,
  series: true,
  accessKey: true,
  type: true,
  status: true,
  issueDate: true,
  dueDate: true,
  amount: true,
  taxAmount: true,
  notes: true,
  xmlFileName: true,
  xmlContent: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      supplierId: true,
    },
  },
  supplier: {
    select: {
      id: true,
      name: true,
    },
  },
  invoiceProducts: {
    select: {
      id: true,
      itemNumber: true,
      quantity: true,
      unitPrice: true,
      lineAmount: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
        },
      },
    },
    orderBy: {
      itemNumber: "asc",
    },
  },
} satisfies Prisma.InvoiceSelect;

function buildInvoiceWhere(
  userId: string,
  filters: InvoiceFilters = {},
): Prisma.InvoiceWhereInput {
  return {
    userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          issueDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { number: { contains: filters.query, mode: "insensitive" } },
            { series: { contains: filters.query, mode: "insensitive" } },
            { accessKey: { contains: filters.query, mode: "insensitive" } },
            {
              order: {
                is: {
                  orderNumber: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
            {
              supplier: {
                is: {
                  name: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function getInvoicesByUser(
  userId: string,
  filters: InvoiceFilters = {},
) {
  return prisma.invoice.findMany({
    where: buildInvoiceWhere(userId, filters),
    select: invoiceListSelect,
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getInvoiceById(userId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId,
    },
    select: invoiceDetailSelect,
  });
}

export async function getInvoiceByAccessKey(userId: string, accessKey: string) {
  return prisma.invoice.findFirst({
    where: {
      userId,
      accessKey,
    },
    select: {
      id: true,
      number: true,
      series: true,
    },
  });
}

export async function getInvoiceMetrics(userId: string, referenceDate = new Date()) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  const openCount = await prisma.invoice.count({
    where: {
      userId,
      status: {
        in: openStatuses,
      },
    },
  });
  const overdueCount = await prisma.invoice.count({
    where: {
      userId,
      status: {
        in: openStatuses,
      },
      dueDate: {
        lt: referenceDate,
      },
    },
  });
  const issuedThisMonthCount = await prisma.invoice.count({
    where: {
      userId,
      issueDate: {
        gte: monthStart,
        lt: nextMonth,
      },
      status: {
        not: InvoiceStatus.CANCELED,
      },
    },
  });
  const openAggregate = await prisma.invoice.aggregate({
    where: {
      userId,
      status: {
        in: openStatuses,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return {
    openCount,
    overdueCount,
    issuedThisMonthCount,
    openAmount: openAggregate._sum.amount?.toNumber() ?? 0,
  };
}

export async function getInvoiceFinanceSnapshot(userId: string, referenceDate = new Date()) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  const openWhere: Prisma.InvoiceWhereInput = {
    userId,
    status: {
      in: openStatuses,
    },
  };

  const openAggregate = await prisma.invoice.aggregate({
    where: openWhere,
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });
  const monthTaxAggregate = await prisma.invoice.aggregate({
    where: {
      userId,
      issueDate: {
        gte: monthStart,
        lt: nextMonth,
      },
      status: {
        not: InvoiceStatus.CANCELED,
      },
    },
    _sum: {
      taxAmount: true,
    },
  });
  const overdueCount = await prisma.invoice.count({
    where: {
      ...openWhere,
      dueDate: {
        lt: referenceDate,
      },
    },
  });
  const recentInvoices = await prisma.invoice.findMany({
    where: openWhere,
    select: {
      id: true,
      number: true,
      series: true,
      type: true,
      status: true,
      issueDate: true,
      dueDate: true,
      amount: true,
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
    orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }],
    take: 6,
  });

  return {
    openCount: openAggregate._count._all,
    overdueCount,
    totalOpenAmount: openAggregate._sum.amount?.toNumber() ?? 0,
    monthTaxAmount: monthTaxAggregate._sum.taxAmount?.toNumber() ?? 0,
    recentInvoices,
  };
}

export async function createInvoice(input: {
  userId: string;
  orderId: string | null;
  supplierId: string | null;
  number: string;
  series?: string;
  accessKey?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate?: Date | null;
  amount: number;
  taxAmount?: number | null;
  xmlFileName?: string;
  xmlContent?: string;
  notes?: string;
}) {
  return prisma.invoice.create({
    data: input,
  });
}

export async function updateInvoice(
  invoiceId: string,
  input: {
    orderId: string | null;
    supplierId: string | null;
    number: string;
    series?: string;
    accessKey?: string;
    type: InvoiceType;
    status: InvoiceStatus;
    issueDate: Date;
    dueDate?: Date | null;
    amount: number;
    taxAmount?: number | null;
    notes?: string;
  },
) {
  return prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: input,
  });
}

export async function deleteInvoice(invoiceId: string) {
  return prisma.invoice.delete({
    where: {
      id: invoiceId,
    },
  });
}

export async function getInvoiceOpenAmountBySupplier(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: {
        in: openStatuses,
      },
      supplierId: {
        not: null,
      },
    },
    select: {
      supplierId: true,
      amount: true,
    },
  });

  return invoices.reduce<Record<string, number>>((accumulator, invoice) => {
    if (!invoice.supplierId) {
      return accumulator;
    }

    accumulator[invoice.supplierId] =
      (accumulator[invoice.supplierId] ?? 0) + toNumber(invoice.amount);
    return accumulator;
  }, {});
}

function createEmptyArchiveMonth(year: number, month: number): InvoiceArchiveMonth {
  return {
    year,
    month,
    storedCount: 0,
    reportableCount: 0,
    canceledCount: 0,
    totalAmount: 0,
    totalTaxAmount: 0,
    purchaseAmount: 0,
    saleAmount: 0,
  };
}

function createEmptyArchiveYear(year: number): InvoiceArchiveYear {
  return {
    year,
    storedCount: 0,
    reportableCount: 0,
    canceledCount: 0,
    totalAmount: 0,
    totalTaxAmount: 0,
    purchaseAmount: 0,
    saleAmount: 0,
    months: [],
  };
}

export async function getInvoiceArchiveSnapshot(userId: string): Promise<InvoiceArchiveSnapshot> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
    },
    select: {
      issueDate: true,
      amount: true,
      taxAmount: true,
      type: true,
      status: true,
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });

  const yearMap = new Map<number, InvoiceArchiveYear>();
  const monthMap = new Map<string, InvoiceArchiveMonth>();

  for (const invoice of invoices) {
    const year = invoice.issueDate.getFullYear();
    const month = invoice.issueDate.getMonth() + 1;
    const monthKey = `${year}-${`${month}`.padStart(2, "0")}`;
    const isCanceled = invoice.status === InvoiceStatus.CANCELED;
    const amount = toNumber(invoice.amount);
    const taxAmount = toNumber(invoice.taxAmount ?? 0);

    let yearEntry = yearMap.get(year);

    if (!yearEntry) {
      yearEntry = createEmptyArchiveYear(year);
      yearMap.set(year, yearEntry);
    }

    let monthEntry = monthMap.get(monthKey);

    if (!monthEntry) {
      monthEntry = createEmptyArchiveMonth(year, month);
      monthMap.set(monthKey, monthEntry);
      yearEntry.months.push(monthEntry);
    }

    yearEntry.storedCount += 1;
    monthEntry.storedCount += 1;

    if (isCanceled) {
      yearEntry.canceledCount += 1;
      monthEntry.canceledCount += 1;
      continue;
    }

    yearEntry.reportableCount += 1;
    yearEntry.totalAmount += amount;
    yearEntry.totalTaxAmount += taxAmount;
    if (invoice.type === InvoiceType.PURCHASE) {
      yearEntry.purchaseAmount += amount;
    } else {
      yearEntry.saleAmount += amount;
    }

    monthEntry.reportableCount += 1;
    monthEntry.totalAmount += amount;
    monthEntry.totalTaxAmount += taxAmount;
    if (invoice.type === InvoiceType.PURCHASE) {
      monthEntry.purchaseAmount += amount;
    } else {
      monthEntry.saleAmount += amount;
    }
  }

  const years = Array.from(yearMap.values())
    .map((yearEntry) => ({
      ...yearEntry,
      months: yearEntry.months.sort((left, right) => right.month - left.month),
    }))
    .sort((left, right) => right.year - left.year);

  return { years };
}
