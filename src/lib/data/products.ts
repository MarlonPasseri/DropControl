import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductFilters = {
  query?: string;
  status?: ProductStatus;
};

export async function getProductsByUser(userId: string, filters: ProductFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query
      ? {
          OR: [
            { name: { contains: filters.query, mode: "insensitive" } },
            { sku: { contains: filters.query, mode: "insensitive" } },
            { category: { contains: filters.query, mode: "insensitive" } },
            { supplier: { name: { contains: filters.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return prisma.product.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          orders: true,
          invoiceItems: true,
          tasks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(userId: string, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      userId,
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getProductMetrics(userId: string) {
  const products = await prisma.product.findMany({
    where: {
      userId,
    },
    select: {
      salePrice: true,
      estimatedMargin: true,
      status: true,
    },
  });

  const activeCount = products.filter((product) => product.status === "ACTIVE").length;
  const winnerCount = products.filter((product) => product.status === "WINNER").length;
  const lowMarginCount = products.filter(
    (product) => product.estimatedMargin.toNumber() < 40,
  ).length;
  const averageSalePrice =
    products.length > 0
      ? products.reduce((sum, product) => sum + product.salePrice.toNumber(), 0) /
        products.length
      : 0;

  return {
    activeCount,
    winnerCount,
    lowMarginCount,
    averageSalePrice,
  };
}

export async function createProduct(input: {
  userId: string;
  supplierId: string;
  name: string;
  sku: string;
  category?: string;
  storeLink?: string;
  supplierLink?: string;
  costPrice: number;
  shippingCost: number;
  salePrice: number;
  estimatedMargin: number;
  status: ProductStatus;
  notes?: string;
}) {
  return prisma.product.create({
    data: input,
  });
}

export async function updateProduct(
  productId: string,
  input: {
    supplierId: string;
    name: string;
    sku: string;
    category?: string;
    storeLink?: string;
    supplierLink?: string;
    costPrice: number;
    shippingCost: number;
    salePrice: number;
    estimatedMargin: number;
    status: ProductStatus;
    notes?: string;
  },
) {
  return prisma.product.update({
    where: {
      id: productId,
    },
    data: input,
  });
}

export async function deleteProduct(productId: string) {
  return prisma.product.delete({
    where: {
      id: productId,
    },
  });
}

export async function canDeleteProduct(userId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      userId,
    },
    select: {
      _count: {
        select: {
          orders: true,
          invoiceItems: true,
        },
      },
    },
  });

  if (!product) {
    return false;
  }

  return product._count.orders === 0 && product._count.invoiceItems === 0;
}
