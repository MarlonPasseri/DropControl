import { Fragment, ReactNode } from "react";

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCompetence(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function prettifyXml(xml: string) {
  const normalized = xml.replace(/\r\n/g, "\n").replace(/>\s*</g, "><").trim();
  const tokens = normalized.replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n");
  const lines: string[] = [];
  let indentLevel = 0;

  for (const token of tokens) {
    const trimmed = token.trim();

    if (!trimmed) {
      continue;
    }

    if (/^<\//.test(trimmed)) {
      indentLevel = Math.max(indentLevel - 1, 0);
    }

    lines.push(`${"  ".repeat(indentLevel)}${trimmed}`);

    const isOpeningTag =
      /^<[^!?/][^>]*[^/]?>$/.test(trimmed) &&
      !trimmed.includes("</") &&
      !trimmed.endsWith("/>");

    if (isOpeningTag) {
      indentLevel += 1;
    }
  }

  return lines;
}

function renderXmlAttributes(attributes: string, keyPrefix: string) {
  if (!attributes.trim()) {
    return null;
  }

  const fragments: ReactNode[] = [];
  const attributeRegex = /(\s+)([^\s=]+)(\s*=\s*)(\"[^\"]*\"|'[^']*')/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = attributeRegex.exec(attributes)) !== null) {
    if (match.index > lastIndex) {
      fragments.push(
        <span key={`${keyPrefix}-raw-${lastIndex}`} className="text-slate-400">
          {attributes.slice(lastIndex, match.index)}
        </span>,
      );
    }

    fragments.push(
      <span key={`${keyPrefix}-space-${match.index}`} className="text-slate-400">
        {match[1]}
      </span>,
    );
    fragments.push(
      <span key={`${keyPrefix}-name-${match.index}`} className="font-medium text-amber-700">
        {match[2]}
      </span>,
    );
    fragments.push(
      <span key={`${keyPrefix}-equals-${match.index}`} className="text-slate-400">
        {match[3]}
      </span>,
    );
    fragments.push(
      <span key={`${keyPrefix}-value-${match.index}`} className="text-rose-700">
        {match[4]}
      </span>,
    );

    lastIndex = attributeRegex.lastIndex;
  }

  if (lastIndex < attributes.length) {
    fragments.push(
      <span key={`${keyPrefix}-tail`} className="text-slate-400">
        {attributes.slice(lastIndex)}
      </span>,
    );
  }

  return fragments;
}

function renderXmlTag(tag: string, keyPrefix: string) {
  if (/^<\?/.test(tag) || /^<!/.test(tag)) {
    return <span className="text-slate-500">{tag}</span>;
  }

  const match = /^(<\/?)([^\s/>?]+)([\s\S]*?)(\/?>)$/.exec(tag);

  if (!match) {
    return <span className="text-sky-700">{tag}</span>;
  }

  const [, start, name, attributes, end] = match;

  return (
    <>
      <span className="text-sky-700">{start}</span>
      <span className="font-semibold text-teal-700">{name}</span>
      {renderXmlAttributes(attributes, keyPrefix)}
      <span className="text-sky-700">{end}</span>
    </>
  );
}

function renderXmlLine(line: string, lineNumber: number) {
  const parts = line.match(/(<[^>]+>|[^<]+)/g) ?? [line];

  return parts.map((part, index) => (
    <Fragment key={`line-${lineNumber}-part-${index}`}>
      {part.startsWith("<") ? (
        renderXmlTag(part, `line-${lineNumber}-tag-${index}`)
      ) : (
        <span className="text-slate-700">{part}</span>
      )}
    </Fragment>
  ));
}

export function InvoiceXmlViewer({
  xml,
  fileName,
  issueDate,
  accessKey,
}: {
  xml: string;
  fileName?: string | null;
  issueDate: Date;
  accessKey?: string | null;
}) {
  const lines = prettifyXml(xml);
  const byteLength = new TextEncoder().encode(xml).length;

  return (
    <section className="rounded-xl border border-[var(--surface-container-highest)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(243,248,246,0.98)_100%)] p-4 shadow-[0_18px_36px_rgba(31,45,40,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-container)] text-[var(--on-primary-container)]">
            <span className="material-symbols-outlined text-[20px]">code_blocks</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
              XML original
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">
              Visualizacao armazenada da nota fiscal
            </h3>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              Arquivo salvo no banco para consulta, conferencia e declaracao.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-container-high)] px-3 py-1 text-xs font-medium text-[var(--on-surface-variant)]">
            {fileName || "XML sem nome"}
          </span>
          <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-xs font-medium text-[var(--on-secondary-container)]">
            {formatCompetence(issueDate)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-white/80 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
            Tamanho
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formatBytes(byteLength)}</p>
        </div>
        <div className="rounded-lg bg-white/80 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
            Linhas
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{lines.length}</p>
        </div>
        <div className="rounded-lg bg-white/80 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
            Arquivo
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-950">
            {fileName || "Sem nome"}
          </p>
        </div>
        <div className="rounded-lg bg-white/80 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface-variant)]">
            Chave
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-950">
            {accessKey || "Nao informada"}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--surface-container-highest)] bg-[color:rgba(250,252,251,0.98)]">
        <div className="border-b border-[var(--surface-container-highest)] bg-white/80 px-4 py-3">
          <p className="text-sm font-medium text-slate-700">
            Conteudo completo do XML armazenado
          </p>
        </div>
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <tbody>
              {lines.map((line, index) => (
                <tr key={`xml-line-${index}`} className="align-top">
                  <td className="select-none border-r border-[color:rgba(148,163,184,0.16)] bg-[color:rgba(241,245,249,0.72)] px-3 py-1.5 text-right font-mono text-xs text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-[13px] leading-6 tracking-[0.01em] text-slate-800">
                    <code>{renderXmlLine(line, index + 1)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
