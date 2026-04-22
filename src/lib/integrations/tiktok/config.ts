function cleanUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.trim().replace(/\/+$/, "");
}

function readOptionalPath(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getAppBaseUrl(request?: Request) {
  const configuredBaseUrl = cleanUrl(process.env.APP_URL ?? process.env.NEXTAUTH_URL);

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (!request) {
    return undefined;
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function getTikTokShopConfig(request?: Request) {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim();
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET?.trim();
  const authUrl = cleanUrl(process.env.TIKTOK_SHOP_AUTH_URL);
  const tokenUrl =
    cleanUrl(process.env.TIKTOK_SHOP_TOKEN_URL) ??
    "https://auth.tiktok-shops.com/api/v2/token/get";
  const apiBaseUrl = cleanUrl(process.env.TIKTOK_SHOP_API_BASE_URL);
  const scopes = process.env.TIKTOK_SHOP_SCOPES?.split(",")
    .map((scope) => scope.trim())
    .filter(Boolean) ?? [];
  const redirectUri = getAppBaseUrl(request)
    ? `${getAppBaseUrl(request)}/api/integrations/tiktok/callback`
    : undefined;
  const webhookUrl = getAppBaseUrl(request)
    ? `${getAppBaseUrl(request)}/api/integrations/tiktok/webhook`
    : undefined;

  const missingConnectionFields = [
    !appKey ? "TIKTOK_SHOP_APP_KEY" : null,
    !appSecret ? "TIKTOK_SHOP_APP_SECRET" : null,
    !authUrl ? "TIKTOK_SHOP_AUTH_URL" : null,
    !tokenUrl ? "TIKTOK_SHOP_TOKEN_URL" : null,
  ].filter((value): value is string => Boolean(value));

  const missingSyncFields = [
    !apiBaseUrl ? "TIKTOK_SHOP_API_BASE_URL" : null,
    !readOptionalPath(process.env.TIKTOK_SHOP_PRODUCTS_PATH) ? "TIKTOK_SHOP_PRODUCTS_PATH" : null,
    !readOptionalPath(process.env.TIKTOK_SHOP_ORDERS_PATH) ? "TIKTOK_SHOP_ORDERS_PATH" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    appKey,
    appSecret,
    authUrl,
    tokenUrl,
    apiBaseUrl,
    productsPath: readOptionalPath(process.env.TIKTOK_SHOP_PRODUCTS_PATH),
    ordersPath: readOptionalPath(process.env.TIKTOK_SHOP_ORDERS_PATH),
    shopInfoPath: readOptionalPath(process.env.TIKTOK_SHOP_SHOP_INFO_PATH),
    webhookSecret: process.env.TIKTOK_SHOP_WEBHOOK_SECRET?.trim() || undefined,
    tokenGrantType: process.env.TIKTOK_SHOP_TOKEN_GRANT_TYPE?.trim() || "authorized_code",
    refreshGrantType:
      process.env.TIKTOK_SHOP_REFRESH_GRANT_TYPE?.trim() || "refresh_token",
    scopes,
    redirectUri,
    webhookUrl,
    missingConnectionFields,
    missingSyncFields,
    canConnect: missingConnectionFields.length === 0 && Boolean(redirectUri),
    canSyncProducts:
      missingConnectionFields.length === 0 && Boolean(apiBaseUrl) && Boolean(readOptionalPath(process.env.TIKTOK_SHOP_PRODUCTS_PATH)),
    canSyncOrders:
      missingConnectionFields.length === 0 && Boolean(apiBaseUrl) && Boolean(readOptionalPath(process.env.TIKTOK_SHOP_ORDERS_PATH)),
  };
}
