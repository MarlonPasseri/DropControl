import { updateUserAccess } from "@/app/security/actions";
import { AppShell } from "@/components/app-shell";
import { AppPanel, EmptyHint, MetricCard, NoticeBanner } from "@/components/mvp-ui";
import { countUsersByAccessRole, listUsersWithAccessRoles } from "@/lib/data/users";
import { getSecurityOverview } from "@/lib/data/security";
import { formatDateTime } from "@/lib/formatters";
import { requireAdminUser } from "@/lib/require-user";
import { APP_ROLES, getRoleLabel } from "@/lib/security/roles";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function SecurityPage({ searchParams }: PageProps) {
  const user = await requireAdminUser();
  const params = (await searchParams) ?? {};
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const overview = await getSecurityOverview({
    userId: user.id,
    email: user.email ?? "",
    scope: "global",
  });
  const [users, accessSummary] = await Promise.all([
    listUsersWithAccessRoles(),
    countUsersByAccessRole(),
  ]);

  return (
    <AppShell
      title="Seguranca"
      description="Painel administrativo com auditoria operacional, autenticacao e sinais de seguranca de todo o ambiente."
    >
      <section className="grid gap-4 md:grid-cols-5">
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
        <MetricCard
          label="Administradores"
          value={`${accessSummary.ADMIN}`}
          note="Contas com acesso ampliado"
          accent={accessSummary.ADMIN > 1 ? "blue" : "amber"}
        />
        <MetricCard
          label="Operadores"
          value={`${accessSummary.OPERATOR}`}
          note="Contas operacionais ativas"
          accent="slate"
        />
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <section className="grid gap-6">
        <AppPanel title="Controle de acesso" eyebrow="Usuarios e papeis">
          {users.length === 0 ? (
            <EmptyHint text="Nenhum usuario encontrado para administrar." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--outline-variant)]">
              <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                <thead className="bg-[var(--surface-container-low)] text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Criado em</th>
                    <th className="px-4 py-3 font-medium">Acesso atual</th>
                    <th className="px-4 py-3 font-medium">Atualizar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((listedUser) => {
                    const isCurrentUser = listedUser.id === user.id;

                    return (
                      <tr key={listedUser.id}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-slate-950">
                            {listedUser.name}
                            {isCurrentUser ? (
                              <span className="ml-2 rounded-md bg-slate-950 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                                voce
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{listedUser.email}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {listedUser.company || "Nao informada"}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {formatDateTime(listedUser.createdAt)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-md bg-[var(--primary-container)] px-2.5 py-1 text-xs font-semibold text-[var(--on-primary-container)]">
                            {getRoleLabel(listedUser.accessRole)}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <form action={updateUserAccess} className="flex flex-wrap items-center gap-3">
                            <input type="hidden" name="userId" value={listedUser.id} />
                            <select
                              name="role"
                              defaultValue={listedUser.accessRole}
                              className="min-w-[180px] rounded-lg border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[var(--primary)]"
                            >
                              {APP_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {getRoleLabel(role)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            >
                              Salvar acesso
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
            Contas novas entram como <strong className="text-slate-950">Operador</strong>. O
            primeiro usuario do ambiente permanece como base administrativa, e a tela impede
            remover o ultimo administrador por engano.
          </div>
        </AppPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AppPanel title="Eventos de seguranca" eyebrow="Autenticacao e CSP">
          {overview.securityEvents.length === 0 ? (
            <EmptyHint text="Nenhum evento de seguranca registrado no ambiente." />
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
            <EmptyHint text="Nenhuma acao auditada registrada no ambiente." />
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
