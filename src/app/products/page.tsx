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
              className="min-w-0 flex-1 rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
            />
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
            >
              Buscar
            </button>
            {(query || statusFilter || editId) && (
              <Link
                href="/products"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
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
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                !statusFilter
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-transparent bg-[var(--surface-container-low)] text-[var(--on-secondary-container)]"
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
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  statusFilter === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-transparent bg-[var(--surface-container-low)] text-[var(--on-secondary-container)]"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
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
              className="signature-gradient rounded-md px-4 py-2 text-sm font-medium text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.14)]"
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
              <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
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
                    <tr key={product.id}>
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={buildQueryString(params, {
                            edit: product.id,
                            success: undefined,
                            error: undefined,
                          })}
                          className="block rounded-lg transition hover:bg-slate-50"
                        >
                          <p className="font-medium text-slate-950">{product.name}</p>
                          <p className="mt-1 text-slate-500">
                            {product.category || "Sem categoria"} - {product.sku}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {product._count.orders} pedidos - {product._count.tasks} tarefas
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{product.supplier.name}</td>
                      <td className="px-4 py-4 text-slate-600">{formatCurrency(product.salePrice)}</td>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {formatCurrency(product.estimatedMargin)}
                      </td>
                      <td className="px-4 py-4">
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

              <label className="col-span-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Nome do produto
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedProduct?.name ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">SKU interno</span>
                <input
                  type="text"
                  name="sku"
                  required
                  defaultValue={selectedProduct?.sku ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Categoria</span>
                <input
                  type="text"
                  name="category"
                  defaultValue={selectedProduct?.category ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label className="col-span-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">Fornecedor</span>
                <select
                  name="supplierId"
                  required
                  defaultValue={selectedProduct?.supplierId ?? supplierOptions[0]?.id}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                >
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">Link da loja</span>
                <input
                  type="url"
                  name="storeLink"
                  defaultValue={selectedProduct?.storeLink ?? ""}
                  placeholder="https://sualoja.com/produto"
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label className="col-span-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do fornecedor
                </span>
                <input
                  type="url"
                  name="supplierLink"
                  defaultValue={selectedProduct?.supplierLink ?? ""}
                  placeholder="https://fornecedor.com/item"
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Custo do produto
                </span>
                <input
                  type="number"
                  name="costPrice"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.costPrice.toString() ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Custo do frete
                </span>
                <input
                  type="number"
                  name="shippingCost"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.shippingCost.toString() ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Preco de venda
                </span>
                <input
                  type="number"
                  name="salePrice"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selectedProduct?.salePrice.toString() ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select
                  name="status"
                  required
                  defaultValue={selectedProduct?.status ?? ProductStatus.TESTING}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                >
                  {productStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Observacoes
                </span>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={selectedProduct?.notes ?? ""}
                  className="w-full rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-3 text-sm text-slate-900 outline-none ring-0"
                />
              </label>

              <div className="col-span-full rounded-lg bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
                A margem estimada e recalculada automaticamente com base em preco de
                venda - custo do produto - custo do frete.
              </div>

              <div className="col-span-full flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="signature-gradient rounded-lg px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.18)]"
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
                      className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      Novo cadastro
                    </Link>
                    <button
                      type="submit"
                      formAction={removeProduct}
                      className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
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

