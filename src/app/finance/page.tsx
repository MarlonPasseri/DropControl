import Link from "next/link";
import { FinancialEntryType } from "@prisma/client";
import {
  removeFinancialEntry,
  saveFinancialEntry,
} from "@/app/finance/actions";
import { AppShell } from "@/components/app-shell";
import {
  AppPanel,
  EmptyHint,
  MetricCard,
  NoticeBanner,
  PaginationControls,
  ProgressBar,
  ResultSummary,
  StatusPill,
} from "@/components/mvp-ui";
import {
  getFinanceAnalytics,
  getFinancialEntriesByUser,
  getFinancialEntryById,
} from "@/lib/data/finance";
import { getOrderOptions } from "@/lib/data/orders";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  toDateTimeLocalValue,
} from "@/lib/formatters";
import { parsePageParam, paginateItems } from "@/lib/pagination";
import {
  financialCategoryOptions,
  financialEntryTypeOptions,
  getFinancialCategoryLabel,
  getFinancialEntryTypeLabel,
  getOrderStatusLabel,
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
  return query ? `/finance?${query}` : "/finance";
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

export default async function FinancePage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const typeParam = firstOf(params.type);
  const fromParam = firstOf(params.from);
  const toParam = firstOf(params.to);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);
  const fromDate = parseDateInput(fromParam);
  const toDate = parseDateInput(toParam, true);
  const typeFilter = financialEntryTypeOptions.some((option) => option.value === typeParam)
    ? (typeParam as FinancialEntryType)
    : undefined;
  const defaultReferenceDate = new Date();

  const [analytics, entries, orderOptions, selectedEntry] = await Promise.all([
    getFinanceAnalytics(user.id),
    getFinancialEntriesByUser(user.id, {
      query: query || undefined,
      type: typeFilter,
      from: fromDate,
      to: toDate,
    }),
    getOrderOptions(user.id),
    editId ? getFinancialEntryById(user.id, editId) : Promise.resolve(null),
  ]);
  const paginatedEntries = paginateItems(entries, page);

  const financeMetrics = [
    {
      label: "Receita do mes",
      value: formatCurrency(analytics.currentMonth.revenue),
      note: `${analytics.currentMonth.orderCount} pedidos base no periodo`,
      accent: "teal" as const,
    },
    {
      label: "Custos do mes",
      value: formatCurrency(analytics.currentMonth.costs),
      note: `${analytics.currentMonth.entryCount} ajustes registrados`,
      accent: "slate" as const,
    },
    {
      label: "Reembolsos",
      value: formatCurrency(analytics.currentMonth.refunds),
      note: "Impacto financeiro do mes",
      accent: "rose" as const,
    },
    {
      label: "Lucro liquido",
      value: formatCurrency(analytics.currentMonth.netProfit),
      note: "Pedidos menos ajustes, despesas e refund",
      accent: analytics.currentMonth.netProfit >= 0 ? ("blue" as const) : ("amber" as const),
    },
  ];

  return (
    <AppShell
      title="Financeiro"
      description="Lancamentos reais, margem por pedido e leitura mensal de lucro para fechar o loop operacional."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {financeMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtro de lancamentos" eyebrow="Base financeira">
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto_auto]"
            action="/finance"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por descricao, pedido, cliente, produto ou fornecedor"
              className="min-w-0 rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            />
            <select
              name="type"
              defaultValue={typeFilter ?? ""}
              className="rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            >
              <option value="">Todos os tipos</option>
              {financialEntryTypeOptions.map((option) => (
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
            {(query || typeFilter || fromParam || toParam || editId) && (
              <Link
                href="/finance"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Limpar
              </Link>
            )}
          </form>

          <div className="rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
            Cada pedido continua com receita e custo base no modulo de pedidos. Os
            lancamentos abaixo refinam o lucro com taxas, anuncios, despesas extras e
            reembolsos.
          </div>
        </div>
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <AppPanel
          title="Lancamentos financeiros"
          eyebrow="CRUD real"
          action={
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="signature-gradient rounded-md px-4 py-2 text-sm font-medium text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.14)]"
            >
              Novo lancamento
            </Link>
          }
        >
          {entries.length === 0 ? (
            <EmptyHint text="Nenhum lancamento encontrado para os filtros atuais." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="lancamentos"
                startIndex={paginatedEntries.startIndex}
                endIndex={paginatedEntries.endIndex}
                totalItems={paginatedEntries.totalItems}
              />
              <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[860px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Descricao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedEntries.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <p>{formatDateTime(entry.referenceDate)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {getFinancialCategoryLabel(entry.category)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <StatusPill label={getFinancialEntryTypeLabel(entry.type)} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={buildQueryString(params, {
                            edit: entry.id,
                            success: undefined,
                            error: undefined,
                          })}
                          className="block rounded-lg transition hover:bg-slate-50"
                        >
                          <p className="font-medium text-slate-950">
                            {entry.order?.orderNumber ?? "Sem pedido vinculado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {entry.order
                              ? `${entry.order.product.name} - ${entry.order.supplier.name}`
                              : "Lancamento geral da operacao"}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-slate-950">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {entry.description || "Sem descricao"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              <PaginationControls
                page={paginatedEntries.page}
                totalPages={paginatedEntries.totalPages}
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

        <AppPanel
          title={selectedEntry ? "Editar lancamento" : "Novo lancamento"}
          eyebrow="Formulario real"
        >
          <form action={saveFinancialEntry} className="grid gap-4">
            {selectedEntry ? <input type="hidden" name="id" value={selectedEntry.id} /> : null}

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Tipo</span>
              <select
                name="type"
                required
                defaultValue={selectedEntry?.type ?? FinancialEntryType.EXPENSE}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                {financialEntryTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Categoria</span>
              <select
                name="category"
                required
                defaultValue={selectedEntry?.category ?? financialCategoryOptions[0]?.value}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              >
                {financialCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Pedido vinculado
              </span>
              <select
                name="orderId"
                defaultValue={selectedEntry?.orderId ?? ""}
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
              <span className="mb-2 block text-sm font-medium text-slate-700">Valor</span>
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                required
                defaultValue={selectedEntry?.amount.toString() ?? ""}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Data de referencia
              </span>
              <input
                type="datetime-local"
                name="referenceDate"
                required
                defaultValue={toDateTimeLocalValue(
                  selectedEntry?.referenceDate ?? defaultReferenceDate,
                )}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Descricao</span>
              <textarea
                name="description"
                rows={4}
                defaultValue={selectedEntry?.description ?? ""}
                className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
              >
                {selectedEntry ? "Salvar alteracoes" : "Criar lancamento"}
              </button>

              {selectedEntry ? (
                <>
                  <Link
                    href={buildQueryString(params, {
                      edit: undefined,
                      success: undefined,
                      error: undefined,
                    })}
                    className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Novo lancamento
                  </Link>
                  <button
                    type="submit"
                    formAction={removeFinancialEntry}
                    className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
                  >
                    Excluir lancamento
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AppPanel title="Resumo mensal" eyebrow="Fechamento">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">Custos</th>
                  <th className="px-4 py-3 font-medium">Reembolsos</th>
                  <th className="px-4 py-3 font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {analytics.monthlySummary.map((month) => (
                  <tr key={month.key}>
                    <td className="px-4 py-4 align-top font-medium text-slate-950">
                      <p>{month.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {month.orderCount} pedidos, {month.entryCount} ajustes
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatCurrency(month.costs)}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatCurrency(month.refunds)}
                    </td>
                    <td
                      className={`px-4 py-4 align-top font-medium ${
                        month.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(month.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppPanel>

        <AppPanel title="Lucro por pedido" eyebrow="Recalculo automatico">
          {analytics.orderProfitability.length === 0 ? (
            <EmptyHint text="Os pedidos vao aparecer aqui assim que a operacao comecar a registrar vendas." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[860px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Receita</th>
                    <th className="px-4 py-3 font-medium">Custos</th>
                    <th className="px-4 py-3 font-medium">Ajustes</th>
                    <th className="px-4 py-3 font-medium">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {analytics.orderProfitability.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/orders?edit=${order.id}`}
                          className="font-medium text-slate-950 transition hover:text-slate-600"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">
                          {order.productName} - {order.supplierName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusPill label={getOrderStatusLabel(order.status)} />
                          <span className="text-xs text-slate-400">
                            {formatDate(order.purchaseDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {formatCurrency(order.baseRevenue + order.additionalIncome)}
                        {order.additionalIncome > 0 ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            +{formatCurrency(order.additionalIncome)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {formatCurrency(order.baseCost + order.additionalExpense)}
                        {order.additionalExpense > 0 ? (
                          <p className="mt-1 text-xs text-amber-700">
                            +{formatCurrency(order.additionalExpense)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {order.adjustmentNet >= 0 ? "+" : ""}
                        {formatCurrency(order.adjustmentNet)}
                        <p className="mt-1 text-xs text-slate-400">
                          {order.linkedEntryCount} lancamentos vinculados
                        </p>
                        {order.refundAmount > 0 ? (
                          <p className="mt-1 text-xs text-rose-700">
                            Reembolso {formatCurrency(order.refundAmount)}
                          </p>
                        ) : null}
                      </td>
                      <td
                        className={`px-4 py-4 align-top font-medium ${
                          order.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        <p>{formatCurrency(order.netProfit)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Margem {formatPercent(order.marginPercent, 1)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AppPanel title="Lucro por produto" eyebrow="Comparativo">
          {analytics.profitByProduct.length === 0 ? (
            <EmptyHint text="Os produtos com lucro aparecem aqui assim que os primeiros pedidos forem fechados." />
          ) : (
            <div className="space-y-4">
              {analytics.profitByProduct.map((item) => (
                <div key={item.id} className="space-y-2">
                  <ProgressBar
                    label={`${item.label} - ${item.sku}`}
                    value={formatCurrency(item.netProfit)}
                    share={item.share}
                  />
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{item.orderCount} pedidos</span>
                    <span>Receita {formatCurrency(item.revenue)}</span>
                    <span>Reembolsos {formatCurrency(item.refundAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel title="Lucro por fornecedor" eyebrow="Comparativo">
          {analytics.profitBySupplier.length === 0 ? (
            <EmptyHint text="O ranking por fornecedor aparece assim que houver pedidos suficientes para comparar parceiros." />
          ) : (
            <div className="space-y-4">
              {analytics.profitBySupplier.map((item) => (
                <div key={item.id} className="space-y-2">
                  <ProgressBar
                    label={item.label}
                    value={formatCurrency(item.netProfit)}
                    share={item.share}
                  />
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{item.orderCount} pedidos</span>
                    <span>Receita {formatCurrency(item.revenue)}</span>
                    <span>Reembolsos {formatCurrency(item.refundAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>
      </section>

      <AppPanel title="Reembolsos recentes" eyebrow="Visao de risco">
        {analytics.refunds.length === 0 ? (
          <EmptyHint text="Nenhum reembolso registrado ate agora." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {analytics.refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatDateTime(refund.referenceDate)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-950">
                        {refund.order?.orderNumber ?? "Sem pedido vinculado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {refund.order
                          ? `${refund.order.product.name} - ${refund.order.supplier.name}`
                          : "Ajuste geral"}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {refund.description || getFinancialCategoryLabel(refund.category)}
                    </td>
                    <td className="px-4 py-4 align-top font-medium text-rose-700">
                      {formatCurrency(refund.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppPanel>
    </AppShell>
  );
}

