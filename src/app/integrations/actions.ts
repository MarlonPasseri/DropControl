"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SalesChannelSyncType } from "@prisma/client";
import {
  disconnectTikTokConnection,
  runTikTokManualSync,
} from "@/lib/integrations/tiktok/service";
import { requireUser } from "@/lib/require-user";

function integrationsRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/integrations?${query}` : "/integrations");
}

function revalidateIntegrationSurfaces() {
  revalidatePath("/integrations");
  revalidatePath("/products");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
}

export async function syncTikTokShop(formData: FormData) {
  const user = await requireUser();
  const syncMode = `${formData.get("type") ?? ""}`.trim();

  const syncTypeMap: Record<string, SalesChannelSyncType> = {
    full: SalesChannelSyncType.FULL,
    products: SalesChannelSyncType.PRODUCTS,
    orders: SalesChannelSyncType.ORDERS,
  };
  const syncType = syncTypeMap[syncMode];

  if (!syncType) {
    integrationsRedirect({
      error: "Selecione um tipo de sincronizacao valido.",
    });
  }

  try {
    const message = await runTikTokManualSync({
      userId: user.id,
      type: syncType,
    });

    revalidateIntegrationSurfaces();
    integrationsRedirect({
      success: message,
    });
  } catch (error) {
    integrationsRedirect({
      error: error instanceof Error ? error.message : "Nao foi possivel sincronizar o TikTok Shop.",
    });
  }
}

export async function disconnectTikTokShop() {
  const user = await requireUser();

  try {
    await disconnectTikTokConnection(user.id);
    revalidateIntegrationSurfaces();
    integrationsRedirect({
      success: "Conta do TikTok Shop desconectada com sucesso.",
    });
  } catch (error) {
    integrationsRedirect({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel desconectar a conta do TikTok Shop.",
    });
  }
}
