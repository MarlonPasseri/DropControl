import Link from "next/link";
import { ReactNode } from "react";

type Accent = "teal" | "amber" | "blue" | "rose" | "slate";

const accentMap: Record<Accent, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  slate: "border-slate-200 bg-slate-100 text-slate-900",
};

const statusMap: Record<string, string> = {
  Ativo: "bg-teal-100 text-teal-900",
  Vencedor: "bg-emerald-100 text-emerald-900",
  Testando: "bg-blue-100 text-blue-900",
  Pausado: "bg-amber-100 text-amber-900",
  Encerrado: "bg-slate-200 text-slate-900",
  Pago: "bg-blue-100 text-blue-900",
  "Aguardando compra": "bg-amber-100 text-amber-900",
  Comprado: "bg-cyan-100 text-cyan-900",
  Enviado: "bg-teal-100 text-teal-900",
  Entregue: "bg-emerald-100 text-emerald-900",
  Atraso: "bg-orange-100 text-orange-900",
  Problema: "bg-rose-100 text-rose-900",
  Reembolsado: "bg-slate-200 text-slate-900",
  Cancelado: "bg-slate-200 text-slate-900",
  Receita: "bg-emerald-100 text-emerald-900",
  Despesa: "bg-amber-100 text-amber-900",
  Reembolso: "bg-rose-100 text-rose-900",
  Alta: "bg-rose-100 text-rose-900",
  Media: "bg-amber-100 text-amber-900",
  Baixa: "bg-blue-100 text-blue-900",
  Pendente: "bg-amber-100 text-amber-900",
  "Em andamento": "bg-blue-100 text-blue-900",
  Concluida: "bg-emerald-100 text-emerald-900",
};

export function AppPanel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: Accent;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accentMap[accent]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
        statusMap[label] ?? "bg-slate-100 text-slate-900"
      }`}
    >
      {label}
    </span>
  );
}

export function FilterChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-2 text-sm font-medium ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

export function MockField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "col-span-full" : ""}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
        {value}
      </div>
    </label>
  );
}

export function ProgressBar({
  label,
  value,
  share,
}: {
  label: string;
  value: string;
  share: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-slate-950">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-950"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

export function NoticeBanner({
  tone,
  text,
}: {
  tone: "success" | "error";
  text: string;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      {text}
    </div>
  );
}

export function ResultSummary({
  label,
  startIndex,
  endIndex,
  totalItems,
}: {
  label: string;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}) {
  return (
    <p className="text-sm text-slate-500">
      {totalItems === 0
        ? `Nenhum ${label} encontrado.`
        : `Mostrando ${startIndex}-${endIndex} de ${totalItems} ${label}.`}
    </p>
  );
}

export function PaginationControls({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        Pagina {page} de {totalPages}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref(Math.max(page - 1, 1))}
          aria-disabled={page === 1}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            page === 1
              ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={buildHref(Math.min(page + 1, totalPages))}
          aria-disabled={page === totalPages}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            page === totalPages
              ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          Proxima
        </Link>
      </div>
    </div>
  );
}

export function AlertCard({
  title,
  description,
  category,
  severity,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  category: string;
  severity: "high" | "medium" | "low";
  href: string;
  actionLabel: string;
}) {
  const toneClass =
    severity === "high"
      ? "border-rose-200 bg-rose-50"
      : severity === "medium"
        ? "border-amber-200 bg-amber-50"
        : "border-blue-200 bg-blue-50";

  const severityLabel =
    severity === "high" ? "Alta" : severity === "medium" ? "Media" : "Baixa";
  const categoryLabel =
    category === "orders"
      ? "Pedidos"
      : category === "products"
        ? "Produtos"
        : category === "suppliers"
          ? "Fornecedores"
          : category === "tasks"
            ? "Tarefas"
            : category === "finance"
              ? "Financeiro"
              : category;

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {categoryLabel}
        </span>
        <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
          Prioridade {severityLabel}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      <div className="mt-4">
        <Link
          href={href}
          className="text-sm font-semibold text-slate-950 transition hover:text-slate-700"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
