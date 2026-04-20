import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { beginTikTokAuthorization } from "@/lib/integrations/tiktok/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const redirectUrl = await beginTikTokAuthorization({
      userId: session.user.id,
      request,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const url = new URL("/integrations", request.url);
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Nao foi possivel iniciar a conexao com o TikTok Shop.",
    );
    return NextResponse.redirect(url);
  }
}
