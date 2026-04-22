import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/security/audit";

export const runtime = "nodejs";

const MAX_REPORT_LENGTH = 4096;

function truncate(value: string) {
  return value.length > MAX_REPORT_LENGTH
    ? `${value.slice(0, MAX_REPORT_LENGTH)}...`
    : value;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const rawBody = truncate(await request.text());

  if (rawBody) {
    console.warn("[security:csp-report]", {
      contentType,
      body: rawBody,
      userAgent: request.headers.get("user-agent"),
      forwardedFor: request.headers.get("x-forwarded-for"),
    });

    try {
      await recordSecurityEvent({
        type: "CSP_VIOLATION",
        severity: "WARN",
        message: "Content Security Policy report recebido.",
        metadata: {
          contentType,
          body: rawBody,
        },
      });
    } catch (error) {
      console.error("[security:csp-report:persist-error]", error);
    }
  }

  return new NextResponse(null, { status: 204 });
}
