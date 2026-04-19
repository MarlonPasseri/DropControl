import Link from "next/link";
import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { importInvoiceXml, removeInvoice, saveInvoice } from "@/app/invoices/actions";
import { AppShell } from "@/components/app-shell";
import {
  AppPanel,
  EmptyHint,
  MetricCard,
  NoticeBanner,
  PaginationControls,
  ResultSummary,
  StatusPill,
} from "@/components/mvp-ui";
import {
  getInvoiceById,
  getInvoiceMetrics,
  getInvoicesByUser,
} from "@/lib/data/invoices";
import { getOrderById, getOrderOptions } from "@/lib/data/orders";
import { getSupplierById, getSupplierOptions } from "@/lib/data/suppliers";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toDateTimeLocalValue,
} from "@/lib/formatters";
import { parsePageParam, paginateItems } from "@/lib/pagination";
import {
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  invoiceStatusOptions,
  invoiceTypeOptions,
} from "@/lib/options";
import { requireUser } from "@/lib/require-user";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(
  current: Record<string, string | string[] | undefined>,
  updates: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const resolvedValue = firstOf(value);

    if (resolvedValue) {
      search.set(key, resolvedValue);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      search.delete(key);
    } else {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

function parseDateInput(value: string | undefined, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const statusParam = firstOf(params.status);
  const typeParam = firstOf(params.type);
  const fromParam = firstOf(params.from);
  const toParam = firstOf(params.to);
  const prefillOrderId = editId ? undefined : firstOf(params.order);
  const prefillSupplierId = editId ? undefined : firstOf(params.supplier);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);
  const fromDate = parseDateInput(fromParam);
  const toDate = parseDateInput(toParam, true);
  const statusFilter = invoiceStatusOptions.some((option) => option.value === statusParam)
    ? (statusParam as InvoiceStatus)
    : undefined;
  const typeFilter = invoiceTypeOptions.some((option) => option.value === typeParam)
    ? (typeParam as InvoiceType)
    : undefined;

  const [
    metrics,
    invoices,
    orderOptions,
    supplierOptions,
    selectedInvoice,
    prefillOrder,
    prefillSupplier,
  ] = await Promise.all([
    getInvoiceMetrics(user.id),
    getInvoicesByUser(user.id, {
      query: query || undefined,
      status: statusFilter,
      type: typeFilter,
      from: fromDate,
      to: toDate,
    }),
    getOrderOptions(user.id),
    getSupplierOptions(user.id),
    editId ? getInvoiceById(user.id, editId) : Promise.resolve(null),
    prefillOrderId ? getOrderById(user.id, prefillOrderId) : Promise.resolve(null),
    prefillSupplierId ? getSupplierById(user.id, prefillSupplierId) : Promise.resolve(null),
  ]);
  const paginatedInvoices = paginateItems(invoices, page);
  const defaultType = selectedInvoice?.type ?? (prefillOrder ? InvoiceType.SALE : InvoiceType.PURCHASE);
  const defaultOrderId = selectedInvoice?.orderId ?? prefillOrder?.id ?? "";
  const defaultSupplierId =
    selectedInvoice?.supplierId ??
    prefillSupplier?.id ??
    (defaultType === InvoiceType.PURCHASE && prefillOrder ? prefillOrder.supplierId : "") ??
    "";
  const importOrderId = prefillOrder?.id ?? "";
  const importSupplierId = prefillSupplier?.id ?? prefillOrder?.supplierId ?? "";

  const invoiceMetrics = [
    {
      label: "Notas em aberto",
      value: `${metrics.openCount}`,
      note: "Pendentes ou emitidas sem baixa",
      accent: "amber" as const,
    },
    {
      label: "Vencidas",
      value: `${metrics.overdueCount}`,
      note: "Com vencimento passado",
      accent: "rose" as const,
    },
    {
      label: "Emitidas no mes",
      value: `${metrics.issuedThisMonthCount}`,
      note: "Ritmo fiscal recente",
      accent: "teal" as const,
    },
    {
      label: "Valor em aberto",
      value: formatCurrency(metrics.openAmount),
      note: "Compromissos ainda sem baixa",
      accent: "blue" as const,
    },
  ];

  return (
    <AppShell
      title="Notas fiscais"
      description="Cadastro e acompanhamento de notas de compra e venda para manter pedido, fornecedor e rotina financeira alinhados."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {invoiceMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtro fiscal" eyebrow="Base documental">
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_180px_auto_auto]"
            action="/invoices"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por numero, serie, chave, pedido ou fornecedor"
              className="min-w-0 rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            />
            <select
              name="type"
              defaultValue={typeFilter ?? ""}
              className="rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            >
              <option value="">Todos os tipos</option>
              {invoiceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            >
              <option value="">Todos os status</option>
              {invoiceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? ""}
              className="rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            />
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? ""}
              className="rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            />
            <button
              type="submit"
              className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
            >
              Filtrar
            </button>
            {(query ||
              statusFilter ||
              typeFilter ||
              fromParam ||
              toParam ||
              editId ||
              prefillOrderId ||
              prefillSupplierId) && (
              <Link
                href="/invoices"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Limpar
              </Link>
            )}
          </form>

          <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
            Nota de venda pede pedido vinculado. Nota de compra pode ser vinculada
            direto ao fornecedor ou herdar o fornecedor do pedido.
          </div>
        </div>
      </AppPanel>

      <AppPanel title="Importar XML" eyebrow="Entrada rapida">
        <div className="flex flex-col gap-4">
          <form
            action={importInvoiceXml}
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
          >
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Arquivo XML
              </span>
              <input
                type="file"
                name="xmlFile"
                accept=".xml,text/xml,application/xml"
                required
                className="block w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Pedido
              </span>
              <select
                name="orderId"
                defaultValue={importOrderId}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                <option value="">Sem pedido vinculado</option>
                {orderOptions.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Fornecedor
              </span>
              <select
                name="supplierId"
                defaultValue={importSupplierId}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                <option value="">Sem fornecedor vinculado</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="signature-gradient w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
              >
                Importar XML
              </button>
            </div>
          </form>

          <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
            O sistema puxa numero, serie, chave, emissao, vencimento, valor,
            tributos e tipo direto do XML da NF-e. Se o arquivo indicar nota de venda,
            escolha o pedido antes de importar.
          </div>
        </div>
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AppPanel
          title="Lista de notas"
          eyebrow="Controle operacional"
          action={
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
                order: undefined,
                supplier: undefined,
              })}
              className="signature-gradient rounded-md px-4 py-2 text-sm font-medium text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.14)]"
            >
              Nova nota
            </Link>
          }
        >
          {invoices.length === 0 ? (
            <EmptyHint text="Nenhuma nota fiscal encontrada para os filtros atuais." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="notas fiscais"
                startIndex={paginatedInvoices.startIndex}
                endIndex={paginatedInvoices.endIndex}
                totalItems={paginatedInvoices.totalItems}
              />
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nota</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Vinculo</th>
                      <th className="px-4 py-3 font-medium">Datas</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedInvoices.items.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-4 align-top">
                          <Link
                            href={buildQueryString(params, {
                              edit: invoice.id,
                              success: undefined,
                              error: undefined,
                              order: undefined,
                              supplier: undefined,
                            })}
                            className="block rounded-lg transition hover:bg-slate-50"
                          >
                            <p className="font-medium text-slate-950">
                              NF {invoice.number}
                              {invoice.series ? ` / ${invoice.series}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {invoice.accessKey || "Sem chave registrada"}
                            </p>
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={getInvoiceTypeLabel(invoice.type)} />
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p>{invoice.order ? `Pedido ${invoice.order.orderNumber}` : "Sem pedido"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {invoice.supplier?.name || "Sem fornecedor"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p>Emissao {formatDateTime(invoice.issueDate)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Vencimento {formatDate(invoice.dueDate)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p className="font-medium text-slate-950">
                            {formatCurrency(invoice.amount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Tributos {formatCurrency(invoice.taxAmount ?? 0)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={getInvoiceStatusLabel(invoice.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={paginatedInvoices.page}
                totalPages={paginatedInvoices.totalPages}
                buildHref={(nextPage) =>
                  buildQueryString(params, {
                    page: String(nextPage),
                    success: undefined,
                    error: undefined,
                    order: undefined,
                    supplier: undefined,
                  })
                }
              />
            </div>
          )}
        </AppPanel>

        <AppPanel
          title={selectedInvoice ? "Editar nota fiscal" : "Nova nota fiscal"}
          eyebrow="Formulario real"
        >
          <form action={saveInvoice} className="grid gap-4">
            {selectedInvoice ? <input type="hidden" name="id" value={selectedInvoice.id} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Numero
                </span>
                <input
                  type="text"
                  name="number"
                  required
                  defaultValue={selectedInvoice?.number ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Serie</span>
                <input
                  type="text"
                  name="series"
                  defaultValue={selectedInvoice?.series ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Chave de acesso
              </span>
              <input
                type="text"
                name="accessKey"
                defaultValue={selectedInvoice?.accessKey ?? ""}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Tipo</span>
                <select
                  name="type"
                  required
                  defaultValue={defaultType}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                >
                  {invoiceTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select
                  name="status"
                  required
                  defaultValue={selectedInvoice?.status ?? InvoiceStatus.PENDING}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                >
                  {invoiceStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Pedido vinculado
              </span>
              <select
                name="orderId"
                defaultValue={defaultOrderId}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                <option value="">Sem pedido vinculado</option>
                {orderOptions.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Fornecedor vinculado
              </span>
              <select
                name="supplierId"
                defaultValue={defaultSupplierId}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                <option value="">Sem fornecedor vinculado</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Valor total
                </span>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedInvoice?.amount.toString() ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Tributos
                </span>
                <input
                  type="number"
                  name="taxAmount"
                  min="0"
                  step="0.01"
                  defaultValue={selectedInvoice?.taxAmount?.toString() ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Emissao
                </span>
                <input
                  type="datetime-local"
                  name="issueDate"
                  required
                  defaultValue={toDateTimeLocalValue(
                    selectedInvoice?.issueDate ?? new Date(),
                  )}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Vencimento
                </span>
                <input
                  type="datetime-local"
                  name="dueDate"
                  defaultValue={toDateTimeLocalValue(selectedInvoice?.dueDate)}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Observacoes
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={selectedInvoice?.notes ?? ""}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
              >
                {selectedInvoice ? "Salvar alteracoes" : "Criar nota fiscal"}
              </button>

              {selectedInvoice ? (
                <>
                  <Link
                    href={buildQueryString(params, {
                      edit: undefined,
                      success: undefined,
                      error: undefined,
                      order: undefined,
                      supplier: undefined,
                    })}
                    className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Nova nota
                  </Link>
                  <button
                    type="submit"
                    formAction={removeInvoice}
                    className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
                  >
                    Excluir nota
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </AppPanel>
      </section>
    </AppShell>
  );
}
