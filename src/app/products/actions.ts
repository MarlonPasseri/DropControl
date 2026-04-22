"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  canDeleteProduct,
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/lib/data/products";
import { getSupplierById } from "@/lib/data/suppliers";
import { requireUser } from "@/lib/require-user";
import { recordAuditLog } from "@/lib/security/audit";
import { productSchema } from "@/lib/validations/products";

function productRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/products?${query}` : "/products");
}

export async function saveProduct(formData: FormData) {
  const user = await requireUser();
  const parsed = productSchema.safeParse({
    id: formData.get("id"),
    supplierId: formData.get("supplierId"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    storeLink: formData.get("storeLink"),
    supplierLink: formData.get("supplierLink"),
    costPrice: formData.get("costPrice"),
    shippingCost: formData.get("shippingCost"),
    salePrice: formData.get("salePrice"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    productRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do produto.",
      edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
    });
  }

  const data = parsed.data;
  const estimatedMargin = data.salePrice - data.costPrice - data.shippingCost;

  if (estimatedMargin < 0) {
    productRedirect({
      error: "A margem estimada nao pode ficar negativa.",
      edit: data.id,
    });
  }

  const supplier = await getSupplierById(user.id, data.supplierId);

  if (!supplier) {
    productRedirect({ error: "Selecione um fornecedor valido.", edit: data.id });
  }

  try {
    if (data.id) {
      const existingProduct = await getProductById(user.id, data.id);

      if (!existingProduct) {
        productRedirect({ error: "Produto nao encontrado." });
      }

      await updateProduct(data.id, {
        supplierId: data.supplierId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        storeLink: data.storeLink,
        supplierLink: data.supplierLink,
        costPrice: data.costPrice,
        shippingCost: data.shippingCost,
        salePrice: data.salePrice,
        estimatedMargin,
        status: data.status,
        notes: data.notes,
      });
      await recordAuditLog({
        actor: user,
        action: "UPDATE",
        resource: "product",
        resourceId: data.id,
        summary: `Produto ${data.sku} atualizado.`,
        metadata: {
          sku: data.sku,
          status: data.status,
          supplierId: data.supplierId,
        },
      });

      revalidatePath("/products");
      productRedirect({
        success: "Produto atualizado com sucesso.",
        edit: data.id,
      });
    }

    const product = await createProduct({
      userId: user.id,
      supplierId: data.supplierId,
      name: data.name,
      sku: data.sku,
      category: data.category,
      storeLink: data.storeLink,
      supplierLink: data.supplierLink,
      costPrice: data.costPrice,
      shippingCost: data.shippingCost,
      salePrice: data.salePrice,
      estimatedMargin,
      status: data.status,
      notes: data.notes,
    });
    await recordAuditLog({
      actor: user,
      action: "CREATE",
      resource: "product",
      resourceId: product.id,
      summary: `Produto ${product.sku} criado.`,
      metadata: {
        sku: product.sku,
        status: product.status,
        supplierId: product.supplierId,
      },
    });

    revalidatePath("/products");
    productRedirect({
      success: "Produto criado com sucesso.",
      edit: product.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      productRedirect({
        error: "Ja existe um produto com esse SKU.",
        edit: data.id,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      productRedirect({ error: "Nao foi possivel salvar o produto.", edit: data.id });
    }

    throw error;
  }
}

export async function removeProduct(formData: FormData) {
  const user = await requireUser();
  const productId = `${formData.get("id") ?? ""}`.trim();

  if (!productId) {
    productRedirect({ error: "Produto invalido." });
  }

  const existingProduct = await getProductById(user.id, productId);

  if (!existingProduct) {
    productRedirect({ error: "Produto nao encontrado." });
  }

  const canDelete = await canDeleteProduct(user.id, productId);

  if (!canDelete) {
    productRedirect({
      error: "Esse produto nao pode ser removido porque ja possui pedidos ou notas fiscais.",
      edit: productId,
    });
  }

  await deleteProduct(productId);
  await recordAuditLog({
    actor: user,
    action: "DELETE",
    resource: "product",
    resourceId: productId,
    summary: `Produto ${existingProduct.sku} removido.`,
    metadata: {
      sku: existingProduct.sku,
      status: existingProduct.status,
    },
  });
  revalidatePath("/products");
  productRedirect({ success: "Produto removido com sucesso." });
}
