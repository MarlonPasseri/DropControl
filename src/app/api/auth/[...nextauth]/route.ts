import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import {
  assertApiAuthAllowed,
  recordApiAuthFailure,
} from "@/lib/security/auth-guard";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  try {
    assertApiAuthAllowed(request);
  } catch {
    recordApiAuthFailure(request);
    return Response.json(
      {
        error: "too_many_requests",
        message: "Muitas tentativas na autenticacao. Aguarde alguns minutos e tente novamente.",
      },
      {
        status: 429,
      },
    );
  }

  try {
    return await handlers.POST(request);
  } catch (error) {
    recordApiAuthFailure(request);
    throw error;
  }
}
