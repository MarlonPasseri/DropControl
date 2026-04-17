"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTask,
  deleteTask,
  getTaskById,
  updateTask,
} from "@/lib/data/tasks";
import { getProductById } from "@/lib/data/products";
import { requireUser } from "@/lib/require-user";
import { taskSchema } from "@/lib/validations/tasks";

function tasksRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/tasks?${query}` : "/tasks");
}

export async function saveTask(formData: FormData) {
  const user = await requireUser();
  const parsed = taskSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    assigneeName: formData.get("assigneeName"),
    dueDate: formData.get("dueDate"),
    relatedProductId: formData.get("relatedProductId"),
  });

  if (!parsed.success) {
    tasksRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados da tarefa.",
      edit: typeof formData.get("id") === "string" ? (formData.get("id") as string) : undefined,
    });
  }

  const data = parsed.data;
  const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

  if (dueDate && Number.isNaN(dueDate.getTime())) {
    tasksRedirect({
      error: "Informe um prazo valido.",
      edit: data.id,
    });
  }

  if (data.relatedProductId) {
    const product = await getProductById(user.id, data.relatedProductId);

    if (!product) {
      tasksRedirect({
        error: "Selecione um produto valido.",
        edit: data.id,
      });
    }
  }

  if (data.id) {
    const existingTask = await getTaskById(user.id, data.id);

    if (!existingTask) {
      tasksRedirect({ error: "Tarefa nao encontrada." });
    }

    await updateTask(data.id, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assigneeName: data.assigneeName,
      dueDate,
      relatedProductId: data.relatedProductId,
    });

    revalidatePath("/tasks");
    tasksRedirect({
      success: "Tarefa atualizada com sucesso.",
      edit: data.id,
    });
  }

  const task = await createTask({
    userId: user.id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status,
    assigneeName: data.assigneeName,
    dueDate,
    relatedProductId: data.relatedProductId,
  });

  revalidatePath("/tasks");
  tasksRedirect({
    success: "Tarefa criada com sucesso.",
    edit: task.id,
  });
}

export async function removeTask(formData: FormData) {
  const user = await requireUser();
  const taskId = `${formData.get("id") ?? ""}`.trim();

  if (!taskId) {
    tasksRedirect({ error: "Tarefa invalida." });
  }

  const existingTask = await getTaskById(user.id, taskId);

  if (!existingTask) {
    tasksRedirect({ error: "Tarefa nao encontrada." });
  }

  await deleteTask(taskId);
  revalidatePath("/tasks");
  tasksRedirect({ success: "Tarefa removida com sucesso." });
}
