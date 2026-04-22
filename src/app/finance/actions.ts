"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FinancialEntryType } from "@prisma/client";
import {
  createFinancialEntry,
  deleteFinancialEntry,
  getFinancialEntryById,
  updateFinancialEntry,
} from "@/lib/data/finance";
import { getOrderById } from "@/lib/data/orders";
import { requireUser } from "@/lib/require-user";
import { recordAuditLog } from "@/lib/security/audit";
import { financialEntrySchema } from "@/lib/validations/finance";

function financeRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/finance?${query}` : "/finance");
}

function parseDate(value: string, edit?: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    financeRedirect({
      error: "Informe uma data de referencia valida.",
      edit,
    });
  }

  return date;
}

export async function saveFinancialEntry(formData: FormData) {
  const user = await requireUser();
  const parsed = financialEntrySchema.safeParse({
    id: formData.get("id"),
    orderId: formData.get("orderId"),
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    referenceDate: formData.get("referenceDate"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    financeRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do lancamento.",
      edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
    });
  }

  const data = parsed.data;
  const referenceDate = parseDate(data.referenceDate, data.id);

  if (data.orderId) {
    const order = await getOrderById(user.id, data.orderId);

    if (!order) {
      financeRedirect({
        error: "Selecione um pedido valido.",
        edit: data.id,
      });
    }
  }

  if (data.type === FinancialEntryType.REFUND && !data.orderId) {
    financeRedirect({
      error: "Vincule o reembolso a um pedido para manter o historico correto.",
      edit: data.id,
    });
  }

  if (data.id) {
    const existingEntry = await getFinancialEntryById(user.id, data.id);

    if (!existingEntry) {
      financeRedirect({ error: "Lancamento nao encontrado." });
    }

    await updateFinancialEntry(data.id, {
      orderId: data.orderId ?? null,
      type: data.type,
      category: data.category,
      amount: data.amount,
      referenceDate,
      description: data.description,
    });
    await recordAuditLog({
      actor: user,
      action: "UPDATE",
      resource: "financial_entry",
      resourceId: data.id,
      summary: "Lancamento financeiro atualizado.",
      metadata: {
        type: data.type,
        category: data.category,
        orderId: data.orderId ?? null,
      },
    });

    revalidatePath("/finance");
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    financeRedirect({
      success: "Lancamento atualizado com sucesso.",
      edit: data.id,
    });
  }

  const entry = await createFinancialEntry({
    userId: user.id,
    orderId: data.orderId ?? null,
    type: data.type,
    category: data.category,
    amount: data.amount,
    referenceDate,
    description: data.description,
  });
  await recordAuditLog({
    actor: user,
    action: "CREATE",
    resource: "financial_entry",
    resourceId: entry.id,
    summary: "Lancamento financeiro criado.",
    metadata: {
      type: entry.type,
      category: entry.category,
      orderId: entry.orderId,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  financeRedirect({
    success: "Lancamento criado com sucesso.",
    edit: entry.id,
  });
}

export async function removeFinancialEntry(formData: FormData) {
  const user = await requireUser();
  const entryId = `${formData.get("id") ?? ""}`.trim();

  if (!entryId) {
    financeRedirect({ error: "Lancamento invalido." });
  }

  const existingEntry = await getFinancialEntryById(user.id, entryId);

  if (!existingEntry) {
    financeRedirect({ error: "Lancamento nao encontrado." });
  }

  await deleteFinancialEntry(entryId);
  await recordAuditLog({
    actor: user,
    action: "DELETE",
    resource: "financial_entry",
    resourceId: entryId,
    summary: "Lancamento financeiro removido.",
    metadata: {
      type: existingEntry.type,
      category: existingEntry.category,
      orderId: existingEntry.orderId,
    },
  });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  financeRedirect({ success: "Lancamento removido com sucesso." });
}
