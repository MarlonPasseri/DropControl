import Link from "next/link";
import { ReactNode } from "react";

type Accent = "teal" | "amber" | "blue" | "rose" | "slate";

const accentMap: Record<
  Accent,
  {
    card: string;
    iconWrap: string;
    icon: string;
    eyebrow: string;
    note: string;
    value: string;
  }
> = {
  teal: {
    card: "bg-[var(--surface-container-low)]",
    iconWrap: "bg-[var(--surface-container-highest)] text-[var(--primary)]",
    icon: "payments",
    eyebrow: "text-[var(--on-surface-variant)]",
    note: "text-[var(--on-surface-variant)]",
    value: "text-slate-900",
  },
  amber: {
    card: "bg-[var(--surface-container-lowest)]",
    iconWrap: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
    icon: "analytics",
    eyebrow: "text-[var(--on-surface-variant)]",
    note: "text-[var(--on-surface-variant)]",
    value: "text-slate-900",
  },
  blue: {
    card: "signature-gradient shadow-[0_16px_30px_rgba(86,94,116,0.16)]",
    iconWrap: "bg-white/15 text-white",
    icon: "trending_up",
    eyebrow: "text-[var(--primary-container)]",
    note: "text-white/80",
    value: "text-white",
  },
  rose: {
    card: "bg-[color:rgba(254,137,131,0.18)]",
    iconWrap: "bg-white/70 text-[var(--error)]",
    icon: "warning",
    eyebrow: "text-[var(--error)]",
    note: "text-[var(--on-surface-variant)]",
    value: "text-slate-900",
  },
  slate: {
    card: "bg-[var(--surface-container-lowest)] shadow-[0_20px_40px_rgba(42,52,57,0.06)]",
    iconWrap: "bg-[var(--primary-container)] text-[var(--primary)]",
    icon: "bar_chart",
    eyebrow: "text-[var(--on-surface-variant)]",
    note: "text-[var(--on-surface-variant)]",
    value: "text-slate-900",
  },
};

const statusMap: Record<string, string> = {
  Ativo: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Vencedor: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  Testando: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
  Pausado: "bg-[color:rgba(254,137,131,0.18)] text-[var(--error)]",
  Encerrado: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Pago: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  "Aguardando compra": "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Comprado: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Enviado: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  Entregue: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
  Atraso: "bg-[color:rgba(254,137,131,0.18)] text-[var(--error)]",
  Problema: "bg-[color:rgba(159,64,61,0.12)] text-[var(--error)]",
  Reembolsado: "bg-[color:rgba(159,64,61,0.12)] text-[var(--error)]",
  Cancelado: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Receita: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
  Despesa: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Reembolso: "bg-[color:rgba(159,64,61,0.12)] text-[var(--error)]",
  Alta: "bg-[color:rgba(159,64,61,0.12)] text-[var(--error)]",
  Media: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  Baixa: "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Pendente: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  "Em andamento": "bg-[var(--primary-container)] text-[var(--on-primary-container)]",
  Concluida: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
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
    <section className="rounded-lg bg-[var(--surface-container-lowest)] p-6 shadow-[0_20px_40px_rgba(42,52,57,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-headline text-lg font-bold text-slate-900">{title}</h2>
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
    <div className={`flex min-h-[172px] flex-col justify-between rounded-lg p-6 ${theme.card}`}>
      <div>
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${theme.iconWrap}`}
        >
          <span className="material-symbols-outlined text-[20px]">{theme.icon}</span>
        </div>
        <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}>
          {label}
        </p>
      </div>
      <div>
        <p className={`font-headline text-3xl font-extrabold tracking-tight ${theme.value}`}>
          {value}
        </p>
        <p className={`mt-2 text-sm ${theme.note}`}>{note}</p>
      </div>
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
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-[var(--surface-container-high)] bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)]"
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
    <div className="rounded-lg border border-dashed border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-6 text-sm text-[var(--on-surface-variant)]">
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
      className={`rounded-lg px-4 py-3 text-sm ${
        tone === "success"
          ? "bg-[color:rgba(213,227,252,0.45)] text-[var(--on-secondary-container)]"
          : "bg-[color:rgba(254,137,131,0.18)] text-[var(--error)]"
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
              : "border-transparent bg-[var(--surface-container-low)] text-[var(--on-secondary-container)]"
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
              : "border-transparent bg-[var(--surface-container-low)] text-[var(--on-secondary-container)]"
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
      ? "bg-[color:rgba(254,137,131,0.18)]"
      : severity === "medium"
        ? "bg-[var(--surface-container-low)]"
        : "bg-[color:rgba(213,227,252,0.45)]";

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
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-[var(--on-secondary-container)]">
          {categoryLabel}
        </span>
        <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
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
