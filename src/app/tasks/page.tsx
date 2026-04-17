import Link from "next/link";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { saveTask, removeTask } from "@/app/tasks/actions";
import { AppShell } from "@/components/app-shell";
import {
  AppPanel,
  EmptyHint,
  MetricCard,
  NoticeBanner,
  StatusPill,
} from "@/components/mvp-ui";
import { getProductsByUser } from "@/lib/data/products";
import { getTaskById, getTaskMetrics, getTasksByUser } from "@/lib/data/tasks";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/formatters";
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

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const query = firstOf(params.q)?.trim() ?? "";
  const editId = firstOf(params.edit);
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const statusParam = firstOf(params.status);
  const priorityParam = firstOf(params.priority);
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
              className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <select
              name="priority"
              defaultValue={priorityFilter ?? ""}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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
              className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Filtrar
            </button>
            {(query || statusFilter || priorityFilter || editId) && (
              <Link
                href="/tasks"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Limpar
              </Link>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildQueryString(params, { status: undefined, edit: undefined })}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                !statusFilter
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700"
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
                })}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  statusFilter === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
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
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              Nova tarefa
            </Link>
          }
        >
          {tasks.length === 0 ? (
            <EmptyHint text="Nenhuma tarefa encontrada para os filtros atuais." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {taskStatusOptions.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.value);

                return (
                  <div
                    key={column.value}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-950">{column.label}</h3>
                      <StatusPill label={column.label} />
                    </div>
                    <div className="space-y-3">
                      {columnTasks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
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
                            className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                              <StatusPill label={getTaskPriorityLabel(task.priority)} />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {task.description || "Sem descricao."}
                            </p>
                            <div className="mt-3 space-y-1 text-xs font-medium text-slate-500">
                              <p>{formatDateTime(task.dueDate)}</p>
                              <p>{task.assigneeName || "Sem responsavel"}</p>
                              <p>
                                {task.relatedProduct
                                  ? `${task.relatedProduct.name} - ${task.relatedProduct.sku}`
                                  : "Sem produto vinculado"}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppPanel>

        <AppPanel
          title={selectedTask ? "Editar tarefa" : "Nova tarefa"}
          eyebrow="Formulario real"
        >
          <form action={saveTask} className="grid gap-4 md:grid-cols-2">
            {selectedTask ? <input type="hidden" name="id" value={selectedTask.id} /> : null}

            <label className="col-span-full">
              <span className="mb-2 block text-sm font-medium text-slate-700">Titulo</span>
              <input
                type="text"
                name="title"
                required
                defaultValue={selectedTask?.title ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="col-span-full">
              <span className="mb-2 block text-sm font-medium text-slate-700">Descricao</span>
              <textarea
                name="description"
                rows={4}
                defaultValue={selectedTask?.description ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Prioridade</span>
              <select
                name="priority"
                required
                defaultValue={selectedTask?.priority ?? TaskPriority.MEDIUM}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {taskPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select
                name="status"
                required
                defaultValue={selectedTask?.status ?? TaskStatus.PENDING}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {taskStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Prazo</span>
              <input
                type="datetime-local"
                name="dueDate"
                defaultValue={toDateTimeLocalValue(selectedTask?.dueDate)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Responsavel
              </span>
              <input
                type="text"
                name="assigneeName"
                defaultValue={selectedTask?.assigneeName ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="col-span-full">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Produto vinculado
              </span>
              <select
                name="relatedProductId"
                defaultValue={selectedTask?.relatedProductId ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
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
                    className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Nova tarefa
                  </Link>
                  <button
                    type="submit"
                    formAction={removeTask}
                    className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
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
