import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .transform((value) => value || undefined),
  );

export const taskSchema = z.object({
  id: optionalText,
  title: z.string().trim().min(2, "Informe o titulo da tarefa."),
  description: optionalText,
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  assigneeName: optionalText,
  dueDate: optionalText,
  relatedProductId: optionalText,
});
