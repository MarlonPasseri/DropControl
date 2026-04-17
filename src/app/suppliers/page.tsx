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
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Buscar
            </button>
            {(query || editId) && (
              <Link
                href="/suppliers"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
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
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Novo fornecedor
          </Link>
        </div>
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
                  className="block rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
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
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                      <p className="text-slate-500">Prazo medio</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier.avgShippingDays ?? 0} dias
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                      <p className="text-slate-500">Produtos vinculados</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier._count.products}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                      <p className="text-slate-500">Pedidos em aberto</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {supplier._count.orders}
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

            <label className="col-span-full">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome do fornecedor
              </span>
              <input
                type="text"
                name="name"
                required
                defaultValue={selectedSupplier?.name ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Contato</span>
              <input
                type="text"
                name="contactName"
                defaultValue={selectedSupplier?.contactName ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Canal</span>
              <select
                name="contactChannel"
                defaultValue={selectedSupplier?.contactChannel ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Pais / regiao
              </span>
              <input
                type="text"
                name="region"
                defaultValue={selectedSupplier?.region ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Prazo medio de envio
              </span>
              <input
                type="number"
                name="avgShippingDays"
                min="0"
                step="1"
                defaultValue={selectedSupplier?.avgShippingDays ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nota de confianca
              </span>
              <input
                type="number"
                name="reliabilityScore"
                min="0"
                max="5"
                step="0.1"
                defaultValue={selectedSupplier?.reliabilityScore?.toString() ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="col-span-full">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Taxa de problema
              </span>
              <input
                type="number"
                name="issueRate"
                min="0"
                step="0.1"
                defaultValue={selectedSupplier?.issueRate?.toString() ?? ""}
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
                defaultValue={selectedSupplier?.notes ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <div className="col-span-full flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
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
                    className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Novo cadastro
                  </Link>
                  <button
                    type="submit"
                    formAction={removeSupplier}
                    className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
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
