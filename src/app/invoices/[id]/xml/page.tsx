import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InvoiceXmlViewer } from "@/components/invoice-xml-viewer";
import { AppPanel, EmptyHint, StatusPill } from "@/components/mvp-ui";
import { getInvoiceById } from "@/lib/data/invoices";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { getInvoiceStatusLabel, getInvoiceTypeLabel } from "@/lib/options";
import { requireUser } from "@/lib/require-user";

function buildTag(label: string, value: string) {
  return (
    <div className="rounded-lg bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(31,45,40,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function InvoiceXmlPage(props: PageProps<"/invoices/[id]/xml">) {
  const user = await requireUser();
  const { id } = await props.params;
  const invoice = await getInvoiceById(user.id, id);

  if (!invoice) {
    notFound();
  }

  return (
    <AppShell
      title={`XML da NF ${invoice.number}${invoice.series ? ` / ${invoice.series}` : ""}`}
      description="Visualizacao dedicada do XML original armazenado, com contexto fiscal da nota e leitura completa do documento."
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AppPanel
          title="Resumo da nota"
          eyebrow="Contexto fiscal"
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/invoices"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Voltar para notas
              </Link>
              <Link
                href={`/invoices?edit=${invoice.id}`}
                className="signature-gradient rounded-md px-4 py-2 text-sm font-medium text-[var(--on-primary)] shadow-[0_12px_30px_rgba(86,94,116,0.14)]"
              >
                Abrir cadastro
              </Link>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--surface-container-highest)] bg-[linear-gradient(145deg,rgba(18,94,87,0.96)_0%,rgba(41,120,112,0.92)_100%)] p-5 text-white shadow-[0_24px_48px_rgba(25,89,84,0.2)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                    Documento armazenado
                  </p>
                  <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-tight">
                    NF {invoice.number}
                    {invoice.series ? ` / ${invoice.series}` : ""}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/82">
                    Use esta página para consultar o XML bruto da nota fiscal com uma
                    leitura mais confortável e todos os dados do documento preservados.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={getInvoiceTypeLabel(invoice.type)} />
                  <StatusPill label={getInvoiceStatusLabel(invoice.status)} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {buildTag("Emissao", formatDateTime(invoice.issueDate))}
              {buildTag("Vencimento", formatDateTime(invoice.dueDate))}
              {buildTag("Valor total", formatCurrency(invoice.amount))}
              {buildTag("Tributos", formatCurrency(invoice.taxAmount ?? 0))}
              {buildTag("Pedido", invoice.order?.orderNumber ?? "Sem pedido vinculado")}
              {buildTag("Fornecedor", invoice.supplier?.name ?? "Sem fornecedor vinculado")}
              {buildTag("Arquivo XML", invoice.xmlFileName ?? "Sem nome")}
              {buildTag("Chave", invoice.accessKey ?? "Nao informada")}
            </div>

            {invoice.invoiceProducts.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Itens vinculados</h3>
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    Produtos associados automaticamente a esta nota fiscal.
                  </p>
                </div>
                <div className="space-y-3">
                  {invoice.invoiceProducts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(31,45,40,0.04)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{item.product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            SKU {item.product.sku} | Item {item.itemNumber ?? "-"}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(item.lineAmount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Unitario {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHint text="Esta nota nao possui itens vinculados a produtos no sistema." />
            )}

            {invoice.notes ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(31,45,40,0.04)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
                  Observacoes
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {invoice.notes}
                </p>
              </div>
            ) : null}
          </div>
        </AppPanel>

        <AppPanel title="Documento XML" eyebrow="Leitura completa">
          {invoice.xmlContent ? (
            <InvoiceXmlViewer
              xml={invoice.xmlContent}
              fileName={invoice.xmlFileName}
              issueDate={invoice.issueDate}
              accessKey={invoice.accessKey}
            />
          ) : (
            <EmptyHint text="Esta nota fiscal nao possui XML original armazenado no banco." />
          )}
        </AppPanel>
      </section>
    </AppShell>
  );
}
