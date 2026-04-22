import Link from "next/link";
import { ReactNode } from "react";

type Accent = "teal" | "amber" | "blue" | "rose" | "slate";

const accentMap: Record<
  Accent,
  {
    iconWrap: string;
    icon: string;
    accent: string;
  }
> = {
  teal: {
    iconWrap: "bg-[var(--primary-container)] text-[var(--primary)]",
    icon: "payments",
    accent: "border-l-[var(--primary)]",
  },
  amber: {
    iconWrap: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
    icon: "analytics",
    accent: "border-l-[var(--warning)]",
  },
  blue: {
    iconWrap: "bg-slate-100 text-slate-700",
    icon: "trending_up",
    accent: "border-l-slate-700",
  },
  rose: {
    iconWrap: "bg-[var(--error-container)] text-[var(--error)]",
    icon: "warning",
    accent: "border-l-[var(--error)]",
  },
  slate: {
    iconWrap: "bg-[var(--surface-container-low)] text-slate-700",
    icon: "bar_chart",
    accent: "border-l-slate-400",
  },
};

const statusMap: Record<string, string> = {
  Ativo: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Vencedor: "bg-[var(--success-container)] text-[var(--success)]",
  Testando: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
  Pausado: "bg-[var(--error-container)] text-[var(--error)]",
  Encerrado: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Pago: "bg-[var(--success-container)] text-[var(--success)]",
  "Aguardando compra": "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Comprado: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Enviado: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  Entregue: "bg-[var(--success-container)] text-[var(--success)]",
  Atraso: "bg-[var(--warning-container)] text-[var(--on-tertiary-container)]",
  Problema: "bg-[var(--error-container)] text-[var(--error)]",
  Reembolsado: "bg-[var(--error-container)] text-[var(--error)]",
  Cancelado: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Compra: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Venda: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Emitida: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Paga: "bg-[var(--success-container)] text-[var(--success)]",
  Cancelada: "bg-[var(--error-container)] text-[var(--error)]",
  Receita: "bg-[var(--success-container)] text-[var(--success)]",
  Despesa: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Reembolso: "bg-[var(--error-container)] text-[var(--error)]",
  Alta: "bg-[var(--error-container)] text-[var(--error)]",
  Media: "bg-[var(--warning-container)] text-[var(--on-tertiary-container)]",
  Baixa: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Pendente: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  "Em andamento": "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Concluida: "bg-[var(--success-container)] text-[var(--success)]",
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
    <section className="rounded-lg border border-[var(--outline-variant)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold text-[var(--on-surface-variant)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-headline text-lg font-bold text-slate-950">{title}</h2>
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
  const theme = accentMap[accent];

  return (
    <div
      className={`flex min-h-[152px] flex-col justify-between rounded-lg border border-l-4 border-[var(--outline-variant)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${theme.accent}`}
    >
      <div>
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${theme.iconWrap}`}
        >
          <span className="material-symbols-outlined text-[20px]">{theme.icon}</span>
        </div>
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">{label}</p>
      </div>
      <div>
        <p className="font-headline text-3xl font-extrabold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{note}</p>
      </div>
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] ${
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
          : "border-[var(--outline-variant)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
      <span className="mb-2 block text-sm font-medium text-[var(--on-surface-variant)]">
        {label}
      </span>
      <div className="rounded-lg bg-[var(--surface-container-low)] px-3 py-3 text-sm text-[var(--on-surface-variant)]">
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
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-container-highest)]">
        <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--outline-variant)] bg-white px-4 py-8 text-center text-sm text-[var(--on-surface-variant)]">
      <span className="material-symbols-outlined mx-auto mb-2 text-[24px] text-[var(--outline)]">
        inventory_2
      </span>
      <p>{text}</p>
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
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-[color:rgba(31,107,102,0.12)] bg-[color:rgba(214,241,234,0.74)] text-[var(--on-primary-container)]"
          : "border-[color:rgba(180,35,24,0.16)] bg-[var(--error-container)] text-[var(--error)]"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {tone === "success" ? "verified" : "warning"}
      </span>
      <span>{text}</span>
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
    <p className="text-sm text-[var(--on-surface-variant)]">
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
      <p className="text-sm text-[var(--on-surface-variant)]">
        Pagina {page} de {totalPages}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref(Math.max(page - 1, 1))}
          aria-disabled={page === 1}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            page === 1
              ? "pointer-events-none border-transparent bg-[var(--surface-container-high)] text-slate-400"
              : "border-[var(--outline-variant)] bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={buildHref(Math.min(page + 1, totalPages))}
          aria-disabled={page === totalPages}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            page === totalPages
              ? "pointer-events-none border-transparent bg-[var(--surface-container-high)] text-slate-400"
              : "border-[var(--outline-variant)] bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
      ? "border-l-[var(--error)]"
      : severity === "medium"
        ? "border-l-[var(--warning)]"
        : "border-l-[var(--primary)]";

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
    <div className={`rounded-lg border border-l-4 border-[var(--outline-variant)] bg-white p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[var(--surface-container-low)] px-2.5 py-1 text-xs font-semibold text-[var(--on-secondary-container)]">
          {categoryLabel}
        </span>
        <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
          Prioridade {severityLabel}
        </span>
      </div>
      <h3 className="mt-3 font-headline text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{description}</p>
      <div className="mt-4">
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-dim)]"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
