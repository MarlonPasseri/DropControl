import { AppShell } from "@/components/app-shell";
import { AppPanel, EmptyHint, MetricCard } from "@/components/mvp-ui";
import { getSecurityOverview } from "@/lib/data/security";
import { formatDateTime } from "@/lib/formatters";
import { requireUser } from "@/lib/require-user";

function EventPill({ value }: { value: string }) {
  const className =
    value === "CRITICAL" || value === "ERROR"
      ? "bg-[var(--error-container)] text-[var(--error)]"
      : value === "WARN"
        ? "bg-[var(--warning-container)] text-[var(--on-tertiary-container)]"
        : "bg-[var(--primary-container)] text-[var(--on-primary-container)]";

  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${className}`}>
      {value}
    </span>
  );
}

function MetadataPreview({ value }: { value: unknown }) {
  if (!value) {
    return <span className="text-slate-400">Sem metadados</span>;
  }

  const text = JSON.stringify(value);

  return (
    <code className="block max-w-[520px] truncate rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
      {text}
    </code>
  );
}

export default async function SecurityPage() {
  const user = await requireUser();
  const overview = await getSecurityOverview(user.id, user.email ?? "");

  return (
    <AppShell
      title="Seguranca"
      description="Auditoria operacional, eventos de autenticacao e sinais de seguranca associados a sua conta."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Acoes auditadas"
          value={`${overview.auditCount24h}`}
          note="Registradas nas ultimas 24h"
          accent="slate"
        />
        <MetricCard
          label="Eventos de atencao"
          value={`${overview.warningCount24h}`}
          note="WARN, ERROR ou CRITICAL em 24h"
          accent={overview.warningCount24h > 0 ? "amber" : "teal"}
        />
        <MetricCard
          label="Falhas de login"
          value={`${overview.failedSignIns24h}`}
          note="Tentativas bloqueadas ou recusadas em 24h"
          accent={overview.failedSignIns24h > 0 ? "rose" : "teal"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AppPanel title="Eventos de seguranca" eyebrow="Autenticacao e CSP">
          {overview.securityEvents.length === 0 ? (
            <EmptyHint text="Nenhum evento de seguranca registrado para sua conta." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
              <table className="min-w-[820px] divide-y divide-slate-200 text-sm">
                <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Severidade</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Contexto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {overview.securityEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <EventPill value={event.severity} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-950">{event.type}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.message ?? "Sem mensagem"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <p>{event.ipAddress ?? "IP nao informado"}</p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-400">
                          {event.userAgent ?? "User agent nao informado"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppPanel>

        <AppPanel title="Auditoria operacional" eyebrow="CRUD e dados sensiveis">
          {overview.auditLogs.length === 0 ? (
            <EmptyHint text="Nenhuma acao auditada registrada para sua conta." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
              <table className="min-w-[860px] divide-y divide-slate-200 text-sm">
                <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Acao</th>
                    <th className="px-4 py-3 font-medium">Recurso</th>
                    <th className="px-4 py-3 font-medium">Metadados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {overview.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-slate-950">
                        {log.action}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <p className="font-medium text-slate-950">{log.resource}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {log.summary ?? log.resourceId ?? "Sem resumo"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <MetadataPreview value={log.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppPanel>
      </section>
    </AppShell>
  );
}
