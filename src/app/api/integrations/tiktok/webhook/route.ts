import { NextResponse } from "next/server";
import { handleTikTokWebhook } from "@/lib/integrations/tiktok/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge =
    url.searchParams.get("challenge") ??
    url.searchParams.get("hub.challenge") ??
    url.searchParams.get("echostr");

  if (challenge) {
    return new Response(challenge, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Webhook do TikTok Shop ativo.",
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await handleTikTokWebhook({
      rawBody,
      headers: request.headers,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar o webhook do TikTok Shop.",
      },
      {
        status: 400,
      },
    );
  }
}
