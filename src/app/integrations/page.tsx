import { SalesChannelStatus } from "@prisma/client";
import { disconnectTikTokShop, syncTikTokShop } from "@/app/integrations/actions";
import { AppShell } from "@/components/app-shell";
import { AppPanel, EmptyHint, MetricCard, NoticeBanner } from "@/components/mvp-ui";
import { getTikTokConnectionByUser } from "@/lib/data/integrations";
import { formatDateTime } from "@/lib/formatters";
import { getTikTokShopConfig } from "@/lib/integrations/tiktok/config";
import { requireUser } from "@/lib/require-user";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStatusCopy(status: SalesChannelStatus | undefined) {
  switch (status) {
    case SalesChannelStatus.ACTIVE:
      return {
        label: "Conectado",
        className:
          "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
      };
    case SalesChannelStatus.ERROR:
      return {
        label: "Erro",
        className: "bg-[color:rgba(159,64,61,0.12)] text-[var(--error)]",
      };
    case SalesChannelStatus.DISCONNECTED:
      return {
        label: "Desconectado",
        className: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
      };
    default:
      return {
        label: "Pendente",
        className: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
      };
  }
}

export default async function IntegrationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const [connection, config] = await Promise.all([
    getTikTokConnectionByUser(user.id),
    Promise.resolve(getTikTokShopConfig()),
  ]);
  const statusCopy = getStatusCopy(connection?.status);
  const connectionReady = connection?.status === SalesChannelStatus.ACTIVE;

  const metrics = [
    {
      label: "Status da conta",
      value: statusCopy.label,
      note: connection?.shopName ?? connection?.displayName ?? "TikTok Shop",
      accent: "teal" as const,
    },
    {
      label: "Produtos vinculados",
      value: `${connection?._count.productLinks ?? 0}`,
      note: "Produtos internos associados ao catalogo",
      accent: "blue" as const,
    },
    {
      label: "Pedidos vinculados",
      value: `${connection?._count.orderLinks ?? 0}`,
      note: "Pedidos internos ligados ao TikTok Shop",
      accent: "amber" as const,
    },
    {
      label: "Ultima sincronizacao",
      value: connection?.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : "Ainda nao",
      note: connection?.lastWebhookAt
        ? `Webhook visto em ${formatDateTime(connection.lastWebhookAt)}`
        : "Aguardando primeira atividade",
      accent: "slate" as const,
    },
  ];

  return (
    <AppShell
      title="Integracoes"
      description="Conecte o TikTok Shop para puxar catalogo, pedidos e atualizacoes automaticas em uma area pensada para operacao real."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppPanel title="TikTok Shop" eyebrow="Canal conectado">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[28px] border border-[color:rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(41,232,171,0.20)_0%,rgba(17,24,39,0.04)_35%,rgba(255,255,255,0.96)_68%),linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(17,24,39,0.92)_42%,rgba(240,253,250,0.96)_100%)] p-6 shadow-[0_26px_60px_rgba(15,23,42,0.16)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-100/72">
                    Social commerce bridge
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
                    {connection?.shopName || "TikTok Shop"}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                    Um hub para conectar sua loja, sincronizar produtos e pedidos, e manter
                    o app alinhado com o que acontece no canal.
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${statusCopy.className}`}
                >
                  {statusCopy.label}
                </span>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">
                    Shop ID
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {connection?.shopId || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">
                    Regiao
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {connection?.shopRegion || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">
                    Produtos linkados
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {connection?._count.productLinks ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">
                    Pedidos linkados
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {connection?._count.orderLinks ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/api/integrations/tiktok/connect"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(255,255,255,0.14)]"
                >
                  {connectionReady ? "Reconectar conta" : "Conectar TikTok Shop"}
                </a>

                <form action={disconnectTikTokShop}>
                  <button
                    type="submit"
                    className="rounded-xl border border-white/24 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur"
                  >
                    Desconectar
                  </button>
                </form>
              </div>
            </div>

            {connection?.lastError ? (
              <div className="rounded-xl border border-[color:rgba(179,63,58,0.16)] bg-[color:rgba(255,216,214,0.72)] px-4 py-4 text-sm text-[var(--error)]">
                <p className="font-semibold">Ultimo erro registrado</p>
                <p className="mt-2 leading-6">{connection.lastError}</p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <form action={syncTikTokShop} className="rounded-2xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="type" value="full" />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Sincronizacao completa
                </p>
                <h4 className="mt-2 text-base font-bold text-slate-950">Produtos + pedidos</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Atualiza catalogo, cria produtos faltantes e traz pedidos para o sistema.
                </p>
                <button
                  type="submit"
                  disabled={!connectionReady || (!config.canSyncProducts && !config.canSyncOrders)}
                  className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Sincronizar tudo
                </button>
              </form>

              <form action={syncTikTokShop} className="rounded-2xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="type" value="products" />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Catalogo
                </p>
                <h4 className="mt-2 text-base font-bold text-slate-950">Somente produtos</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Usa SKU e titulo para reconciliar o catalogo com seus produtos internos.
                </p>
                <button
                  type="submit"
                  disabled={!connectionReady || !config.canSyncProducts}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Sincronizar produtos
                </button>
              </form>

              <form action={syncTikTokShop} className="rounded-2xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="type" value="orders" />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Operacao
                </p>
                <h4 className="mt-2 text-base font-bold text-slate-950">Somente pedidos</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Cria ou atualiza pedidos, tenta ligar produto e registra taxas quando existirem.
                </p>
                <button
                  type="submit"
                  disabled={!connectionReady || !config.canSyncOrders}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Sincronizar pedidos
                </button>
              </form>
            </div>
          </div>
        </AppPanel>

        <div className="space-y-6">
          <AppPanel title="Configuracao" eyebrow="Ambiente do app">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-xl bg-[var(--surface-container-low)] px-4 py-4">
                <p className="font-semibold text-slate-950">Status da configuracao</p>
                <p className="mt-2">
                  {config.missingConnectionFields.length === 0
                    ? "Credenciais basicas do TikTok Shop preenchidas."
                    : `Ainda faltam: ${config.missingConnectionFields.join(", ")}.`}
                </p>
                <p className="mt-2">
                  {config.missingSyncFields.length === 0
                    ? "Os caminhos de sincronizacao ja foram definidos."
                    : `Para sync completo ainda faltam: ${config.missingSyncFields.join(", ")}.`}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <p className="font-semibold text-slate-950">Callback OAuth</p>
                <p className="mt-2 break-all text-slate-500">
                  {config.redirectUri || "Defina APP_URL para exibir a URL final do callback aqui."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <p className="font-semibold text-slate-950">Webhook</p>
                <p className="mt-2 break-all text-slate-500">
                  {config.webhookUrl || "Defina APP_URL para exibir a URL final do webhook aqui."}
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <p className="font-semibold text-slate-950">Observacao importante</p>
                <p className="mt-2 leading-6 text-slate-500">
                  Como o TikTok Shop exige app autorizado e detalhes do Partner Center, a base
                  ja esta pronta no sistema, mas voce ainda precisa preencher as variaveis do
                  ambiente com os endpoints e credenciais da sua conta.
                </p>
              </div>
            </div>
          </AppPanel>

          <AppPanel title="Historico de sync" eyebrow="Ultimas execucoes">
            {connection?.syncRuns.length ? (
              <div className="space-y-3">
                {connection.syncRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {run.type === "FULL"
                          ? "Sincronizacao completa"
                          : run.type === "PRODUCTS"
                            ? "Produtos"
                            : run.type === "ORDERS"
                              ? "Pedidos"
                              : "Webhook"}
                      </p>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{run.summary || "-"}</p>
                    <p className="mt-3 text-xs text-slate-400">
                      {formatDateTime(run.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint text="As execucoes de sincronizacao vao aparecer aqui assim que voce conectar a conta e rodar o primeiro sync." />
            )}
          </AppPanel>
        </div>
      </section>
    </AppShell>
  );
}
