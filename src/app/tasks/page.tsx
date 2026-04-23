import Link from "next/link";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { saveTask, removeTask } from "@/app/tasks/actions";
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
import { getProductsByUser } from "@/lib/data/products";
import { getTaskById, getTaskMetrics, getTasksByUser } from "@/lib/data/tasks";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/formatters";
import { parsePageParam, paginateItems } from "@/lib/pagination";
import {
  getTaskPriorityLabel,
  taskPriorityOptions,
  taskStatusOptions,
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
  return query ? `/tasks?${query}` : "/tasks";
}

const inputClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] focus:border-[var(--primary)]";
const selectClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-[var(--primary)]";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const statusParam = firstOf(params.status);
  const priorityParam = firstOf(params.priority);
  const pageParam = firstOf(params.page);
  const page = parsePageParam(pageParam);
  const statusFilter = taskStatusOptions.some((option) => option.value === statusParam)
    ? (statusParam as TaskStatus)
    : undefined;
  const priorityFilter = taskPriorityOptions.some(
    (option) => option.value === priorityParam,
  )
    ? (priorityParam as TaskPriority)
    : undefined;

  const [metrics, tasks, products, selectedTask] = await Promise.all([
    getTaskMetrics(user.id),
    getTasksByUser(user.id, {
      query: query || undefined,
      status: statusFilter,
      priority: priorityFilter,
    }),
    getProductsByUser(user.id),
    editId ? getTaskById(user.id, editId) : Promise.resolve(null),
  ]);
  const paginatedTasks = paginateItems(tasks, page, 9);
  const selectedTaskProduct = selectedTask?.relatedProductId
    ? products.find((product) => product.id === selectedTask.relatedProductId)
    : null;

  const taskMetrics = [
    {
      label: "Pendentes",
      value: `${metrics.pendingCount}`,
      note: "Aguardando execucao",
      accent: "amber" as const,
    },
    {
      label: "Em andamento",
      value: `${metrics.inProgressCount}`,
      note: "Fluxo operacional ativo",
      accent: "blue" as const,
    },
    {
      label: "Atrasadas",
      value: `${metrics.overdueCount}`,
      note: "Prazo ja ultrapassado",
      accent: "rose" as const,
    },
    {
      label: "Concluidas na semana",
      value: `${metrics.completedThisWeek}`,
      note: "Ritmo recente do time",
      accent: "teal" as const,
    },
  ];

  return (
    <AppShell
      title="Tarefas"
      description="Quadro operacional real com filtros por status e prioridade, alem de vinculo opcional a produtos."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppPanel title="Radar das tarefas" eyebrow="Cadencia da operacao">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
                  Ritmo do time
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {statusFilter
                    ? `Voce esta olhando ${taskStatusOptions.find((option) => option.value === statusFilter)?.label?.toLowerCase()}.`
                    : "Use este quadro para puxar o proximo trabalho, proteger prazos e vincular demandas aos produtos certos."}
                  {priorityFilter
                    ? ` Prioridade ativa: ${getTaskPriorityLabel(priorityFilter).toLowerCase()}.`
                    : ""}
                  {query ? ` Busca ativa: "${query}".` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildQueryString(params, {
                    status: TaskStatus.PENDING,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Ver pendentes
                </Link>
                <Link
                  href={buildQueryString(params, {
                    priority: TaskPriority.HIGH,
                    edit: undefined,
                    page: undefined,
                    success: undefined,
                    error: undefined,
                  })}
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Alta prioridade
                </Link>
                <Link
                  href="/products"
                  className="rounded-full border border-[var(--outline-variant)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Rever produtos
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Pendentes</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.pendingCount}</p>
                <p className="mt-1 text-xs text-slate-500">Fila pronta para puxar</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Atrasadas</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.overdueCount}</p>
                <p className="mt-1 text-xs text-slate-500">Prazo ja ultrapassado</p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Formulario</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selectedTask ? selectedTask.title : "Nova tarefa"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTask ? "Revise prazo, prioridade e vinculos" : "Pronto para organizar a fila"}
                </p>
              </div>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Atalhos de execucao" eyebrow="Acoes do operador">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-lg bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-[var(--on-primary)] shadow-[0_16px_36px_rgba(23,107,99,0.22)] hover:bg-[var(--primary-dim)]"
            >
              Nova tarefa
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Ver pedidos
            </Link>
            <Link
              href="/products"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Abrir produtos
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-4 text-sm font-semibold text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </AppPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {taskMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <AppPanel title="Filtros" eyebrow="Rotina da operacao">
        <div className="flex flex-col gap-4">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto_auto]" action="/tasks">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por titulo, responsavel ou descricao"
              className={inputClass}
            />
            <select
              name="priority"
              defaultValue={priorityFilter ?? ""}
              className={selectClass}
            >
              <option value="">Todas as prioridades</option>
              {taskPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
            >
              Filtrar
            </button>
            {(query || statusFilter || priorityFilter || editId) && (
              <Link
                href="/tasks"
                className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Limpar
              </Link>
            )}
          </form>

          {(query || statusFilter || priorityFilter) && (
            <div className="flex flex-wrap gap-2">
              {query ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Busca: {query}
                </span>
              ) : null}
              {statusFilter ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Status: {taskStatusOptions.find((option) => option.value === statusFilter)?.label}
                </span>
              ) : null}
              {priorityFilter ? (
                <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-slate-700">
                  Prioridade: {getTaskPriorityLabel(priorityFilter)}
                </span>
              ) : null}
            </div>
          )}

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
              Todas
            </Link>
            {taskStatusOptions.map((option) => (
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
      </AppPanel>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AppPanel
          title="Quadro da operacao"
          eyebrow="Kanban real"
          action={
            <Link
              href={buildQueryString(params, {
                edit: undefined,
                success: undefined,
                error: undefined,
              })}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--primary-dim)]"
            >
              Nova tarefa
            </Link>
          }
        >
          {tasks.length === 0 ? (
            <EmptyHint text="Nenhuma tarefa encontrada para os filtros atuais." />
          ) : (
            <div className="space-y-4">
              <ResultSummary
                label="tarefas"
                startIndex={paginatedTasks.startIndex}
                endIndex={paginatedTasks.endIndex}
                totalItems={paginatedTasks.totalItems}
              />
              <div className="grid gap-4 xl:grid-cols-3">
                {taskStatusOptions.map((column) => {
                  const columnTasks = paginatedTasks.items.filter((task) => task.status === column.value);

                  return (
                    <div
                      key={column.value}
                      className="rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-950">{column.label}</h3>
                          <p className="mt-1 text-xs text-slate-500">{columnTasks.length} itens</p>
                        </div>
                        <StatusPill label={column.label} />
                      </div>
                      <div className="space-y-3">
                        {columnTasks.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[var(--outline-variant)] bg-white px-3 py-4 text-sm text-slate-500">
                            Sem tarefas nesta coluna.
                          </div>
                        ) : (
                          columnTasks.map((task) => (
                            <Link
                              key={task.id}
                              href={buildQueryString(params, {
                                edit: task.id,
                                success: undefined,
                                error: undefined,
                              })}
                              className="block rounded-lg border border-transparent bg-white p-4 shadow-[0_12px_30px_rgba(42,52,57,0.06)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-container-lowest)]"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                                <StatusPill label={getTaskPriorityLabel(task.priority)} />
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {task.description || "Sem descricao."}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  {task.dueDate ? formatDateTime(task.dueDate) : "Sem prazo"}
                                </span>
                                <span className="rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  {task.assigneeName || "Sem responsavel"}
                                </span>
                              </div>
                              <p className="mt-3 text-xs font-medium text-slate-500">
                                {task.relatedProduct
                                  ? `${task.relatedProduct.name} - ${task.relatedProduct.sku}`
                                  : "Sem produto vinculado"}
                              </p>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={paginatedTasks.page}
                totalPages={paginatedTasks.totalPages}
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
          title={selectedTask ? "Editar tarefa" : "Nova tarefa"}
          eyebrow="Formulario real"
        >
          <form action={saveTask} className="grid gap-4 md:grid-cols-2">
            {selectedTask ? <input type="hidden" name="id" value={selectedTask.id} /> : null}

            <div className="col-span-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-4 text-sm text-slate-700">
              {selectedTask ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-950">
                    Editando {selectedTask.title}
                  </span>
                  <StatusPill label={getTaskPriorityLabel(selectedTask.priority)} />
                  <span className="text-xs text-slate-500">
                    {selectedTaskProduct
                      ? `Ligada a ${selectedTaskProduct.name}`
                      : "Sem produto vinculado"}
                  </span>
                </div>
              ) : (
                <p>
                  Defina titulo, prioridade e prazo. Se a tarefa depender de um produto, vincule
                  agora para facilitar o acompanhamento nas outras telas.
                </p>
              )}
            </div>

            <label className="col-span-full">
              <span className={labelClass}>Titulo</span>
              <input
                type="text"
                name="title"
                required
                defaultValue={selectedTask?.title ?? ""}
                className={inputClass}
              />
            </label>

            <label className="col-span-full">
              <span className={labelClass}>Descricao</span>
              <textarea
                name="description"
                rows={4}
                defaultValue={selectedTask?.description ?? ""}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Prioridade</span>
              <select
                name="priority"
                required
                defaultValue={selectedTask?.priority ?? TaskPriority.MEDIUM}
                className={selectClass}
              >
                {taskPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Status</span>
              <select
                name="status"
                required
                defaultValue={selectedTask?.status ?? TaskStatus.PENDING}
                className={selectClass}
              >
                {taskStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Prazo</span>
              <input
                type="datetime-local"
                name="dueDate"
                defaultValue={toDateTimeLocalValue(selectedTask?.dueDate)}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Responsavel</span>
              <input
                type="text"
                name="assigneeName"
                defaultValue={selectedTask?.assigneeName ?? ""}
                className={inputClass}
              />
            </label>

            <label className="col-span-full">
              <span className={labelClass}>Produto vinculado</span>
              <select
                name="relatedProductId"
                defaultValue={selectedTask?.relatedProductId ?? ""}
                className={selectClass}
              >
                <option value="">Sem vinculo</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.sku}
                  </option>
                ))}
              </select>
            </label>

            <div className="col-span-full flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(23,107,99,0.18)] hover:bg-[var(--primary-dim)]"
              >
                {selectedTask ? "Salvar alteracoes" : "Criar tarefa"}
              </button>

              {selectedTask ? (
                <>
                  <Link
                    href={buildQueryString(params, {
                      edit: undefined,
                      success: undefined,
                      error: undefined,
                    })}
                    className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    Nova tarefa
                  </Link>
                  <button
                    type="submit"
                    formAction={removeTask}
                    className="rounded-lg border border-[var(--error-container)] bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:border-[var(--error)]"
                  >
                    Excluir tarefa
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

