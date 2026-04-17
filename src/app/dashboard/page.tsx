import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  AppPanel,
  EmptyHint,
  MetricCard,
  ProgressBar,
  StatusPill,
} from "@/components/mvp-ui";
import { getDashboardData } from "@/lib/data/orders";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import {
  getOrderStatusLabel,
  getProductStatusLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/lib/options";
import { requireUser } from "@/lib/require-user";

export default async function DashboardPage() {
  const user = await requireUser();
  const dashboard = await getDashboardData(user.id);
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
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Visao rapida da operacao: receita, lucro, pedidos sensiveis, tarefas do dia e alertas que pedem resposta imediata."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
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

        <AppPanel title="Pedidos criticos" eyebrow="Acompanhar agora">
          {dashboard.criticalOrders.length === 0 ? (
            <EmptyHint text="Nenhum pedido em atraso ou problema no momento." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">Pedidos</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{product.orders}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
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
                    {task.relatedOrder ? (
                      <span>Pedido {task.relatedOrder.orderNumber}</span>
                    ) : null}
                    {task.relatedProduct ? <span>Produto {task.relatedProduct.name}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AppPanel title="Alertas recentes" eyebrow="Motor de regras">
          {dashboard.alerts.length === 0 ? (
            <EmptyHint text="Nenhum alerta ativo agora. O painel segue de olho nos desvios operacionais." />
          ) : (
            <div className="space-y-3">
              {dashboard.alerts.map((alert) => (
                <div
                  key={alert}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                >
                  {alert}
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
