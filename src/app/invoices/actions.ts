"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceType } from "@prisma/client";
import {
  createInvoice,
  deleteInvoice,
  getInvoiceByAccessKey,
  getInvoiceById,
  updateInvoice,
} from "@/lib/data/invoices";
import { parseInvoiceXml } from "@/lib/invoices/xml";
import { getOrderById } from "@/lib/data/orders";
import { getSupplierById } from "@/lib/data/suppliers";
import { requireUser } from "@/lib/require-user";
import { invoiceSchema } from "@/lib/validations/invoices";

function invoicesRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/invoices?${query}` : "/invoices");
}

function parseDate(value: string | undefined, fieldLabel: string, edit?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    invoicesRedirect({
      error: `Informe um valor valido para ${fieldLabel}.`,
      edit,
    });
  }

  return date;
}

function getRedirectState(input: {
  edit?: string;
  orderId?: string;
  supplierId?: string | null;
}) {
  return {
    edit: input.edit,
    order: input.edit ? undefined : input.orderId,
    supplier: input.edit ? undefined : input.supplierId ?? undefined,
  };
}

function readTextEntry(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value
  );
}

async function resolveInvoiceRelations(input: {
  userId: string;
  edit?: string;
  orderId?: string;
  supplierId?: string | null;
  type: InvoiceType;
}) {
  const order = input.orderId ? await getOrderById(input.userId, input.orderId) : null;

  if (input.orderId && !order) {
    invoicesRedirect({
      error: "Selecione um pedido valido.",
      ...getRedirectState(input),
    });
  }

  if (input.type === InvoiceType.SALE && !input.orderId) {
    invoicesRedirect({
      error: "Vincule a nota de venda a um pedido.",
      ...getRedirectState(input),
    });
  }

  const resolvedSupplierId =
    input.type === InvoiceType.SALE ? null : input.supplierId ?? order?.supplierId ?? null;

  if (input.type === InvoiceType.PURCHASE && !resolvedSupplierId) {
    invoicesRedirect({
      error: "Selecione um fornecedor para a nota de compra.",
      ...getRedirectState({
        ...input,
        supplierId: resolvedSupplierId,
      }),
    });
  }

  if (order && resolvedSupplierId && order.supplierId !== resolvedSupplierId) {
    invoicesRedirect({
      error: "O fornecedor da nota precisa bater com o fornecedor do pedido.",
      ...getRedirectState({
        ...input,
        supplierId: resolvedSupplierId,
      }),
    });
  }

  if (resolvedSupplierId) {
    const supplier = await getSupplierById(input.userId, resolvedSupplierId);

    if (!supplier) {
      invoicesRedirect({
        error: "Selecione um fornecedor valido.",
        ...getRedirectState({
          ...input,
          supplierId: resolvedSupplierId,
        }),
      });
    }
  }

  return {
    orderId: input.orderId ?? null,
    supplierId: resolvedSupplierId,
  };
}

function revalidateInvoiceSurfaces() {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/orders");
  revalidatePath("/suppliers");
}

export async function saveInvoice(formData: FormData) {
  const user = await requireUser();
  const parsed = invoiceSchema.safeParse({
    id: formData.get("id"),
    orderId: formData.get("orderId"),
    supplierId: formData.get("supplierId"),
    number: formData.get("number"),
    series: formData.get("series"),
    accessKey: formData.get("accessKey"),
    type: formData.get("type"),
    status: formData.get("status"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    amount: formData.get("amount"),
    taxAmount: formData.get("taxAmount"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    invoicesRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados da nota fiscal.",
      ...getRedirectState({
        edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
        orderId: typeof formData.get("orderId") === "string" ? (formData.get("orderId") as string) : undefined,
        supplierId:
          typeof formData.get("supplierId") === "string"
            ? (formData.get("supplierId") as string)
            : undefined,
      }),
    });
  }

  const data = parsed.data;
  const issueDate = parseDate(data.issueDate, "data de emissao", data.id);
  const dueDate = parseDate(data.dueDate, "vencimento", data.id);

  if (!issueDate) {
    invoicesRedirect({
      error: "Informe a data de emissao.",
      ...getRedirectState({
        edit: data.id,
        orderId: data.orderId,
        supplierId: data.supplierId,
      }),
    });
  }

  if (dueDate && dueDate < issueDate) {
    invoicesRedirect({
      error: "O vencimento nao pode ser anterior a emissao.",
      ...getRedirectState({
        edit: data.id,
        orderId: data.orderId,
        supplierId: data.supplierId,
      }),
    });
  }

  const relations = await resolveInvoiceRelations({
    userId: user.id,
    edit: data.id,
    orderId: data.orderId,
    supplierId: data.supplierId,
    type: data.type,
  });

  if (data.id) {
    const existingInvoice = await getInvoiceById(user.id, data.id);

    if (!existingInvoice) {
      invoicesRedirect({ error: "Nota fiscal nao encontrada." });
    }

    await updateInvoice(data.id, {
      orderId: relations.orderId,
      supplierId: relations.supplierId,
      number: data.number,
      series: data.series,
      accessKey: data.accessKey,
      type: data.type,
      status: data.status,
      issueDate,
      dueDate: dueDate ?? null,
      amount: data.amount,
      taxAmount: data.taxAmount ?? null,
      notes: data.notes,
    });

    revalidateInvoiceSurfaces();
    invoicesRedirect({
      success: "Nota fiscal atualizada com sucesso.",
      edit: data.id,
    });
  }

  const invoice = await createInvoice({
    userId: user.id,
    orderId: relations.orderId,
    supplierId: relations.supplierId,
    number: data.number,
    series: data.series,
    accessKey: data.accessKey,
    type: data.type,
    status: data.status,
    issueDate,
    dueDate: dueDate ?? null,
    amount: data.amount,
    taxAmount: data.taxAmount ?? null,
    notes: data.notes,
  });

  revalidateInvoiceSurfaces();
  invoicesRedirect({
    success: "Nota fiscal criada com sucesso.",
    edit: invoice.id,
  });
}

export async function importInvoiceXml(formData: FormData) {
  const user = await requireUser();
  const orderId = readTextEntry(formData, "orderId");
  const supplierId = readTextEntry(formData, "supplierId");
  const xmlFile = formData.get("xmlFile");

  if (!isUploadedFile(xmlFile) || xmlFile.size === 0) {
    invoicesRedirect({
      error: "Selecione um arquivo XML para importar.",
      ...getRedirectState({ orderId, supplierId }),
    });
  }

  if (xmlFile.size > 5 * 1024 * 1024) {
    invoicesRedirect({
      error: "O XML precisa ter ate 5 MB.",
      ...getRedirectState({ orderId, supplierId }),
    });
  }

  let parsedInvoice: ReturnType<typeof parseInvoiceXml>;

  try {
    parsedInvoice = parseInvoiceXml(await xmlFile.text());
  } catch (error) {
    invoicesRedirect({
      error:
        error instanceof Error ? error.message : "Nao consegui importar o XML da nota fiscal.",
      ...getRedirectState({ orderId, supplierId }),
    });
  }

  if (parsedInvoice.accessKey) {
    const existingInvoice = await getInvoiceByAccessKey(user.id, parsedInvoice.accessKey);

    if (existingInvoice) {
      invoicesRedirect({
        error: "Ja existe uma nota fiscal cadastrada com essa chave de acesso.",
        edit: existingInvoice.id,
      });
    }
  }

  const relations = await resolveInvoiceRelations({
    userId: user.id,
    orderId,
    supplierId,
    type: parsedInvoice.type,
  });
  const notes = [parsedInvoice.notes, `Arquivo: ${xmlFile.name}`]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
  const invoice = await createInvoice({
    userId: user.id,
    orderId: relations.orderId,
    supplierId: relations.supplierId,
    number: parsedInvoice.number,
    series: parsedInvoice.series,
    accessKey: parsedInvoice.accessKey,
    type: parsedInvoice.type,
    status: parsedInvoice.status,
    issueDate: parsedInvoice.issueDate,
    dueDate: parsedInvoice.dueDate ?? null,
    amount: parsedInvoice.amount,
    taxAmount: parsedInvoice.taxAmount ?? null,
    notes: notes || undefined,
  });

  revalidateInvoiceSurfaces();
  invoicesRedirect({
    success: "XML importado com sucesso.",
    edit: invoice.id,
  });
}

export async function removeInvoice(formData: FormData) {
  const user = await requireUser();
  const invoiceId = `${formData.get("id") ?? ""}`.trim();

  if (!invoiceId) {
    invoicesRedirect({ error: "Nota fiscal invalida." });
  }

  const existingInvoice = await getInvoiceById(user.id, invoiceId);

  if (!existingInvoice) {
    invoicesRedirect({ error: "Nota fiscal nao encontrada." });
  }

  await deleteInvoice(invoiceId);
  revalidateInvoiceSurfaces();
  invoicesRedirect({ success: "Nota fiscal removida com sucesso." });
}
