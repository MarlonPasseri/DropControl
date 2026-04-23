import Link from "next/link";
import { saveSupplier, removeSupplier } from "@/app/suppliers/actions";
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
  getSupplierById,
  getSupplierMetrics,
  getSuppliersByUser,
} from "@/lib/data/suppliers";
import { formatPercent, formatRating } from "@/lib/formatters";
import {
  contactChannelOptions,
  getContactChannelLabel,
} from "@/lib/options";
import { parsePageParam, paginateItems } from "@/lib/pagination";
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
  return query ? `/suppliers?${query}` : "/suppliers";
}

const inputClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] focus:border-[var(--primary)]";
const selectClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-[var(--primary)]";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

export default async function SuppliersPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);

  const [metrics, suppliers, selectedSupplier] = await Promise.all([
    getSupplierMetrics(user.id),
    getSuppliersByUser(user.id, {
      query: query || undefined,
    }),
    editId ? getSupplierById(user.id, editId) : Promise.resolve(null),
  ]);
  const paginatedSuppliers = paginateItems(suppliers, page, 6);

  const supplierMetrics = [
    {
      label: "Fornecedores ativos",
      value: `${metrics.activeCount}`,
      note: "Parceiros cadastrados",
      accent: "teal" as const,
    },
    {
      label: "Confianca media",
      value: metrics.activeCount ? formatRating(metrics.reliabilityAverage) : "0,0",
      note: "Escala de 1 a 5",
      accent: "blue" as const,
    },
    {
      label: "Taxa media de problema",
      value: metrics.activeCount ? formatPercent(metrics.issueAverage) : "0,0%",
      note: "Indicador operacional",
      accent: "amber" as const,
    },
    {
      label: "Acima do alvo",
      value: `${metrics.aboveTargetCount}`,
      note: "Prazo ou incidencia acima do ideal",
      accent: "rose" as const,
    },
  ];

  return (
    <AppShell
      title="Fornecedores"
      description="Cadastro real de fornecedores com desempenho, canal de contato e vinculo com os produtos operados."
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AppPanel title="Radar de fornecedores" eyebrow="Saude da rede">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                  Qualidade da operacao
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {query
                    ? `Busca ativa por "${query}".`
                    : "Mantenha esta base limpa para comparar confianca, prazo e incidencia de problema entre parceiros."}
                  {selectedSupplier
                    ? ` Edicao em andamento para ${selectedSupplier.name}.`
                    : " Formulario pronto para novos parceiros."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/products"
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver catalogo
                </Link>
                <Link
                  href="/orders"
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Rever pedidos
                </Link>
                <Link
                  href="/invoices"
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ir para fiscal
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Ativos</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.activeCount}</p>
                <p className="mt-1 text-xs text-slate-500">Parceiros com uso recorrente</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Acima do alvo</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.aboveTargetCount}</p>
                <p className="mt-1 text-xs text-slate-500">Prazo ou incidencia acima do ideal</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Formulario</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selectedSupplier ? selectedSupplier.name : "Novo fornecedor"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSupplier ? "Atualize contato, canal e desempenho" : "Pronto para expandir a base"}
                </p>
              </div>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Atalhos de relacionamento" eyebrow="Acoes do dia">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-lg bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-[var(--on-primary)] shadow-[0_16px_36px_rgba(23,107,99,0.22)] hover:bg-[var(--primary-dim)]"
            >
              Novo fornecedor
            </Link>
            <Link
              href="/products"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Vincular produtos
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Conferir pedidos
            </Link>
            <Link
              href="/tasks"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Abrir tarefas
            </Link>
          </div>
        </AppPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {supplierMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Busca" eyebrow="Base de fornecedores">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex flex-1 flex-col gap-3 sm:flex-row" action="/suppliers">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por nome, contato ou regiao"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
            >
              Buscar
            </button>
            {(query || editId) && (
              <Link
                href="/suppliers"
                className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Limpar
              </Link>
            )}
          </form>

          <Link
            href={buildQueryString(params, {
              edit: undefined,
              success: undefined,
              error: undefined,
            })}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--primary-dim)]"
          >
            Novo fornecedor
          </Link>
        </div>

        {query ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
              Busca: {query}
            </span>
          </div>
        ) : null}
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AppPanel title="Lista de fornecedores" eyebrow="Desempenho operacional">
          {suppliers.length === 0 ? (
            <EmptyHint text="Nenhum fornecedor encontrado. Crie o primeiro para comecar o cadastro dos produtos." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="fornecedores"
                startIndex={paginatedSuppliers.startIndex}
                endIndex={paginatedSuppliers.endIndex}
                totalItems={paginatedSuppliers.totalItems}
              />
              {paginatedSuppliers.items.map((supplier) => (
                <Link
                  key={supplier.id}
                  href={buildQueryString(params, {
                    edit: supplier.id,
                    success: undefined,
                    error: undefined,
                  })}
                  className="block rounded-lg border border-[var(--outline-variant)] bg-white p-4 transition hover:border-[var(--primary)] hover:bg-[var(--surface-container-low)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">{supplier.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {getContactChannelLabel(supplier.contactChannel)} - {supplier.region || "Sem regiao"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        label={`${formatRating(supplier.reliabilityScore ?? 0)} / 5`}
                      />
                      <StatusPill label={formatPercent(supplier.issueRate ?? 0)} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3 py-3 text-sm">
                      <p className="text-slate-500">Prazo medio</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier.avgShippingDays ?? 0} dias
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3 py-3 text-sm">
                      <p className="text-slate-500">Produtos vinculados</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier._count.products}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3 py-3 text-sm">
                      <p className="text-slate-500">Pedidos em aberto</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier._count.orders}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3 py-3 text-sm">
                      <p className="text-slate-500">Notas fiscais</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier._count.invoices}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {supplier.notes || "Sem observacoes registradas."}
                  </p>
                </Link>
              ))}
              <PaginationControls
                page={paginatedSuppliers.page}
                totalPages={paginatedSuppliers.totalPages}
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
          title={selectedSupplier ? "Editar fornecedor" : "Novo fornecedor"}
          eyebrow="Formulario real"
        >
          <form action={saveSupplier} className="grid gap-4 md:grid-cols-2">
            {selectedSupplier ? <input type="hidden" name="id" value={selectedSupplier.id} /> : null}

            <div className="col-span-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-slate-700">
              {selectedSupplier ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-950">
                    Editando {selectedSupplier.name}
                  </span>
                  <StatusPill
                    label={`${formatRating(selectedSupplier.reliabilityScore ?? 0)} / 5`}
                  />
                  <span className="text-xs text-slate-500">
                    Problema medio {formatPercent(selectedSupplier.issueRate ?? 0)}
                  </span>
                </div>
              ) : (
                <p>
                  Registre canal de contato, regiao e desempenho esperado. Isso ajuda a comparar
                  parceiros e a priorizar onde comprar cada produto.
                </p>
              )}
            </div>

            <label className="col-span-full">
              <span className={labelClass}>Nome do fornecedor</span>
              <input
                type="text"
                name="name"
                required
                defaultValue={selectedSupplier?.name ?? ""}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Contato</span>
              <input
                type="text"
                name="contactName"
                defaultValue={selectedSupplier?.contactName ?? ""}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Canal</span>
              <select
                name="contactChannel"
                defaultValue={selectedSupplier?.contactChannel ?? ""}
                className={selectClass}
              >
                <option value="">Selecione</option>
                {contactChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="col-span-full">
              <span className={labelClass}>Pais / regiao</span>
              <input
                type="text"
                name="region"
                defaultValue={selectedSupplier?.region ?? ""}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Prazo medio de envio</span>
              <input
                type="number"
                name="avgShippingDays"
                min="0"
                step="1"
                defaultValue={selectedSupplier?.avgShippingDays ?? ""}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Nota de confianca</span>
              <input
                type="number"
                name="reliabilityScore"
                min="0"
                max="5"
                step="0.1"
                defaultValue={selectedSupplier?.reliabilityScore?.toString() ?? ""}
                className={inputClass}
              />
            </label>

            <label className="col-span-full">
              <span className={labelClass}>Taxa de problema</span>
              <input
                type="number"
                name="issueRate"
                min="0"
                step="0.1"
                defaultValue={selectedSupplier?.issueRate?.toString() ?? ""}
                className={inputClass}
              />
            </label>

            <label className="col-span-full">
              <span className={labelClass}>Observacoes</span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={selectedSupplier?.notes ?? ""}
                className={inputClass}
              />
            </label>

            <div className="col-span-full flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
              >
                {selectedSupplier ? "Salvar alteracoes" : "Criar fornecedor"}
              </button>

              {selectedSupplier ? (
                <>
                  <Link
                    href={buildQueryString(params, {
                      edit: undefined,
                      success: undefined,
                      error: undefined,
                    })}
                    className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    Novo cadastro
                  </Link>
                  <button
                    type="submit"
                    formAction={removeSupplier}
                    className="rounded-lg border border-[var(--error-container)] bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:border-[var(--error)]"
                  >
                    Excluir fornecedor
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

