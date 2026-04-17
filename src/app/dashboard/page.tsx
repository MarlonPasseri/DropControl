import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  AlertCard,
  AppPanel,
  EmptyHint,
  MetricCard,
  ProgressBar,
  StatusPill,
} from "@/components/mvp-ui";
import { getAlertCenterData } from "@/lib/data/alerts";
import { getDashboardData } from "@/lib/data/orders";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import {
  getOrderStatusLabel,
  getProductStatusLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
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
  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const alertFilter = firstOf(params.alert);

  const [dashboard, alertCenter] = await Promise.all([
    getDashboardData(user.id),
    getAlertCenterData(user.id),
  ]);

  const hasSalesTrendData = dashboard.salesTrend.some((day) => day.value > 0);
  const maxTrendValue = Math.max(...dashboard.salesTrend.map((day) => day.value), 1);
  const topProductEstimatedProfits = dashboard.topProducts.map((product) => ({
    ...product,
    estimatedProfit: product.orders * product.estimatedMargin,
  }));
  const maxEstimatedProfit = Math.max(
    ...topProductEstimatedProfits.map((product) => product.estimatedProfit),
    1,
  );
  const filteredAlerts = alertCenter.alerts.filter((alert) => {
    if (!alertFilter) {
      return true;
    }

    return alert.severity === alertFilter || alert.category === alertFilter;
  });

  const dashboardMetrics = [
    {
      label: "Faturamento do dia",
      value: formatCurrency(dashboard.metrics.revenueToday),
      note: "Pedidos registrados hoje",
      accent: "teal" as const,
    },
    {
      label: "Faturamento do mes",
      value: formatCurrency(dashboard.metrics.revenueMonth),
      note: "Volume acumulado no periodo",
      accent: "blue" as const,
    },
    {
      label: "Lucro estimado",
      value: formatCurrency(dashboard.metrics.estimatedProfitMonth),
      note: "Receita e custos ajustados no financeiro",
      accent: "slate" as const,
    },
    {
      label: "Pedidos pendentes",
      value: `${dashboard.metrics.pendingOrdersCount}`,
      note: "Aguardando compra, envio ou entrega",
      accent: "amber" as const,
    },
    {
      label: "Pedidos com problema",
      value: `${dashboard.metrics.problemOrdersCount}`,
      note: "Casos que exigem tratativa",
      accent: "rose" as const,
    },
    {
      label: "Alertas ativos",
      value: `${alertCenter.summary.total}`,
      note: `${alertCenter.summary.high} de alta prioridade`,
      accent: alertCenter.summary.high > 0 ? ("rose" as const) : ("teal" as const),
    },
  ];

  const filterOptions = [
    { value: undefined, label: "Todos", count: alertCenter.summary.total },
    { value: "high", label: "Alta", count: alertCenter.summary.high },
    { value: "medium", label: "Media", count: alertCenter.summary.medium },
    { value: "low", label: "Baixa", count: alertCenter.summary.low },
    { value: "orders", label: "Pedidos", count: alertCenter.summary.orders },
    { value: "products", label: "Produtos", count: alertCenter.summary.products },
    { value: "suppliers", label: "Fornecedores", count: alertCenter.summary.suppliers },
    { value: "tasks", label: "Tarefas", count: alertCenter.summary.tasks },
    { value: "finance", label: "Financeiro", count: alertCenter.summary.finance },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Visao rapida da operacao: receita, lucro, pedidos sensiveis, tarefas do dia e alertas que pedem resposta imediata."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AppPanel title="Vendas por periodo" eyebrow="Visao comercial">
          {!hasSalesTrendData ? (
            <EmptyHint text="Ainda nao ha vendas suficientes para montar a curva da semana." />
          ) : (
            <div className="grid gap-4 md:grid-cols-7">
              {dashboard.salesTrend.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-3">
                  <div className="flex h-48 w-full items-end rounded-lg bg-slate-100 p-3">
                    <div
                      className="w-full rounded-md bg-slate-950"
                      style={{
                        height:
                          day.value === 0
                            ? "0%"
                            : `${Math.max((day.value / maxTrendValue) * 100, 6)}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{day.label}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(day.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel title="Centro de alertas" eyebrow="Motor do MVP">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                Alta
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{alertCenter.summary.high}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Media
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {alertCenter.summary.medium}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Baixa
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{alertCenter.summary.low}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {alertCenter.summary.total}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Link
                key={option.label}
                href={buildQueryString(params, { alert: option.value })}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  alertFilter === option.value || (!alertFilter && !option.value)
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-transparent bg-[var(--surface-container-low)] text-[var(--on-secondary-container)]"
                }`}
              >
                {option.label} ({option.count})
              </Link>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <EmptyHint text="Nenhum alerta ativo para esse filtro." />
            ) : (
              filteredAlerts.slice(0, 8).map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  category={alert.category}
                  severity={alert.severity}
                  href={alert.href}
                  actionLabel={alert.actionLabel}
                />
              ))
            )}
          </div>
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AppPanel title="Pedidos criticos" eyebrow="Acompanhar agora">
          {dashboard.criticalOrders.length === 0 ? (
            <EmptyHint text="Nenhum pedido em atraso ou problema no momento." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[680px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {dashboard.criticalOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/orders?edit=${order.id}`}
                          className="font-medium text-slate-900 transition hover:text-slate-600"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">{order.product.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          ETA {formatDate(order.estimatedDeliveryDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        <p>{order.customerName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(order.updatedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusPill label={getOrderStatusLabel(order.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppPanel>

        <AppPanel title="Tarefas do dia" eyebrow="Execucao operacional">
          {dashboard.tasksToday.length === 0 ? (
            <EmptyHint text="Nenhuma tarefa aberta com prazo para hoje." />
          ) : (
            <div className="space-y-3">
              {dashboard.tasksToday.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
                    <StatusPill label={getTaskPriorityLabel(task.priority)} />
                    <StatusPill label={getTaskStatusLabel(task.status)} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {task.description || "Sem descricao detalhada."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <span>{formatDateTime(task.dueDate)}</span>
                    <span>{task.assigneeName || "Sem responsavel"}</span>
                    {task.relatedOrder ? <span>Pedido {task.relatedOrder.orderNumber}</span> : null}
                    {task.relatedProduct ? <span>Produto {task.relatedProduct.name}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AppPanel title="Produtos com mais vendas" eyebrow="Top sellers">
          {dashboard.topProducts.length === 0 ? (
            <EmptyHint text="Os produtos mais vendidos vao aparecer aqui assim que os primeiros pedidos forem registrados." />
          ) : (
            <div className="space-y-4">
              {dashboard.topProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_140px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{product.name}</h3>
                      <StatusPill label={getProductStatusLabel(product.status)} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      SKU {product.sku} - {product.supplier}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Receita recente {formatCurrency(product.revenue)}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg bg-[var(--surface-container-low)] px-3 py-2">
                      <p className="text-slate-500">Pedidos</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{product.orders}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-container-low)] px-3 py-2">
                      <p className="text-slate-500">Margem unitaria</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {formatCurrency(product.estimatedMargin)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel title="Lucro por produto" eyebrow="Leitura rapida">
          {topProductEstimatedProfits.length === 0 ? (
            <EmptyHint text="O ranking de lucro aparece assim que houver pedidos suficientes para comparar produtos." />
          ) : (
            <div className="space-y-4">
              {topProductEstimatedProfits.map((product) => (
                <ProgressBar
                  key={product.id}
                  label={product.name}
                  value={formatCurrency(product.estimatedProfit)}
                  share={(product.estimatedProfit / maxEstimatedProfit) * 100}
                />
              ))}
            </div>
          )}
        </AppPanel>
      </section>
    </AppShell>
  );
}

