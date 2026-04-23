import { headers } from "next/headers";
import { getRequestContextFromHeaders } from "@/lib/security/audit";

export class UntrustedActionOriginError extends Error {}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveTrustedOrigins(source: Headers) {
  const trustedOrigins = new Set<string>();
  const host = source.get("x-forwarded-host") ?? source.get("host");
  const protocol = source.get("x-forwarded-proto") ?? "http";

  if (host) {
    trustedOrigins.add(`${protocol}://${host}`);
  }

  for (const candidate of [process.env.APP_URL, process.env.AUTH_URL]) {
    const normalized = normalizeOrigin(candidate);

    if (normalized) {
      trustedOrigins.add(normalized);
    }
  }

  return trustedOrigins;
}

export async function assertTrustedActionOrigin() {
  const requestHeaders = await headers();
  const origin = normalizeOrigin(requestHeaders.get("origin"));

  if (!origin) {
    return {
      headers: requestHeaders,
      context: getRequestContextFromHeaders(requestHeaders),
    };
  }

  if (!resolveTrustedOrigins(requestHeaders).has(origin)) {
    throw new UntrustedActionOriginError("Origem da acao nao confiavel.");
  }

  return {
    headers: requestHeaders,
    context: getRequestContextFromHeaders(requestHeaders),
  };
}
