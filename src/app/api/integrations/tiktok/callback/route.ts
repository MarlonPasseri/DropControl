import { NextResponse } from "next/server";
import { completeTikTokAuthorization } from "@/lib/integrations/tiktok/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const result = await completeTikTokAuthorization(request);
    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set("success", result.message);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Nao foi possivel finalizar a conexao com o TikTok Shop.",
    );
    return NextResponse.redirect(redirectUrl);
  }
}
