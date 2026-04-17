import { Prisma, type TaskPriority, type TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TaskFilters = {
  query?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export async function getTasksByUser(userId: string, filters: TaskFilters = {}) {
  const where: Prisma.TaskWhereInput = {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
            { assigneeName: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.task.findMany({
    where,
    include: {
      relatedProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
      relatedOrder: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
    orderBy: [
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function getTaskById(userId: string, taskId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });
}

export async function getTaskMetrics(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const [pendingCount, inProgressCount, overdueCount, completedThisWeek] =
    await prisma.$transaction([
      prisma.task.count({
        where: {
          userId,
          status: "PENDING",
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: "IN_PROGRESS",
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: {
            not: "COMPLETED",
          },
          dueDate: {
            lt: now,
          },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: "COMPLETED",
          updatedAt: {
            gte: startOfWeek,
          },
        },
      }),
    ]);

  return {
    pendingCount,
    inProgressCount,
    overdueCount,
    completedThisWeek,
  };
}

export async function createTask(input: {
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeName?: string;
  dueDate?: Date;
  relatedProductId?: string;
}) {
  return prisma.task.create({
    data: input,
  });
}

export async function updateTask(
  taskId: string,
  input: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeName?: string;
    dueDate?: Date;
    relatedProductId?: string;
  },
) {
  return prisma.task.update({
    where: {
      id: taskId,
    },
    data: input,
  });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({
    where: {
      id: taskId,
    },
  });
}
