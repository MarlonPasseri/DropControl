import { Prisma, type ContactChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SupplierFilters = {
  query?: string;
};

export async function getSuppliersByUser(userId: string, filters: SupplierFilters = {}) {
  const where: Prisma.SupplierWhereInput = {
    userId,
    ...(filters.query
      ? {
          OR: [
            { name: { contains: filters.query, mode: "insensitive" } },
            { region: { contains: filters.query, mode: "insensitive" } },
            { contactName: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.supplier.findMany({
    where,
    include: {
      _count: {
        select: {
          invoices: true,
          products: true,
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getSupplierById(userId: string, supplierId: string) {
  return prisma.supplier.findFirst({
    where: {
      id: supplierId,
      userId,
    },
  });
}

export async function getSupplierOptions(userId: string) {
  return prisma.supplier.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getSupplierMetrics(userId: string) {
  const suppliers = await prisma.supplier.findMany({
    where: {
      userId,
    },
    select: {
      avgShippingDays: true,
      reliabilityScore: true,
      issueRate: true,
    },
  });

  const activeCount = suppliers.length;
  const reliabilityValues = suppliers
    .map((supplier) => supplier.reliabilityScore?.toNumber() ?? null)
    .filter((value): value is number => value !== null);
  const issueRateValues = suppliers
    .map((supplier) => supplier.issueRate?.toNumber() ?? null)
    .filter((value): value is number => value !== null);
  const aboveTargetCount = suppliers.filter(
    (supplier) => (supplier.avgShippingDays ?? 0) > 7 || (supplier.issueRate?.toNumber() ?? 0) > 8,
  ).length;

  const reliabilityAverage =
    reliabilityValues.length > 0
      ? reliabilityValues.reduce((sum, value) => sum + value, 0) / reliabilityValues.length
      : 0;
  const issueAverage =
    issueRateValues.length > 0
      ? issueRateValues.reduce((sum, value) => sum + value, 0) / issueRateValues.length
      : 0;

  return {
    activeCount,
    reliabilityAverage,
    issueAverage,
    aboveTargetCount,
  };
}

export async function createSupplier(input: {
  userId: string;
  name: string;
  contactName?: string;
  contactChannel?: ContactChannel;
  region?: string;
  avgShippingDays?: number;
  reliabilityScore?: number;
  issueRate?: number;
  notes?: string;
}) {
  return prisma.supplier.create({
    data: input,
  });
}

export async function updateSupplier(
  supplierId: string,
  input: {
    name: string;
    contactName?: string;
    contactChannel?: ContactChannel;
    region?: string;
    avgShippingDays?: number;
    reliabilityScore?: number;
    issueRate?: number;
    notes?: string;
  },
) {
  return prisma.supplier.update({
    where: {
      id: supplierId,
    },
    data: input,
  });
}

export async function deleteSupplier(supplierId: string) {
  return prisma.supplier.delete({
    where: {
      id: supplierId,
    },
  });
}

export async function canDeleteSupplier(userId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      userId,
    },
    select: {
      _count: {
        select: {
          invoices: true,
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!supplier) {
    return false;
  }

  return (
    supplier._count.invoices === 0 &&
    supplier._count.products === 0 &&
    supplier._count.orders === 0
  );
}
