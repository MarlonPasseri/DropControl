import { ProductStatus } from "@prisma/client";
import { createProduct } from "@/lib/data/products";
import type { ParsedInvoiceXml, ParsedInvoiceXmlItem } from "@/lib/invoices/xml";
import { prisma } from "@/lib/prisma";

type ProductMatch = {
  id: string;
  name: string;
  sku: string;
};

const DEFAULT_XML_SUPPLIER_NAME = "Fornecedor nao informado no XML";
const DEFAULT_XML_SUPPLIER_NOTES =
  "Criado automaticamente para armazenar produtos importados de XML sem fornecedor vinculado.";

export type InvoiceProductImportSummary = {
  linkedItems: number;
  createdProducts: number;
  skippedItems: number;
};

function normalizeSku(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").toUpperCase();
}

function slugifySku(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildBaseSku(item: ParsedInvoiceXmlItem) {
  const explicitCandidate = item.skuCandidates.map(normalizeSku).find(Boolean);

  if (explicitCandidate) {
    return explicitCandidate;
  }

  const slug = slugifySku(item.name).slice(0, 32);
  return slug ? `XML-${slug}` : `XML-ITEM-${item.itemNumber}`;
}

function buildProductNotes(parsedInvoice: ParsedInvoiceXml, item: ParsedInvoiceXmlItem) {
  const notes = [
    "Criado automaticamente via XML da nota fiscal",
    `NF ${parsedInvoice.number}${parsedInvoice.series ? ` / ${parsedInvoice.series}` : ""}`,
    "Revise custos, frete e preco de venda",
  ];

  if (item.productCode) {
    notes.push(`Codigo XML: ${item.productCode}`);
  }

  if (item.ean) {
    notes.push(`EAN: ${item.ean}`);
  }

  if (item.cfop) {
    notes.push(`CFOP: ${item.cfop}`);
  }

  if (item.ncm) {
    notes.push(`NCM: ${item.ncm}`);
  }

  return notes.join(" | ");
}

async function findProductBySku(userId: string, sku: string) {
  return prisma.product.findFirst({
    where: {
      userId,
      sku: {
        equals: sku,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
  });
}

async function findProductByName(userId: string, name: string, supplierId?: string | null) {
  if (supplierId) {
    const supplierMatch = await prisma.product.findFirst({
      where: {
        userId,
        supplierId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });

    if (supplierMatch) {
      return supplierMatch;
    }
  }

  return prisma.product.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
  });
}

async function findMatchingProduct(
  userId: string,
  item: ParsedInvoiceXmlItem,
  supplierId?: string | null,
) {
  for (const candidate of item.skuCandidates.map(normalizeSku).filter(Boolean) as string[]) {
    const product = await findProductBySku(userId, candidate);

    if (product) {
      return product;
    }
  }

  return findProductByName(userId, item.name, supplierId);
}

async function resolveProductSupplierId(userId: string, supplierId?: string | null) {
  if (supplierId) {
    return supplierId;
  }

  const existingSupplier = await prisma.supplier.findFirst({
    where: {
      userId,
      name: DEFAULT_XML_SUPPLIER_NAME,
    },
    select: {
      id: true,
    },
  });

  if (existingSupplier) {
    return existingSupplier.id;
  }

  const createdSupplier = await prisma.supplier.create({
    data: {
      userId,
      name: DEFAULT_XML_SUPPLIER_NAME,
      notes: DEFAULT_XML_SUPPLIER_NOTES,
    },
    select: {
      id: true,
    },
  });

  return createdSupplier.id;
}

async function ensureUniqueSku(userId: string, baseSku: string) {
  const normalizedBase = normalizeSku(baseSku) ?? `XML-${Date.now()}`;
  let candidate = normalizedBase.slice(0, 48);
  let suffix = 2;

  while (await findProductBySku(userId, candidate)) {
    const suffixLabel = `-${suffix}`;
    candidate = `${normalizedBase.slice(0, Math.max(1, 48 - suffixLabel.length))}${suffixLabel}`;
    suffix += 1;
  }

  return candidate;
}

async function createProductFromInvoiceItem(input: {
  userId: string;
  supplierId: string;
  parsedInvoice: ParsedInvoiceXml;
  item: ParsedInvoiceXmlItem;
}) {
  const shippingCost =
    input.item.quantity > 0
      ? Number((input.item.shippingAmount / input.item.quantity).toFixed(2))
      : 0;
  const costPrice = Number(Math.max(input.item.unitPrice, 0.01).toFixed(2));
  const salePrice = Number((costPrice + shippingCost).toFixed(2));
  const sku = await ensureUniqueSku(input.userId, buildBaseSku(input.item));

  return createProduct({
    userId: input.userId,
    supplierId: input.supplierId,
    name: input.item.name,
    sku,
    costPrice,
    shippingCost,
    salePrice,
    estimatedMargin: 0,
    status: ProductStatus.TESTING,
    notes: buildProductNotes(input.parsedInvoice, input.item),
  });
}

export async function syncImportedInvoiceProducts(input: {
  userId: string;
  invoiceId: string;
  parsedInvoice: ParsedInvoiceXml;
  productSupplierId?: string | null;
  fallbackProductId?: string | null;
}) {
  const summary: InvoiceProductImportSummary = {
    linkedItems: 0,
    createdProducts: 0,
    skippedItems: 0,
  };

  if (input.parsedInvoice.items.length === 0) {
    return summary;
  }

  const resolvedProductSupplierId = await resolveProductSupplierId(
    input.userId,
    input.productSupplierId,
  );

  const fallbackProduct =
    input.fallbackProductId && input.parsedInvoice.items.length === 1
      ? await prisma.product.findFirst({
          where: {
            id: input.fallbackProductId,
            userId: input.userId,
          },
          select: {
            id: true,
            name: true,
            sku: true,
          },
        })
      : null;

  for (const item of input.parsedInvoice.items) {
    let product: ProductMatch | null = await findMatchingProduct(
      input.userId,
      item,
      resolvedProductSupplierId,
    );

    if (!product && fallbackProduct) {
      product = fallbackProduct;
    }

    if (!product) {
      product = await createProductFromInvoiceItem({
        userId: input.userId,
        supplierId: resolvedProductSupplierId,
        parsedInvoice: input.parsedInvoice,
        item,
      });
      summary.createdProducts += 1;
    }

    if (!product) {
      summary.skippedItems += 1;
      continue;
    }

    await prisma.invoiceProduct.create({
      data: {
        invoiceId: input.invoiceId,
        productId: product.id,
        itemNumber: item.itemNumber,
        xmlProductCode: item.productCode,
        xmlEan: item.ean,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
      },
    });

    summary.linkedItems += 1;
  }

  return summary;
}
