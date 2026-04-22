import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Actor = {
  id?: string | null;
  email?: string | null;
};

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

type Severity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

function normalizeHeader(value: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue || undefined;
}

function getClientIpFromHeaders(source: Headers) {
  const forwardedFor = source.get("x-forwarded-for");

  if (forwardedFor) {
    return normalizeHeader(forwardedFor.split(",")[0]);
  }

  return normalizeHeader(
    source.get("x-real-ip") ??
      source.get("cf-connecting-ip") ??
      source.get("x-vercel-forwarded-for"),
  );
}

function toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

export function getRequestContextFromHeaders(source: Headers): RequestContext {
  return {
    ipAddress: getClientIpFromHeaders(source),
    userAgent: normalizeHeader(source.get("user-agent")),
    requestId: normalizeHeader(source.get("x-request-id")),
  };
}

export async function getCurrentRequestContext() {
  return getRequestContextFromHeaders(await headers());
}

export async function recordAuditLog(input: {
  actor?: Actor;
  action: string;
  resource: string;
  resourceId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
}) {
  const context = input.context ?? (await getCurrentRequestContext());

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      summary: input.summary,
      metadata: toJson(input.metadata),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    },
  });
}

export async function recordSecurityEvent(input: {
  userId?: string | null;
  email?: string | null;
  type: string;
  severity?: Severity;
  message?: string;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
}) {
  const context = input.context ?? (await getCurrentRequestContext());

  await prisma.securityEvent.create({
    data: {
      userId: input.userId ?? null,
      email: input.email ?? null,
      type: input.type,
      severity: input.severity ?? "INFO",
      message: input.message,
      metadata: toJson(input.metadata),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    },
  });
}
