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

const openStatuses: InvoiceStatus[] = [InvoiceStatus.PENDING, InvoiceStatus.ISSUED];

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
    include: {
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
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getInvoiceById(userId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId,
    },
    include: {
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
    },
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

  const [openCount, overdueCount, issuedThisMonthCount, openAggregate] =
    await prisma.$transaction([
      prisma.invoice.count({
        where: {
          userId,
          status: {
            in: openStatuses,
          },
        },
      }),
      prisma.invoice.count({
        where: {
          userId,
          status: {
            in: openStatuses,
          },
          dueDate: {
            lt: referenceDate,
          },
        },
      }),
      prisma.invoice.count({
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
      }),
      prisma.invoice.aggregate({
        where: {
          userId,
          status: {
            in: openStatuses,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

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

  const [openAggregate, monthTaxAggregate, overdueCount, recentInvoices] =
    await prisma.$transaction([
      prisma.invoice.aggregate({
        where: openWhere,
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.invoice.aggregate({
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
      }),
      prisma.invoice.count({
        where: {
          ...openWhere,
          dueDate: {
            lt: referenceDate,
          },
        },
      }),
      prisma.invoice.findMany({
        where: openWhere,
        include: {
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
      }),
    ]);

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
