import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import { saveProduct, removeProduct } from "@/app/products/actions";
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
import { formatCurrency } from "@/lib/formatters";
import {
  getProductById,
  getProductMetrics,
  getProductsByUser,
} from "@/lib/data/products";
import { parsePageParam, paginateItems } from "@/lib/pagination";
import { getSupplierOptions } from "@/lib/data/suppliers";
import {
  getProductStatusLabel,
  productStatusOptions,
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
  return query ? `/products?${query}` : "/products";
}

const inputClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] focus:border-[var(--primary)]";
const selectClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-[var(--primary)]";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

export default async function ProductsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const statusParam = firstOf(params.status);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);
  const statusFilter = productStatusOptions.some((option) => option.value === statusParam)
    ? (statusParam as ProductStatus)
    : undefined;

  const [metrics, products, supplierOptions, selectedProduct] = await Promise.all([
    getProductMetrics(user.id),
    getProductsByUser(user.id, {
      query: query || undefined,
      status: statusFilter,
    }),
    getSupplierOptions(user.id),
    editId ? getProductById(user.id, editId) : Promise.resolve(null),
  ]);
  const paginatedProducts = paginateItems(products, page);

  const productMetrics = [
    {
      label: "Produtos ativos",
      value: `${metrics.activeCount}`,
      note: "Status ativo hoje",
      accent: "teal" as const,
    },
    {
      label: "Produtos vencedores",
      value: `${metrics.winnerCount}`,
      note: "Base com melhor desempenho",
      accent: "blue" as const,
    },
    {
      label: "Margem baixa",
      value: `${metrics.lowMarginCount}`,
      note: "Abaixo de R$ 40",
      accent: "rose" as const,
    },
    {
      label: "Ticket medio",
      value: formatCurrency(metrics.averageSalePrice),
      note: "Preco medio de venda",
      accent: "amber" as const,
    },
  ];

  return (
    <AppShell
      title="Produtos"
      description="Cadastro real de produtos com margem calculada, filtro por status e vinculo com fornecedores da conta logada."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppPanel title="Radar de produtos" eyebrow="Leitura do catalogo">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                  Curadoria do catalogo
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {statusFilter
                    ? `Voce esta olhando a faixa ${getProductStatusLabel(statusFilter).toLowerCase()}.`
                    : "Use esta base para priorizar produtos ativos, proteger margem e manter fornecedores bem vinculados."}
                  {query ? ` Busca ativa: "${query}".` : ""}
                  {selectedProduct
                    ? ` Edicao em andamento para ${selectedProduct.name}.`
                    : " Formulario pronto para novos cadastros."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildQueryString(params, {
                    status: ProductStatus.ACTIVE,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver ativos
                </Link>
                <Link
                  href={buildQueryString(params, {
                    status: ProductStatus.WINNER,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver vencedores
                </Link>
                <Link
                  href={buildQueryString(params, {
                    status: ProductStatus.PAUSED,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver pausados
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Ativos</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.activeCount}</p>
                <p className="mt-1 text-xs text-slate-500">Produtos em operacao agora</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Margem baixa</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.lowMarginCount}</p>
                <p className="mt-1 text-xs text-slate-500">Abaixo de R$ 40 estimados</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Formulario</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selectedProduct ? selectedProduct.name : "Novo produto"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedProduct ? "Revise precos, links e status" : "Pronto para ampliar o catalogo"}
                </p>
              </div>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Fluxo rapido" eyebrow="Acoes recorrentes">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-lg bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-[var(--on-primary)] shadow-[0_16px_36px_rgba(23,107,99,0.22)] hover:bg-[var(--primary-dim)]"
            >
              Novo produto
            </Link>
            <Link
              href="/suppliers"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Rever fornecedores
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Ver pedidos ligados
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
        {productMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtro rapido" eyebrow="Gestao do catalogo">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex flex-1 flex-col gap-3 sm:flex-row" action="/products">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por nome, SKU ou categoria"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
            >
              Buscar
            </button>
            {(query || statusFilter || editId) && (
              <Link
                href="/products"
                className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Limpar
              </Link>
            )}
          </form>

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
            {productStatusOptions.map((option) => (
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

        {(query || statusFilter) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {query ? (
              <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                Busca: {query}
              </span>
            ) : null}
            {statusFilter ? (
              <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                Status: {getProductStatusLabel(statusFilter)}
              </span>
            ) : null}
          </div>
        )}
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <AppPanel
          title="Base de produtos"
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
              Novo produto
            </Link>
          }
        >
          {products.length === 0 ? (
            <EmptyHint text="Nenhum produto encontrado. Crie o primeiro cadastro para alimentar pedidos e tarefas." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="produtos"
                startIndex={paginatedProducts.startIndex}
                endIndex={paginatedProducts.endIndex}
                totalItems={paginatedProducts.totalItems}
              />
              <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
                <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Produto</th>
                      <th className="px-4 py-3 font-medium">Fornecedor</th>
                      <th className="px-4 py-3 font-medium">Preco</th>
                      <th className="px-4 py-3 font-medium">Margem</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedProducts.items.map((product) => (
                      <tr
                        key={product.id}
                        className="odd:bg-white even:bg-slate-50/55 hover:bg-[var(--surface-container-low)]"
                      >
                        <td className="px-4 py-4 align-top">
                          <Link
                            href={buildQueryString(params, {
                              edit: product.id,
                              success: undefined,
                              error: undefined,
                            })}
                            className="block rounded-lg transition hover:text-[var(--primary)]"
                          >
                            <p className="font-medium text-slate-950">{product.name}</p>
                            <p className="mt-1 text-slate-500">
                              {product.category || "Sem categoria"} - {product.sku}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                {product._count.orders} pedidos
                              </span>
                              <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                {product._count.tasks} tarefas
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p>{product.supplier.name}</p>
                          <p className="mt-1 text-xs text-slate-400">Parceiro vinculado</p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(product.salePrice)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Ticket de venda
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(product.estimatedMargin)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Custo + frete descontados
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={getProductStatusLabel(product.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={paginatedProducts.page}
                totalPages={paginatedProducts.totalPages}
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
          title={selectedProduct ? "Editar produto" : "Novo produto"}
          eyebrow="Formulario real"
        >
          {supplierOptions.length === 0 ? (
            <EmptyHint text="Cadastre pelo menos um fornecedor antes de criar produtos." />
          ) : (
            <form action={saveProduct} className="grid gap-4 md:grid-cols-2">
              {selectedProduct ? <input type="hidden" name="id" value={selectedProduct.id} /> : null}

              <div className="col-span-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-slate-700">
                {selectedProduct ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-950">
                      Editando {selectedProduct.name}
                    </span>
                    <StatusPill label={getProductStatusLabel(selectedProduct.status)} />
                    <span className="text-xs text-slate-500">
                      Margem atual {formatCurrency(selectedProduct.estimatedMargin)}
                    </span>
                  </div>
                ) : (
                  <p>
                    Comece pelo essencial: nome, SKU, fornecedor e precos. O app recalcula a
                    margem estimada automaticamente para voce decidir o status certo do produto.
                  </p>
                )}
              </div>

              <label className="col-span-full">
                <span className={labelClass}>Nome do produto</span>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedProduct?.name ?? ""}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>SKU interno</span>
                <input
                  type="text"
                  name="sku"
                  required
                  defaultValue={selectedProduct?.sku ?? ""}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Categoria</span>
                <input
                  type="text"
                  name="category"
                  defaultValue={selectedProduct?.category ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="col-span-full">
                <span className={labelClass}>Fornecedor</span>
                <select
                  name="supplierId"
                  required
                  defaultValue={selectedProduct?.supplierId ?? supplierOptions[0]?.id}
                  className={selectClass}
                >
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-full">
                <span className={labelClass}>Link da loja</span>
                <input
                  type="url"
                  name="storeLink"
                  defaultValue={selectedProduct?.storeLink ?? ""}
                  placeholder="https://sualoja.com/produto"
                  className={inputClass}
                />
              </label>

              <label className="col-span-full">
                <span className={labelClass}>Link do fornecedor</span>
                <input
                  type="url"
                  name="supplierLink"
                  defaultValue={selectedProduct?.supplierLink ?? ""}
                  placeholder="https://fornecedor.com/item"
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Custo do produto</span>
                <input
                  type="number"
                  name="costPrice"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.costPrice.toString() ?? ""}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Custo do frete</span>
                <input
                  type="number"
                  name="shippingCost"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.shippingCost.toString() ?? ""}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Preco de venda</span>
                <input
                  type="number"
                  name="salePrice"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.salePrice.toString() ?? ""}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Status</span>
                <select
                  name="status"
                  required
                  defaultValue={selectedProduct?.status ?? ProductStatus.TESTING}
                  className={selectClass}
                >
                  {productStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-full">
                <span className={labelClass}>Observacoes</span>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={selectedProduct?.notes ?? ""}
                  className={inputClass}
                />
              </label>

              <div className="col-span-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
                A margem estimada e recalculada automaticamente com base em preco de
                venda - custo do produto - custo do frete.
              </div>

              <div className="col-span-full flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
                >
                  {selectedProduct ? "Salvar alteracoes" : "Criar produto"}
                </button>

                {selectedProduct ? (
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
                      formAction={removeProduct}
                      className="rounded-lg border border-[var(--error-container)] bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:border-[var(--error)]"
                    >
                      Excluir produto
                    </button>
                  </>
                ) : null}
              </div>
            </form>
          )}
        </AppPanel>
      </section>
    </AppShell>
  );
}

