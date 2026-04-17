import Link from "next/link";
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
  StatusPill,
} from "@/components/mvp-ui";
import {
  getOrderById,
  getOrderMetrics,
  getOrdersByUser,
} from "@/lib/data/orders";
import { getProductsByUser } from "@/lib/data/products";
import { getSupplierOptions } from "@/lib/data/suppliers";
import { formatCurrency, formatDate, toDateTimeLocalValue } from "@/lib/formatters";
import { getOrderStatusLabel, orderStatusOptions } from "@/lib/options";
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
      accent: "blue" as const,
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtro de operacao" eyebrow="Priorizar atendimento">
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
              className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? ""}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? ""}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Filtrar
            </button>
            {(query || statusFilter || fromParam || toParam || editId) && (
              <Link
                href="/orders"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Limpar
              </Link>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildQueryString(params, { status: undefined, edit: undefined })}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                !statusFilter
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700"
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
                })}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  statusFilter === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
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
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              Novo pedido
            </Link>
          }
        >
          {orders.length === 0 ? (
            <EmptyHint text="Nenhum pedido encontrado. Cadastre produtos e fornecedores para abrir o fluxo operacional." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
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
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={buildQueryString(params, {
                            edit: order.id,
                            success: undefined,
                            error: undefined,
                          })}
                          className="block rounded-lg transition hover:bg-slate-50"
                        >
                          <p className="font-medium text-slate-950">{order.orderNumber}</p>
                          <p className="mt-1 text-slate-500">{formatDate(order.purchaseDate)}</p>
                          <p className="mt-2 text-xs text-slate-400">
                            ETA {formatDate(order.estimatedDeliveryDate)}
                          </p>
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
                        <p>{formatCurrency(order.saleAmount)}</p>
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
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                          >
                            {orderStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
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
          )}
        </AppPanel>

        <div className="space-y-6">
          <AppPanel
            title={selectedOrder ? "Editar pedido" : "Novo pedido"}
            eyebrow="Formulario real"
          >
            {products.length === 0 || suppliers.length === 0 ? (
              <EmptyHint text="Cadastre pelo menos um fornecedor e um produto antes de criar pedidos." />
            ) : (
              <form action={saveOrder} className="grid gap-4 md:grid-cols-2">
                {selectedOrder ? <input type="hidden" name="id" value={selectedOrder.id} /> : null}

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Numero do pedido
                  </span>
                  <input
                    type="text"
                    name="orderNumber"
                    required
                    defaultValue={selectedOrder?.orderNumber ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Data da compra
                  </span>
                  <input
                    type="datetime-local"
                    name="purchaseDate"
                    required
                    defaultValue={toDateTimeLocalValue(selectedOrder?.purchaseDate)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="col-span-full">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Nome do cliente
                  </span>
                  <input
                    type="text"
                    name="customerName"
                    required
                    defaultValue={selectedOrder?.customerName ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="col-span-full">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    E-mail do cliente
                  </span>
                  <input
                    type="email"
                    name="customerEmail"
                    defaultValue={selectedOrder?.customerEmail ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="col-span-full">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Produto</span>
                  <select
                    name="productId"
                    required
                    defaultValue={selectedOrder?.productId ?? products[0]?.id}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.sku}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="col-span-full">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Fornecedor
                  </span>
                  <select
                    name="supplierId"
                    required
                    defaultValue={selectedOrder?.supplierId ?? suppliers[0]?.id}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Valor pago</span>
                  <input
                    type="number"
                    name="saleAmount"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={selectedOrder?.saleAmount.toString() ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Custo total</span>
                  <input
                    type="number"
                    name="totalCost"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={selectedOrder?.totalCost.toString() ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                  <select
                    name="status"
                    required
                    defaultValue={selectedOrder?.status ?? OrderStatus.PAID}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    {orderStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Codigo de rastreio
                  </span>
                  <input
                    type="text"
                    name="trackingCode"
                    defaultValue={selectedOrder?.trackingCode ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Prazo estimado
                  </span>
                  <input
                    type="datetime-local"
                    name="estimatedDeliveryDate"
                    defaultValue={toDateTimeLocalValue(selectedOrder?.estimatedDeliveryDate)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Data de entrega
                  </span>
                  <input
                    type="datetime-local"
                    name="deliveredDate"
                    defaultValue={toDateTimeLocalValue(selectedOrder?.deliveredDate)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="col-span-full">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Observacoes
                  </span>
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={selectedOrder?.notes ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <div className="col-span-full flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
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
                        className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        Novo pedido
                      </Link>
                      <button
                        type="submit"
                        formAction={removeOrder}
                        className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
                      >
                        Excluir pedido
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            )}
          </AppPanel>

          <AppPanel title="Regras de alerta" eyebrow="Motor simples do MVP">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                Pedido sem atualizacao ha mais de 3 dias.
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                Pedido com prazo vencido e sem status de entrega.
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                Pedido em problema ou atraso sempre sobe para o dashboard.
              </div>
            </div>
          </AppPanel>
        </div>
      </section>
    </AppShell>
  );
}
