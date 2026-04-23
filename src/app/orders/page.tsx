import Link from "next/link";
import type { ReactNode } from "react";
import { OrderStatus } from "@prisma/client";
import {
  changeOrderStatus,
  removeOrder,
  saveOrder,
} from "@/app/orders/actions";
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
  getOrderById,
  getOrderMetrics,
  getOrdersByUser,
} from "@/lib/data/orders";
import { getProductsByUser } from "@/lib/data/products";
import { getSupplierOptions } from "@/lib/data/suppliers";
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
  getOrderStatusLabel,
  orderStatusOptions,
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
  return query ? `/orders?${query}` : "/orders";
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

const inputClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] focus:border-[var(--primary)]";
const selectClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-[var(--primary)]";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="col-span-full grid gap-4 border-t border-[var(--outline-variant)] pt-5 md:grid-cols-2">
      <legend className="mb-1 pr-3 font-headline text-sm font-bold text-slate-950">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const statusParam = firstOf(params.status);
  const fromParam = firstOf(params.from);
  const toParam = firstOf(params.to);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);
  const fromDate = parseDateInput(fromParam);
  const toDate = parseDateInput(toParam, true);
  const statusFilter = orderStatusOptions.some((option) => option.value === statusParam)
    ? (statusParam as OrderStatus)
    : undefined;

  const [metrics, orders, products, suppliers, selectedOrder] = await Promise.all([
    getOrderMetrics(user.id),
    getOrdersByUser(user.id, {
      query: query || undefined,
      status: statusFilter,
      from: fromDate,
      to: toDate,
    }),
    getProductsByUser(user.id),
    getSupplierOptions(user.id),
    editId ? getOrderById(user.id, editId) : Promise.resolve(null),
  ]);
  const paginatedOrders = paginateItems(orders, page);

  const orderMetrics = [
    {
      label: "Pendentes",
      value: `${metrics.pendingCount}`,
      note: "Aguardando compra ou envio",
      accent: "amber" as const,
    },
    {
      label: "Com atraso",
      value: `${metrics.delayedCount}`,
      note: "Acima do prazo prometido",
      accent: "rose" as const,
    },
    {
      label: "Com problema",
      value: `${metrics.problemCount}`,
      note: "Exigem tratativa",
      accent: "rose" as const,
    },
    {
      label: "Entregues hoje",
      value: `${metrics.deliveredTodayCount}`,
      note: "Atualizadas no dia",
      accent: "teal" as const,
    },
  ];

  return (
    <AppShell
      title="Pedidos"
      description="Fluxo operacional real com CRUD, filtros por periodo e atualizacao rapida de status para casos sensiveis."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppPanel title="Radar de pedidos" eyebrow="Contexto operacional">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                  Prioridade do turno
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {statusFilter
                    ? `Voce esta olhando o status ${getOrderStatusLabel(statusFilter)}.`
                    : "Use esta base para tratar atrasos, atualizar rastreio e fechar pendencias de entrega."}
                  {query ? ` Busca ativa: "${query}".` : ""}
                  {fromParam || toParam
                    ? ` Janela filtrada de ${fromParam || "inicio"} ate ${toParam || "hoje"}.`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildQueryString(params, {
                    status: OrderStatus.DELAYED,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver atrasados
                </Link>
                <Link
                  href={buildQueryString(params, {
                    status: OrderStatus.ISSUE,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver problemas
                </Link>
                <Link
                  href={buildQueryString(params, {
                    status: OrderStatus.SHIPPED,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Em transito
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Pendentes</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.pendingCount}</p>
                <p className="mt-1 text-xs text-slate-500">Aguardando compra ou envio</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Em risco</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {metrics.delayedCount + metrics.problemCount}
                </p>
                <p className="mt-1 text-xs text-slate-500">Atrasos e casos com problema</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Edicao</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selectedOrder ? selectedOrder.orderNumber : "Novo pedido"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedOrder ? `${selectedOrder.invoices.length} NFs vinculadas` : "Formulario pronto para cadastro"}
                </p>
              </div>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Fluxo rapido" eyebrow="Acoes do operador">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-lg bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-[var(--on-primary)] shadow-[0_16px_36px_rgba(23,107,99,0.22)] hover:bg-[var(--primary-dim)]"
            >
              Criar novo pedido
            </Link>
            <Link
              href="/finance"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Conferir impacto financeiro
            </Link>
            <Link
              href="/tasks"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Abrir tarefas ligadas
            </Link>
            <Link
              href="/invoices"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Ir para notas fiscais
            </Link>
          </div>
        </AppPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtros" eyebrow="Priorizar atendimento">
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]"
            action="/orders"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por pedido, cliente, produto ou fornecedor"
              className={inputClass}
            />
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? ""}
              className={inputClass}
            />
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? ""}
              className={inputClass}
            />
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-dim)]"
            >
              Filtrar
            </button>
            {(query || statusFilter || fromParam || toParam || editId) && (
              <Link
                href="/orders"
                className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Limpar
              </Link>
            )}
          </form>

          {(query || statusFilter || fromParam || toParam) && (
            <div className="flex flex-wrap gap-2">
              {query ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Busca: {query}
                </span>
              ) : null}
              {statusFilter ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Status: {getOrderStatusLabel(statusFilter)}
                </span>
              ) : null}
              {fromParam || toParam ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Periodo: {fromParam || "inicio"} ate {toParam || "hoje"}
                </span>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildQueryString(params, {
                status: undefined,
                edit: undefined,
                page: undefined,
              })}
              className={`rounded-full border px-3 py-2 text-sm font-medium ${
                !statusFilter
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-[var(--outline-variant)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              Todos
            </Link>
            {orderStatusOptions.map((option) => (
              <Link
                key={option.value}
                href={buildQueryString(params, {
                  status: option.value,
                  edit: undefined,
                  page: undefined,
                })}
                className={`rounded-full border px-3 py-2 text-sm font-medium ${
                  statusFilter === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-[var(--outline-variant)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <AppPanel
          title="Base de pedidos"
          eyebrow="Tabela principal"
          action={
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--primary-dim)]"
            >
              Novo pedido
            </Link>
          }
        >
          {orders.length === 0 ? (
            <EmptyHint text="Nenhum pedido encontrado. Crie o primeiro pedido para abrir o fluxo operacional." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="pedidos"
                startIndex={paginatedOrders.startIndex}
                endIndex={paginatedOrders.endIndex}
                totalItems={paginatedOrders.totalItems}
              />
              <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
                <table className="min-w-[1040px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Pedido</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Produto</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Atualizacao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedOrders.items.map((order) => (
                      <tr
                        key={order.id}
                        className="odd:bg-white even:bg-slate-50/55 hover:bg-[var(--surface-container-low)]"
                      >
                        <td className="px-4 py-4 align-top">
                          <Link
                            href={buildQueryString(params, {
                              edit: order.id,
                              success: undefined,
                              error: undefined,
                            })}
                            className="block rounded-lg transition hover:text-[var(--primary)]"
                          >
                            <p className="font-medium text-slate-950">{order.orderNumber}</p>
                            <p className="mt-1 text-slate-500">{formatDate(order.purchaseDate)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                ETA {formatDate(order.estimatedDeliveryDate)}
                              </span>
                              <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                {order._count.invoices} NFs
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p>{order.customerName}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {order.customerEmail || "Sem e-mail"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p>{order.product.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{order.supplier.name}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(order.saleAmount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Custo {formatCurrency(order.totalCost)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={getOrderStatusLabel(order.status)} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <form action={changeOrderStatus} className="space-y-2">
                            <input type="hidden" name="id" value={order.id} />
                            <select
                              name="status"
                              defaultValue={order.status}
                              className="w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--primary)]"
                            >
                              {orderStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-[var(--outline-variant)] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            >
                              Atualizar
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={paginatedOrders.page}
                totalPages={paginatedOrders.totalPages}
                buildHref={(nextPage) =>
                  buildQueryString(params, {
                    page: String(nextPage),
                    success: undefined,
                    error: undefined,
                  })
                }
              />
            </div>
          )}
        </AppPanel>

        <div className="space-y-6">
          <AppPanel
            title={selectedOrder ? "Editar pedido" : "Novo pedido"}
            eyebrow="Dados operacionais"
          >
            {products.length === 0 || suppliers.length === 0 ? (
              <EmptyHint text="Cadastre pelo menos um fornecedor e um produto antes de criar pedidos." />
            ) : (
              <form action={saveOrder} className="grid gap-4 md:grid-cols-2">
                {selectedOrder ? <input type="hidden" name="id" value={selectedOrder.id} /> : null}

                <div className="col-span-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-slate-700">
                  {selectedOrder ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-950">
                        Editando {selectedOrder.orderNumber}
                      </span>
                      <StatusPill label={getOrderStatusLabel(selectedOrder.status)} />
                      <span className="text-xs text-slate-500">
                        {selectedOrder.invoices.length} notas fiscais vinculadas
                      </span>
                    </div>
                  ) : (
                    <p>
                      Preencha os dados essenciais primeiro. Depois voce pode voltar para anexar
                      rastreio, entrega e notas fiscais com mais contexto.
                    </p>
                  )}
                </div>

                <FormSection title="Dados do pedido">
                  <label>
                    <span className={labelClass}>Numero do pedido</span>
                    <input
                      type="text"
                      name="orderNumber"
                      required
                      defaultValue={selectedOrder?.orderNumber ?? ""}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>Data da compra</span>
                    <input
                      type="datetime-local"
                      name="purchaseDate"
                      required
                      defaultValue={toDateTimeLocalValue(selectedOrder?.purchaseDate)}
                      className={inputClass}
                    />
                  </label>
                </FormSection>

                <FormSection title="Cliente">
                  <label className="col-span-full">
                    <span className={labelClass}>Nome do cliente</span>
                    <input
                      type="text"
                      name="customerName"
                      required
                      defaultValue={selectedOrder?.customerName ?? ""}
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-full">
                    <span className={labelClass}>E-mail do cliente</span>
                    <input
                      type="email"
                      name="customerEmail"
                      defaultValue={selectedOrder?.customerEmail ?? ""}
                      className={inputClass}
                    />
                  </label>
                </FormSection>

                <FormSection title="Produto e fornecedor">
                  <label className="col-span-full">
                    <span className={labelClass}>Produto</span>
                    <select
                      name="productId"
                      required
                      defaultValue={selectedOrder?.productId ?? products[0]?.id}
                      className={selectClass}
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.sku}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-full">
                    <span className={labelClass}>Fornecedor</span>
                    <select
                      name="supplierId"
                      required
                      defaultValue={selectedOrder?.supplierId ?? suppliers[0]?.id}
                      className={selectClass}
                    >
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </FormSection>

                <FormSection title="Financeiro">
                  <label>
                    <span className={labelClass}>Valor pago</span>
                    <input
                      type="number"
                      name="saleAmount"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={selectedOrder?.saleAmount.toString() ?? ""}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>Custo total</span>
                    <input
                      type="number"
                      name="totalCost"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={selectedOrder?.totalCost.toString() ?? ""}
                      className={inputClass}
                    />
                  </label>
                </FormSection>

                <FormSection title="Acompanhamento">
                  <label>
                    <span className={labelClass}>Status</span>
                    <select
                      name="status"
                      required
                      defaultValue={selectedOrder?.status ?? OrderStatus.PAID}
                      className={selectClass}
                    >
                      {orderStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className={labelClass}>Codigo de rastreio</span>
                    <input
                      type="text"
                      name="trackingCode"
                      defaultValue={selectedOrder?.trackingCode ?? ""}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>Prazo estimado</span>
                    <input
                      type="datetime-local"
                      name="estimatedDeliveryDate"
                      defaultValue={toDateTimeLocalValue(selectedOrder?.estimatedDeliveryDate)}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>Data de entrega</span>
                    <input
                      type="datetime-local"
                      name="deliveredDate"
                      defaultValue={toDateTimeLocalValue(selectedOrder?.deliveredDate)}
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-full">
                    <span className={labelClass}>Observacoes</span>
                    <textarea
                      name="notes"
                      rows={4}
                      defaultValue={selectedOrder?.notes ?? ""}
                      className={inputClass}
                    />
                  </label>
                </FormSection>

                <div className="col-span-full flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-dim)]"
                  >
                    {selectedOrder ? "Salvar alteracoes" : "Criar pedido"}
                  </button>

                  {selectedOrder ? (
                    <>
                      <Link
                        href={buildQueryString(params, {
                          edit: undefined,
                          success: undefined,
                          error: undefined,
                        })}
                        className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      >
                        Novo pedido
                      </Link>
                      <button
                        type="submit"
                        formAction={removeOrder}
                        className="rounded-lg border border-[var(--error-container)] bg-white px-4 py-3 text-sm font-medium text-[var(--error)] hover:border-[var(--error)]"
                      >
                        Excluir pedido
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            )}
          </AppPanel>

          {selectedOrder ? (
            <AppPanel
              title="Notas fiscais do pedido"
              eyebrow="Integracao fiscal"
              action={
                <Link
                  href={`/invoices?order=${selectedOrder.id}`}
                  className="rounded-md border border-[var(--outline-variant)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Nova NF
                </Link>
              }
            >
              {selectedOrder.invoices.length === 0 ? (
                <EmptyHint text="Ainda nao existe nota fiscal vinculada a este pedido." />
              ) : (
                <div className="space-y-3">
                  {selectedOrder.invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices?edit=${invoice.id}`}
                      className="block rounded-lg border border-[var(--outline-variant)] bg-white p-4 transition hover:border-[var(--primary)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">
                            NF {invoice.number}
                            {invoice.series ? ` / ${invoice.series}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Emissao {formatDateTime(invoice.issueDate)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Vencimento {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <StatusPill label={getInvoiceTypeLabel(invoice.type)} />
                          <StatusPill label={getInvoiceStatusLabel(invoice.status)} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </AppPanel>
          ) : null}

          <AppPanel title="Regras de alerta" eyebrow="Motor simples do MVP">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                Pedido sem atualizacao ha mais de 3 dias.
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                Pedido com prazo vencido e sem status de entrega.
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                Pedido em problema ou atraso sempre sobe para o dashboard.
              </div>
            </div>
          </AppPanel>
        </div>
      </section>
    </AppShell>
  );
}

