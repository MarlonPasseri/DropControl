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

function HealthPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warning" | "critical";
}) {
  const className =
    tone === "good"
      ? "bg-[var(--success-container)] text-[var(--success)]"
      : tone === "warning"
        ? "bg-[var(--warning-container)] text-[var(--on-tertiary-container)]"
        : "bg-[var(--error-container)] text-[var(--error)]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
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
      accent: "teal" as const,
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
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-[var(--outline-variant)] bg-[linear-gradient(150deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.92)_46%,rgba(23,107,99,0.82)_100%)] px-6 py-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.24)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Mesa de controle
              </p>
              <h3 className="mt-3 font-headline text-3xl font-extrabold tracking-tight">
                O que pede resposta agora
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/78">
                Use este resumo para atacar gargalos primeiro, fechar pendencias do dia e seguir
                para os modulos com contexto.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <HealthPill
                label={`${alertCenter.summary.high} alertas de alta`}
                tone={alertCenter.summary.high > 0 ? "critical" : "good"}
              />
              <HealthPill
                label={`${dashboard.metrics.pendingOrdersCount} pedidos em fluxo`}
                tone={dashboard.metrics.pendingOrdersCount > 0 ? "warning" : "good"}
              />
              <HealthPill
                label={`${dashboard.tasksToday.length} tarefas priorizadas`}
                tone={dashboard.tasksToday.length > 0 ? "warning" : "good"}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/62">
                Leitura imediata
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-white/60">Faturamento do dia</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {formatCurrency(dashboard.metrics.revenueToday)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Lucro do mes</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {formatCurrency(dashboard.metrics.estimatedProfitMonth)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Pedidos com problema</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {dashboard.metrics.problemOrdersCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/62">
                Atalhos de execucao
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { href: "/orders", label: "Pedidos" },
                  { href: "/tasks", label: "Tarefas" },
                  { href: "/finance", label: "Financeiro" },
                  { href: "/products", label: "Produtos" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/14"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <AppPanel title="Fila do dia" eyebrow="Prioridades operacionais">
          {dashboard.alerts.length === 0 ? (
            <EmptyHint text="Sem alertas sinteticos no momento. O fluxo parece sob controle." />
          ) : (
            <div className="space-y-3">
              {dashboard.alerts.map((alert, index) => (
                <div
                  key={`${alert}-${index}`}
                  className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-container-low)] text-xs font-bold text-slate-700">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{alert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppPanel title="Vendas por periodo" eyebrow="Visao comercial">
          {!hasSalesTrendData ? (
            <EmptyHint text="Ainda nao ha vendas suficientes para montar a curva da semana." />
          ) : (
            <div className="grid gap-4 md:grid-cols-7">
              {dashboard.salesTrend.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-3">
                  <div className="flex h-48 w-full items-end rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-3">
                    <div
                      className="w-full rounded-md bg-[var(--primary)]"
                      style={{
                        height:
                          day.value === 0
                            ? "0%"
                            : `${Math.max((day.value / maxTrendValue) * 100, 6)}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium capitalize text-slate-700">{day.label}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(day.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel title="Centro de alertas" eyebrow="Motor do MVP">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--outline-variant)] border-l-4 border-l-[var(--error)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Alta</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {alertCenter.summary.high}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--outline-variant)] border-l-4 border-l-[var(--warning)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Media</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {alertCenter.summary.medium}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--outline-variant)] border-l-4 border-l-[var(--primary)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Baixa</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{alertCenter.summary.low}</p>
            </div>
            <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Total</p>
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
                className={`rounded-full border px-3 py-2 text-sm font-medium ${
                  alertFilter === option.value || (!alertFilter && !option.value)
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-[var(--outline-variant)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
            <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
              <table className="min-w-[680px] divide-y divide-slate-200 text-sm">
                <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {dashboard.criticalOrders.map((order) => (
                    <tr key={order.id} className="odd:bg-white even:bg-slate-50/55">
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
                <div
                  key={task.id}
                  className="rounded-lg border border-[var(--outline-variant)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                >
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
                  className="grid gap-4 rounded-lg border border-[var(--outline-variant)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] md:grid-cols-[minmax(0,1fr)_140px]"
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
