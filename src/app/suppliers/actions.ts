"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  canDeleteSupplier,
  createSupplier,
  deleteSupplier,
  getSupplierById,
  updateSupplier,
} from "@/lib/data/suppliers";
import { requireUser } from "@/lib/require-user";
import { recordAuditLog } from "@/lib/security/audit";
import { supplierSchema } from "@/lib/validations/suppliers";

function supplierRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/suppliers?${query}` : "/suppliers");
}

export async function saveSupplier(formData: FormData) {
  const user = await requireUser();
  const parsed = supplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactChannel: formData.get("contactChannel") || undefined,
    region: formData.get("region"),
    avgShippingDays: formData.get("avgShippingDays"),
    reliabilityScore: formData.get("reliabilityScore"),
    issueRate: formData.get("issueRate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    supplierRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do fornecedor.",
      edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
    });
  }

  const data = parsed.data;

  try {
    if (data.id) {
      const existingSupplier = await getSupplierById(user.id, data.id);

      if (!existingSupplier) {
        supplierRedirect({ error: "Fornecedor nao encontrado." });
      }

      await updateSupplier(data.id, {
        name: data.name,
        contactName: data.contactName,
        contactChannel: data.contactChannel,
        region: data.region,
        avgShippingDays: data.avgShippingDays,
        reliabilityScore: data.reliabilityScore,
        issueRate: data.issueRate,
        notes: data.notes,
      });
      await recordAuditLog({
        actor: user,
        action: "UPDATE",
        resource: "supplier",
        resourceId: data.id,
        summary: `Fornecedor ${data.name} atualizado.`,
        metadata: {
          name: data.name,
          contactChannel: data.contactChannel ?? null,
        },
      });

      revalidatePath("/suppliers");
      supplierRedirect({
        success: "Fornecedor atualizado com sucesso.",
        edit: data.id,
      });
    }

    const supplier = await createSupplier({
      userId: user.id,
      name: data.name,
      contactName: data.contactName,
      contactChannel: data.contactChannel,
      region: data.region,
      avgShippingDays: data.avgShippingDays,
      reliabilityScore: data.reliabilityScore,
      issueRate: data.issueRate,
      notes: data.notes,
    });
    await recordAuditLog({
      actor: user,
      action: "CREATE",
      resource: "supplier",
      resourceId: supplier.id,
      summary: `Fornecedor ${supplier.name} criado.`,
      metadata: {
        name: supplier.name,
        contactChannel: supplier.contactChannel,
      },
    });

    revalidatePath("/suppliers");
    supplierRedirect({
      success: "Fornecedor criado com sucesso.",
      edit: supplier.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      supplierRedirect({ error: "Nao foi possivel salvar o fornecedor." });
    }

    throw error;
  }
}

export async function removeSupplier(formData: FormData) {
  const user = await requireUser();
  const supplierId = `${formData.get("id") ?? ""}`.trim();

  if (!supplierId) {
    supplierRedirect({ error: "Fornecedor invalido." });
  }

  const existingSupplier = await getSupplierById(user.id, supplierId);

  if (!existingSupplier) {
    supplierRedirect({ error: "Fornecedor nao encontrado." });
  }

  const canDelete = await canDeleteSupplier(user.id, supplierId);

  if (!canDelete) {
    supplierRedirect({
      error: "Esse fornecedor ainda esta vinculado a produtos, pedidos ou notas fiscais.",
      edit: supplierId,
    });
  }

  await deleteSupplier(supplierId);
  await recordAuditLog({
    actor: user,
    action: "DELETE",
    resource: "supplier",
    resourceId: supplierId,
    summary: `Fornecedor ${existingSupplier.name} removido.`,
    metadata: {
      name: existingSupplier.name,
    },
  });
  revalidatePath("/suppliers");
  supplierRedirect({ success: "Fornecedor removido com sucesso." });
}
