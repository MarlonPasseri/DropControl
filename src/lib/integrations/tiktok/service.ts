import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  FinancialCategory,
  FinancialEntryType,
  OrderStatus,
  ProductStatus,
  SalesChannelProvider,
  SalesChannelStatus,
  SalesChannelSyncStatus,
  SalesChannelSyncType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/integrations/tiktok/crypto";
import { getTikTokShopConfig } from "@/lib/integrations/tiktok/config";

const TIKTOK_PROVIDER = SalesChannelProvider.TIKTOK_SHOP;
const TIKTOK_DISPLAY_NAME = "TikTok Shop";
const MULTI_ITEM_PRODUCT_SKU = "TTS-MULTI-ITEM";
const MULTI_ITEM_PRODUCT_NAME = "Pedido multiproduto TikTok Shop";
const PLATFORM_FEE_DESCRIPTION = "[TikTok Shop] Taxa da plataforma";
const REFUND_DESCRIPTION = "[TikTok Shop] Reembolso sincronizado";

type RecordValue = Record<string, unknown>;

type NormalizedTikTokProduct = {
  externalProductId: string;
  externalSkuId?: string;
  sku?: string;
  title: string;
  category?: string;
  salesPrice?: number;
  rawPayload: RecordValue;
};

type NormalizedTikTokOrderItem = {
  externalProductId?: string;
  externalSkuId?: string;
  sku?: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

type NormalizedTikTokOrder = {
  externalOrderId: string;
  status: OrderStatus;
  rawStatus?: string;
  purchaseDate: Date;
  totalAmount: number;
  customerName: string;
  customerEmail?: string;
  trackingCode?: string;
  platformFee?: number;
  refundAmount?: number;
  lineItems: NormalizedTikTokOrderItem[];
  rawPayload: RecordValue;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializePayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function getNestedValue(input: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, input);
}

function pickFirstValue(input: unknown, paths: string[]) {
  for (const path of paths) {
    const value = getNestedValue(input, path);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function pickString(input: unknown, paths: string[]) {
  const value = pickFirstValue(input, paths);

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return undefined;
}

function pickNumber(input: unknown, paths: string[]) {
  const value = pickFirstValue(input, paths);

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.includes(",") && !value.includes(".")
      ? value.replace(",", ".")
      : value;
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function pickDate(input: unknown, paths: string[]) {
  const value = pickFirstValue(input, paths);

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

function readArrayCandidate(input: unknown, paths: string[]) {
  for (const path of paths) {
    const value = getNestedValue(input, path);

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeSku(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, "-").toUpperCase();
  return normalized || undefined;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildProductSku(rawSku: string | undefined, title: string, fallbackId: string) {
  return (
    normalizeSku(rawSku) ??
    `TTS-${slugify(title).slice(0, 28) || fallbackId.slice(0, 12).toUpperCase()}`
  );
}

function mergeNotes(existingNotes: string | null | undefined, additions: string[]) {
  const lines = existingNotes ? existingNotes.split("\n").map((line) => line.trim()).filter(Boolean) : [];

  for (const addition of additions) {
    if (!lines.includes(addition)) {
      lines.push(addition);
    }
  }

  return lines.join("\n");
}

function buildAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel concluir a autenticacao com o TikTok Shop.";
}

function mapTikTokOrderStatus(rawStatus: string | undefined) {
  const normalized = rawStatus?.trim().toUpperCase();

  if (!normalized) {
    return OrderStatus.PAID;
  }

  if (
    normalized.includes("REFUND") ||
    normalized.includes("REVERSED") ||
    normalized.includes("RETURNED")
  ) {
    return OrderStatus.REFUNDED;
  }

  if (normalized.includes("CANCEL") || normalized.includes("VOID")) {
    return OrderStatus.CANCELED;
  }

  if (normalized.includes("DELIVER") || normalized.includes("COMPLETED")) {
    return OrderStatus.DELIVERED;
  }

  if (
    normalized.includes("SHIP") ||
    normalized.includes("FULFILL") ||
    normalized.includes("HANDOVER")
  ) {
    return OrderStatus.SHIPPED;
  }

  if (normalized.includes("DELAY")) {
    return OrderStatus.DELAYED;
  }

  if (
    normalized.includes("ISSUE") ||
    normalized.includes("EXCEPTION") ||
    normalized.includes("HOLD")
  ) {
    return OrderStatus.ISSUE;
  }

  if (normalized.includes("PURCHASE")) {
    return OrderStatus.PURCHASED_FROM_SUPPLIER;
  }

  if (normalized.includes("WAIT")) {
    return OrderStatus.WAITING_SUPPLIER_PURCHASE;
  }

  return OrderStatus.PAID;
}

async function persistConnectionError(connectionId: string, message: string) {
  await prisma.salesChannelConnection.update({
    where: {
      id: connectionId,
    },
    data: {
      status: SalesChannelStatus.ERROR,
      lastError: message,
    },
  });
}

function buildAbsoluteUrl(baseUrl: string, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function buildTikTokApiSignature(input: {
  path: string;
  searchParams: URLSearchParams;
  body?: string;
  appSecret: string;
}) {
  const normalizedParams = Array.from(input.searchParams.entries())
    .filter(([key]) => key !== "sign" && key !== "access_token")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  const payload = `${input.appSecret}${input.path}${normalizedParams}${
    input.body ?? ""
  }${input.appSecret}`;

  return createHmac("sha256", input.appSecret).update(payload).digest("hex");
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function resolveTokenExpiry(value: number | undefined) {
  if (!value) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const tenYearsInSeconds = 10 * 365 * 24 * 60 * 60;
  const expiresAtSeconds =
    value > nowInSeconds + tenYearsInSeconds ? value : nowInSeconds + value;

  return new Date(expiresAtSeconds * 1000);
}

function extractTokenEnvelope(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const data = isRecord(payload.data) ? payload.data : payload;

  const grantedScopes = Array.isArray(data.granted_scopes)
    ? data.granted_scopes.filter((scope): scope is string => typeof scope === "string")
    : undefined;

  return {
    accessToken: pickString(data, ["access_token", "accessToken", "token"]),
    refreshToken: pickString(data, ["refresh_token", "refreshToken"]),
    expiresIn:
      pickNumber(data, ["access_token_expire_in", "expires_in", "expire_in"]) ??
      pickNumber(data, ["accessTokenExpireIn"]),
    refreshExpiresIn:
      pickNumber(data, ["refresh_token_expire_in", "refresh_expires_in"]) ??
      pickNumber(data, ["refreshTokenExpireIn"]),
    shopId: pickString(data, ["shop_id", "shopId"]),
    shopCipher: pickString(data, ["shop_cipher", "shopCipher"]),
    shopCode: pickString(data, ["shop_code", "shopCode"]),
    shopName: pickString(data, ["shop_name", "shopName", "seller_name", "shop.name"]),
    shopRegion: pickString(data, ["shop_region", "shopRegion", "seller_base_region", "region"]),
    scopes: grantedScopes?.join(",") ?? pickString(data, ["scope", "scopes"]),
    rawPayload: data,
  };
}

async function tryTokenExchange(
  tokenUrl: string,
  payload: Record<string, string>,
  mode: "json" | "form" | "query" = "json",
) {
  const url = new URL(tokenUrl);
  const isQueryMode = mode === "query";
  const body =
    mode === "form"
      ? new URLSearchParams(payload)
      : mode === "json"
        ? JSON.stringify(payload)
        : undefined;

  if (isQueryMode) {
    for (const [key, value] of Object.entries(payload)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: isQueryMode ? "GET" : "POST",
    headers: {
      "Content-Type":
        mode === "form" ? "application/x-www-form-urlencoded" : "application/json",
      Accept: "application/json",
    },
    body,
  });
  const responseBody = await parseJsonResponse(response);

  const responseCode = pickNumber(responseBody, ["code"]);

  if (!response.ok || (responseCode !== undefined && responseCode !== 0)) {
    throw new Error(
      pickString(responseBody, ["message", "error.message", "data.message", "error", "raw"]) ??
        "Falha ao trocar o codigo do TikTok Shop por token.",
    );
  }

  return responseBody;
}

async function exchangeAuthCodeForTokens(input: {
  authCode: string;
  request: Request;
}) {
  const config = getTikTokShopConfig(input.request);

  if (!config.tokenUrl || !config.appKey || !config.appSecret || !config.redirectUri) {
    throw new Error(
      "Complete as variaveis do TikTok Shop antes de tentar conectar a conta.",
    );
  }

  const attempts: Array<Record<string, string>> = [
    {
      app_key: config.appKey,
      app_secret: config.appSecret,
      auth_code: input.authCode,
      grant_type: config.tokenGrantType,
      redirect_uri: config.redirectUri,
    },
    {
      client_key: config.appKey,
      client_secret: config.appSecret,
      code: input.authCode,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    },
  ];

  let lastError: Error | undefined;
  const tokenUrls = Array.from(
    new Set([config.tokenUrl, "https://auth.tiktok-shops.com/api/v2/token/get"].filter(Boolean)),
  ) as string[];

  for (const tokenUrl of tokenUrls) {
    for (const attempt of attempts) {
      for (const mode of ["json", "form", "query"] as const) {
        try {
          const response = await tryTokenExchange(tokenUrl, attempt, mode);
          const envelope = extractTokenEnvelope(response);

          if (envelope?.accessToken) {
            return envelope;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(buildAuthErrorMessage(error));
        }
      }
    }
  }

  throw lastError ?? new Error("O TikTok Shop nao retornou um access token valido.");
}

async function refreshTokensForConnection(connectionId: string) {
  const connection = await prisma.salesChannelConnection.findUnique({
    where: {
      id: connectionId,
    },
  });

  if (!connection) {
    throw new Error("Conexao do TikTok Shop nao encontrada.");
  }

  const refreshToken = decryptSecret(connection.refreshToken);

  if (!refreshToken) {
    throw new Error("Nao existe refresh token salvo para essa conexao.");
  }

  const config = getTikTokShopConfig();

  if (!config.tokenUrl || !config.appKey || !config.appSecret) {
    throw new Error("As variaveis do TikTok Shop nao estao completas para renovar o token.");
  }

  const attempts: Array<Record<string, string>> = [
    {
      app_key: config.appKey,
      app_secret: config.appSecret,
      refresh_token: refreshToken,
      grant_type: config.refreshGrantType,
    },
    {
      client_key: config.appKey,
      client_secret: config.appSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    },
  ];

  let lastError: Error | undefined;
  const tokenUrls = Array.from(
    new Set([
      config.tokenUrl,
      "https://auth.tiktok-shops.com/api/v2/token/refresh",
    ].filter(Boolean)),
  ) as string[];

  for (const tokenUrl of tokenUrls) {
    for (const attempt of attempts) {
      for (const mode of ["json", "form", "query"] as const) {
        try {
          const response = await tryTokenExchange(tokenUrl, attempt, mode);
          const envelope = extractTokenEnvelope(response);

          if (!envelope?.accessToken) {
            continue;
          }

          const updatedConnection = await prisma.salesChannelConnection.update({
            where: {
              id: connection.id,
            },
            data: {
              accessToken: encryptSecret(envelope.accessToken),
              refreshToken: envelope.refreshToken
                ? encryptSecret(envelope.refreshToken)
                : connection.refreshToken,
              accessTokenExpiresAt:
                resolveTokenExpiry(envelope.expiresIn) ?? connection.accessTokenExpiresAt,
              refreshTokenExpiresAt:
                resolveTokenExpiry(envelope.refreshExpiresIn) ??
                connection.refreshTokenExpiresAt,
              status: SalesChannelStatus.ACTIVE,
              lastError: null,
            },
          });

          return updatedConnection;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(buildAuthErrorMessage(error));
        }
      }
    }
  }

  await persistConnectionError(
    connection.id,
    lastError?.message ?? "Nao foi possivel renovar o token do TikTok Shop.",
  );

  throw lastError ?? new Error("Nao foi possivel renovar o token do TikTok Shop.");
}

async function ensureFreshConnectionToken(connectionId: string) {
  const connection = await prisma.salesChannelConnection.findUnique({
    where: {
      id: connectionId,
    },
  });

  if (!connection) {
    throw new Error("Conexao do TikTok Shop nao encontrada.");
  }

  if (
    connection.accessToken &&
    (!connection.accessTokenExpiresAt ||
      connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000)
  ) {
    return {
      connection,
      accessToken: decryptSecret(connection.accessToken),
    };
  }

  const refreshed = await refreshTokensForConnection(connectionId);

  return {
    connection: refreshed,
    accessToken: decryptSecret(refreshed.accessToken),
  };
}

async function fetchTikTokApiJson(input: {
  connectionId: string;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}) {
  const config = getTikTokShopConfig();

  if (!config.apiBaseUrl || !config.appKey || !config.appSecret) {
    throw new Error("Defina TIKTOK_SHOP_API_BASE_URL para sincronizar com o TikTok Shop.");
  }

  const { connection, accessToken } = await ensureFreshConnectionToken(input.connectionId);

  if (!accessToken) {
    throw new Error("Nao existe access token ativo para a conexao do TikTok Shop.");
  }

  const method = input.method ?? "GET";
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(buildAbsoluteUrl(config.apiBaseUrl, input.path));
  const bodyText = input.body ? JSON.stringify(input.body) : undefined;

  url.searchParams.set("app_key", config.appKey);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("access_token", accessToken);

  if (connection.shopCipher) {
    url.searchParams.set("shop_cipher", connection.shopCipher);
  }

  if (connection.shopId) {
    url.searchParams.set("shop_id", connection.shopId);
  }

  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set(
    "sign",
    buildTikTokApiSignature({
      path: url.pathname,
      searchParams: url.searchParams,
      body: bodyText,
      appSecret: config.appSecret,
    }),
  );

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-tts-access-token": accessToken,
      "x-tts-app-key": config.appKey,
    },
    body: method === "POST" ? bodyText ?? "{}" : undefined,
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response);
  const responseCode = pickNumber(payload, ["code"]);

  if (!response.ok || (responseCode !== undefined && responseCode !== 0)) {
    throw new Error(
      pickString(payload, ["message", "error.message", "data.message", "error", "raw"]) ??
        "Falha ao consultar o TikTok Shop.",
    );
  }

  return payload;
}

function normalizeTikTokProducts(payload: unknown): NormalizedTikTokProduct[] {
  const items = readArrayCandidate(payload, [
    "data.products",
    "data.product_list",
    "data.list",
    "data.items",
    "products",
    "product_list",
    "list",
    "items",
  ]);

  const normalized: NormalizedTikTokProduct[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    const productTitle =
      pickString(item, ["title", "name", "product_name", "product_title"]) ??
      "Produto TikTok Shop";
    const externalProductId = pickString(item, ["product_id", "id", "productId"]);

    if (!externalProductId) {
      continue;
    }

    const skuItems = readArrayCandidate(item, ["skus", "sku_list", "variants", "skuList"]);

    if (skuItems.length === 0) {
      normalized.push({
        externalProductId,
        sku: pickString(item, ["seller_sku", "sku", "code"]),
        title: productTitle,
        category: pickString(item, ["category_name", "category", "categoryName"]),
        salesPrice: pickNumber(item, ["sale_price", "price", "recommended_price"]),
        rawPayload: item,
      });
      continue;
    }

    for (const skuItem of skuItems) {
      if (!isRecord(skuItem)) {
        continue;
      }

      normalized.push({
        externalProductId,
        externalSkuId: pickString(skuItem, ["sku_id", "id", "skuId"]),
        sku:
          pickString(skuItem, ["seller_sku", "sku", "sku_code", "code"]) ??
          pickString(item, ["seller_sku", "sku"]),
        title:
          pickString(skuItem, ["title", "name", "sku_name"]) ??
          productTitle,
        category: pickString(item, ["category_name", "category", "categoryName"]),
        salesPrice:
          pickNumber(skuItem, ["sale_price", "price", "recommended_price"]) ??
          pickNumber(item, ["sale_price", "price", "recommended_price"]),
        rawPayload: {
          ...item,
          sku: skuItem,
        },
      });
    }
  }

  return normalized;
}

function normalizeTikTokOrders(payload: unknown): NormalizedTikTokOrder[] {
  const items = readArrayCandidate(payload, [
    "data.orders",
    "data.order_list",
    "data.list",
    "data.items",
    "orders",
    "order_list",
    "list",
    "items",
  ]);

  const normalized: NormalizedTikTokOrder[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    const externalOrderId = pickString(item, ["order_id", "id", "orderId"]);

    if (!externalOrderId) {
      continue;
    }

    const lineItemsSource = readArrayCandidate(item, [
      "line_items",
      "items",
      "product_list",
      "sku_list",
      "packages.0.item_list",
    ]);
    const lineItems: NormalizedTikTokOrderItem[] = [];

    for (const line of lineItemsSource) {
      if (!isRecord(line)) {
        continue;
      }

      lineItems.push({
        externalProductId: pickString(line, ["product_id", "productId"]),
        externalSkuId: pickString(line, ["sku_id", "skuId", "id"]),
        sku: pickString(line, ["seller_sku", "sku", "sku_code"]),
        title:
          pickString(line, ["product_name", "title", "name", "sku_name"]) ??
          "Produto TikTok Shop",
        quantity: pickNumber(line, ["quantity", "qty"]) ?? 1,
        unitPrice:
          pickNumber(line, ["sale_price", "price", "unit_price", "pay_amount"]) ?? 0,
      });
    }

    const totalAmount =
      pickNumber(item, ["payment.total_amount", "pay_amount", "total_amount", "order_amount"]) ??
      lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const rawStatus = pickString(item, ["status", "order_status", "display_status"]);

    normalized.push({
      externalOrderId,
      status: mapTikTokOrderStatus(rawStatus),
      rawStatus,
      purchaseDate:
        pickDate(item, ["create_time", "created_at", "createTime", "order_create_time"]) ??
        new Date(),
      totalAmount,
      customerName:
        pickString(item, [
          "buyer_name",
          "customer_name",
          "recipient_name",
          "shipping_address.name",
          "address.recipient_name",
        ]) ?? "Cliente TikTok Shop",
      customerEmail: pickString(item, ["buyer_email", "customer_email", "email"]),
      trackingCode: pickString(item, [
        "tracking_number",
        "tracking_no",
        "tracking_code",
        "shipping.tracking_number",
      ]),
      platformFee: pickNumber(item, [
        "fees.platform_fee",
        "platform_fee",
        "commission_fee",
      ]),
      refundAmount: pickNumber(item, [
        "refund_amount",
        "refund.total_amount",
        "after_sale.refund_amount",
      ]),
      lineItems,
      rawPayload: item,
    });
  }

  return normalized;
}

async function ensureTikTokSupplier(userId: string, shopName?: string | null) {
  const supplierName = shopName?.trim()
    ? `TikTok Shop - ${shopName.trim()}`
    : TIKTOK_DISPLAY_NAME;

  const existing = await prisma.supplier.findFirst({
    where: {
      userId,
      name: supplierName,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplier.create({
    data: {
      userId,
      name: supplierName,
      notes:
        "Fornecedor tecnico criado automaticamente para sincronizacao com o TikTok Shop.",
    },
  });
}

async function ensureMultiItemProduct(userId: string, supplierId: string) {
  const existing = await prisma.product.findFirst({
    where: {
      userId,
      sku: MULTI_ITEM_PRODUCT_SKU,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.product.create({
    data: {
      userId,
      supplierId,
      name: MULTI_ITEM_PRODUCT_NAME,
      sku: MULTI_ITEM_PRODUCT_SKU,
      costPrice: 0,
      shippingCost: 0,
      salePrice: 0,
      estimatedMargin: 0,
      status: ProductStatus.ACTIVE,
      notes:
        "Produto tecnico para armazenar pedidos com multiplos itens vindos do TikTok Shop.",
    },
  });
}

async function upsertTikTokProductLink(input: {
  connectionId: string;
  productId: string;
  product: NormalizedTikTokProduct;
}) {
  const externalSkuKey = input.product.externalSkuId ?? "";

  const existingLink = await prisma.salesChannelProductLink.findUnique({
    where: {
      connectionId_externalProductId_externalSkuKey: {
        connectionId: input.connectionId,
        externalProductId: input.product.externalProductId,
        externalSkuKey,
      },
    },
  });

  if (existingLink) {
    return prisma.salesChannelProductLink.update({
      where: {
        id: existingLink.id,
      },
      data: {
        productId: input.productId,
        externalSkuId: input.product.externalSkuId,
        externalSku: input.product.sku,
        title: input.product.title,
        rawPayload: serializePayload(input.product.rawPayload),
        lastSeenAt: new Date(),
      },
    });
  }

  return prisma.salesChannelProductLink.create({
    data: {
      connectionId: input.connectionId,
      productId: input.productId,
      externalProductId: input.product.externalProductId,
      externalSkuId: input.product.externalSkuId,
      externalSkuKey,
      externalSku: input.product.sku,
      title: input.product.title,
      rawPayload: serializePayload(input.product.rawPayload),
      lastSeenAt: new Date(),
    },
  });
}

async function upsertTikTokOrderLink(input: {
  connectionId: string;
  orderId: string;
  order: NormalizedTikTokOrder;
}) {
  const existingLink = await prisma.salesChannelOrderLink.findUnique({
    where: {
      connectionId_externalOrderId: {
        connectionId: input.connectionId,
        externalOrderId: input.order.externalOrderId,
      },
    },
  });

  if (existingLink) {
    return prisma.salesChannelOrderLink.update({
      where: {
        id: existingLink.id,
      },
      data: {
        orderId: input.orderId,
        rawPayload: serializePayload(input.order.rawPayload),
        lastSeenAt: new Date(),
      },
    });
  }

  return prisma.salesChannelOrderLink.create({
    data: {
      connectionId: input.connectionId,
      orderId: input.orderId,
      externalOrderId: input.order.externalOrderId,
      rawPayload: serializePayload(input.order.rawPayload),
      lastSeenAt: new Date(),
    },
  });
}

async function findExistingProductForTikTokItem(input: {
  connectionId: string;
  userId: string;
  externalProductId?: string;
  externalSkuId?: string;
  sku?: string;
  title: string;
}) {
  if (input.externalProductId) {
    const link = await prisma.salesChannelProductLink.findFirst({
      where: {
        connectionId: input.connectionId,
        externalProductId: input.externalProductId,
        ...(input.externalSkuId
          ? {
              OR: [
                { externalSkuId: input.externalSkuId },
                { externalSkuKey: input.externalSkuId },
              ],
            }
          : {}),
      },
      include: {
        product: true,
      },
    });

    if (link?.product) {
      return link.product;
    }
  }

  const normalizedSku = normalizeSku(input.sku);

  if (normalizedSku) {
    const productBySku = await prisma.product.findFirst({
      where: {
        userId: input.userId,
        sku: {
          equals: normalizedSku,
          mode: "insensitive",
        },
      },
    });

    if (productBySku) {
      return productBySku;
    }
  }

  return prisma.product.findFirst({
    where: {
      userId: input.userId,
      name: {
        equals: input.title,
        mode: "insensitive",
      },
    },
  });
}

async function ensureProductForTikTokCatalogItem(input: {
  connectionId: string;
  userId: string;
  supplierId: string;
  product: NormalizedTikTokProduct;
}) {
  const existing = await findExistingProductForTikTokItem({
    connectionId: input.connectionId,
    userId: input.userId,
    externalProductId: input.product.externalProductId,
    externalSkuId: input.product.externalSkuId,
    sku: input.product.sku,
    title: input.product.title,
  });

  const sku = buildProductSku(
    input.product.sku,
    input.product.title,
    input.product.externalSkuId ?? input.product.externalProductId,
  );
  const salePrice = Number((input.product.salesPrice ?? existing?.salePrice.toNumber() ?? 0).toFixed(2));

  if (existing) {
    const updated = await prisma.product.update({
      where: {
        id: existing.id,
      },
      data: {
        supplierId: input.supplierId,
        name: input.product.title,
        sku,
        category: input.product.category ?? existing.category,
        salePrice,
        estimatedMargin: Number(
          (salePrice - existing.costPrice.toNumber() - existing.shippingCost.toNumber()).toFixed(2),
        ),
        status: ProductStatus.ACTIVE,
        notes: mergeNotes(existing.notes, [
          "Sincronizado automaticamente com o TikTok Shop.",
          `Produto externo ${input.product.externalProductId}`,
        ]),
      },
    });

    await upsertTikTokProductLink({
      connectionId: input.connectionId,
      productId: updated.id,
      product: input.product,
    });

    return { product: updated, created: false };
  }

  const created = await prisma.product.create({
    data: {
      userId: input.userId,
      supplierId: input.supplierId,
      name: input.product.title,
      sku,
      category: input.product.category,
      costPrice: 0,
      shippingCost: 0,
      salePrice,
      estimatedMargin: salePrice,
      status: ProductStatus.ACTIVE,
      notes: [
        "Criado automaticamente a partir da sincronizacao com o TikTok Shop.",
        `Produto externo ${input.product.externalProductId}`,
      ].join("\n"),
    },
  });

  await upsertTikTokProductLink({
    connectionId: input.connectionId,
    productId: created.id,
    product: input.product,
  });

  return { product: created, created: true };
}

async function ensureProductForTikTokOrder(input: {
  connectionId: string;
  userId: string;
  supplierId: string;
  order: NormalizedTikTokOrder;
}) {
  const uniqueSkus = Array.from(
    new Set(input.order.lineItems.map((item) => normalizeSku(item.sku)).filter(Boolean)),
  );

  if (uniqueSkus.length > 1 || input.order.lineItems.length > 1) {
    return ensureMultiItemProduct(input.userId, input.supplierId);
  }

  const [lineItem] = input.order.lineItems;

  if (!lineItem) {
    return ensureMultiItemProduct(input.userId, input.supplierId);
  }

  const existing = await findExistingProductForTikTokItem({
    connectionId: input.connectionId,
    userId: input.userId,
    externalProductId: lineItem.externalProductId,
    externalSkuId: lineItem.externalSkuId,
    sku: lineItem.sku,
    title: lineItem.title,
  });

  if (existing) {
    if (lineItem.externalProductId) {
      await upsertTikTokProductLink({
        connectionId: input.connectionId,
        productId: existing.id,
        product: {
          externalProductId: lineItem.externalProductId,
          externalSkuId: lineItem.externalSkuId,
          sku: lineItem.sku,
          title: lineItem.title,
          salesPrice: lineItem.unitPrice,
          rawPayload: input.order.rawPayload,
        },
      });
    }

    return existing;
  }

  const created = await prisma.product.create({
    data: {
      userId: input.userId,
      supplierId: input.supplierId,
      name: lineItem.title,
      sku: buildProductSku(
        lineItem.sku,
        lineItem.title,
        lineItem.externalSkuId ?? lineItem.externalProductId ?? input.order.externalOrderId,
      ),
      costPrice: 0,
      shippingCost: 0,
      salePrice: Number(lineItem.unitPrice.toFixed(2)),
      estimatedMargin: Number(lineItem.unitPrice.toFixed(2)),
      status: ProductStatus.ACTIVE,
      notes: [
        "Criado automaticamente a partir de um pedido sincronizado do TikTok Shop.",
        `Pedido externo ${input.order.externalOrderId}`,
      ].join("\n"),
    },
  });

  if (lineItem.externalProductId) {
    await upsertTikTokProductLink({
      connectionId: input.connectionId,
      productId: created.id,
      product: {
        externalProductId: lineItem.externalProductId,
        externalSkuId: lineItem.externalSkuId,
        sku: lineItem.sku,
        title: lineItem.title,
        salesPrice: lineItem.unitPrice,
        rawPayload: input.order.rawPayload,
      },
    });
  }

  return created;
}

async function syncPlatformFee(orderId: string, referenceDate: Date, amount?: number) {
  if (!amount || amount <= 0) {
    return;
  }

  const existing = await prisma.financialEntry.findFirst({
    where: {
      orderId,
      type: FinancialEntryType.EXPENSE,
      category: FinancialCategory.PLATFORM_FEE,
      description: PLATFORM_FEE_DESCRIPTION,
    },
  });

  if (existing) {
    await prisma.financialEntry.update({
      where: {
        id: existing.id,
      },
      data: {
        amount: Number(amount.toFixed(2)),
        referenceDate,
      },
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      userId: true,
    },
  });

  if (!order) {
    return;
  }

  await prisma.financialEntry.create({
    data: {
      userId: order.userId,
      orderId,
      type: FinancialEntryType.EXPENSE,
      category: FinancialCategory.PLATFORM_FEE,
      amount: Number(amount.toFixed(2)),
      referenceDate,
      description: PLATFORM_FEE_DESCRIPTION,
    },
  });
}

async function syncRefundEntry(orderId: string, referenceDate: Date, amount?: number) {
  if (!amount || amount <= 0) {
    return;
  }

  const existing = await prisma.financialEntry.findFirst({
    where: {
      orderId,
      type: FinancialEntryType.REFUND,
      category: FinancialCategory.REFUND,
      description: REFUND_DESCRIPTION,
    },
  });

  if (existing) {
    await prisma.financialEntry.update({
      where: {
        id: existing.id,
      },
      data: {
        amount: Number(amount.toFixed(2)),
        referenceDate,
      },
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      userId: true,
    },
  });

  if (!order) {
    return;
  }

  await prisma.financialEntry.create({
    data: {
      userId: order.userId,
      orderId,
      type: FinancialEntryType.REFUND,
      category: FinancialCategory.REFUND,
      amount: Number(amount.toFixed(2)),
      referenceDate,
      description: REFUND_DESCRIPTION,
    },
  });
}

async function syncTikTokProducts(connectionId: string, userId: string) {
  const connection = await prisma.salesChannelConnection.findUnique({
    where: {
      id: connectionId,
    },
  });

  if (!connection) {
    throw new Error("Conexao do TikTok Shop nao encontrada.");
  }

  const config = getTikTokShopConfig();

  if (!config.productsPath) {
    throw new Error("Defina TIKTOK_SHOP_PRODUCTS_PATH para sincronizar produtos.");
  }

  const payload = await fetchTikTokApiJson({
    connectionId,
    path: config.productsPath,
    method: "POST",
    body: {
      page_size: 50,
    },
  });
  const products = normalizeTikTokProducts(payload);
  const supplier = await ensureTikTokSupplier(userId, connection.shopName);
  let createdProducts = 0;
  let updatedProducts = 0;

  for (const product of products) {
    const result = await ensureProductForTikTokCatalogItem({
      connectionId,
      userId,
      supplierId: supplier.id,
      product,
    });

    if (result.created) {
      createdProducts += 1;
    } else {
      updatedProducts += 1;
    }
  }

  await prisma.salesChannelConnection.update({
    where: {
      id: connectionId,
    },
    data: {
      lastProductsSyncAt: new Date(),
      lastSyncedAt: new Date(),
      status: SalesChannelStatus.ACTIVE,
      lastError: null,
    },
  });

  return {
    total: products.length,
    createdProducts,
    updatedProducts,
  };
}

async function syncTikTokOrders(connectionId: string, userId: string) {
  const connection = await prisma.salesChannelConnection.findUnique({
    where: {
      id: connectionId,
    },
  });

  if (!connection) {
    throw new Error("Conexao do TikTok Shop nao encontrada.");
  }

  const config = getTikTokShopConfig();

  if (!config.ordersPath) {
    throw new Error("Defina TIKTOK_SHOP_ORDERS_PATH para sincronizar pedidos.");
  }

  const payload = await fetchTikTokApiJson({
    connectionId,
    path: config.ordersPath,
    method: "POST",
    body: {
      page_size: 50,
    },
  });
  const orders = normalizeTikTokOrders(payload);
  const supplier = await ensureTikTokSupplier(userId, connection.shopName);
  let createdOrders = 0;
  let updatedOrders = 0;

  for (const order of orders) {
    const product = await ensureProductForTikTokOrder({
      connectionId,
      userId,
      supplierId: supplier.id,
      order,
    });
    const orderNumber = `TTS-${order.externalOrderId}`;
    const existingLink = await prisma.salesChannelOrderLink.findUnique({
      where: {
        connectionId_externalOrderId: {
          connectionId,
          externalOrderId: order.externalOrderId,
        },
      },
      include: {
        order: true,
      },
    });
    const totalCost =
      product.sku === MULTI_ITEM_PRODUCT_SKU
        ? 0
        : Number(
            (
              (product.costPrice.toNumber() + product.shippingCost.toNumber()) *
              Math.max(order.lineItems[0]?.quantity ?? 1, 1)
            ).toFixed(2),
          );
    const orderNotes = [
      "Sincronizado automaticamente com o TikTok Shop.",
      `Pedido externo ${order.externalOrderId}`,
      order.rawStatus ? `Status original: ${order.rawStatus}` : null,
      order.lineItems.length > 1
        ? `Itens no pedido: ${order.lineItems.map((item) => item.title).join(" | ")}`
        : null,
    ].filter((value): value is string => Boolean(value));

    if (existingLink?.order) {
      const updated = await prisma.order.update({
        where: {
          id: existingLink.order.id,
        },
        data: {
          productId: product.id,
          supplierId: supplier.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail ?? existingLink.order.customerEmail,
          saleAmount: Number(order.totalAmount.toFixed(2)),
          totalCost:
            totalCost > 0
              ? totalCost
              : existingLink.order.totalCost.toNumber(),
          status: order.status,
          trackingCode: order.trackingCode ?? existingLink.order.trackingCode,
          purchaseDate: order.purchaseDate,
          notes: mergeNotes(existingLink.order.notes, orderNotes),
        },
      });

      await upsertTikTokOrderLink({
        connectionId,
        orderId: updated.id,
        order,
      });
      await syncPlatformFee(updated.id, order.purchaseDate, order.platformFee);
      await syncRefundEntry(updated.id, order.purchaseDate, order.refundAmount);
      updatedOrders += 1;
      continue;
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        orderNumber,
      },
    });

    if (existingOrder) {
      const updated = await prisma.order.update({
        where: {
          id: existingOrder.id,
        },
        data: {
          productId: product.id,
          supplierId: supplier.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail ?? existingOrder.customerEmail,
          saleAmount: Number(order.totalAmount.toFixed(2)),
          totalCost: totalCost > 0 ? totalCost : existingOrder.totalCost.toNumber(),
          status: order.status,
          trackingCode: order.trackingCode ?? existingOrder.trackingCode,
          purchaseDate: order.purchaseDate,
          notes: mergeNotes(existingOrder.notes, orderNotes),
        },
      });

      await upsertTikTokOrderLink({
        connectionId,
        orderId: updated.id,
        order,
      });
      await syncPlatformFee(updated.id, order.purchaseDate, order.platformFee);
      await syncRefundEntry(updated.id, order.purchaseDate, order.refundAmount);
      updatedOrders += 1;
      continue;
    }

    const created = await prisma.order.create({
      data: {
        userId,
        productId: product.id,
        supplierId: supplier.id,
        orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        saleAmount: Number(order.totalAmount.toFixed(2)),
        totalCost,
        status: order.status,
        trackingCode: order.trackingCode,
        purchaseDate: order.purchaseDate,
        notes: orderNotes.join("\n"),
      },
    });

    await upsertTikTokOrderLink({
      connectionId,
      orderId: created.id,
      order,
    });
    await syncPlatformFee(created.id, order.purchaseDate, order.platformFee);
    await syncRefundEntry(created.id, order.purchaseDate, order.refundAmount);
    createdOrders += 1;
  }

  await prisma.salesChannelConnection.update({
    where: {
      id: connectionId,
    },
    data: {
      lastOrdersSyncAt: new Date(),
      lastSyncedAt: new Date(),
      status: SalesChannelStatus.ACTIVE,
      lastError: null,
    },
  });

  return {
    total: orders.length,
    createdOrders,
    updatedOrders,
  };
}

async function createSyncRun(connectionId: string, type: SalesChannelSyncType) {
  return prisma.salesChannelSyncRun.create({
    data: {
      connectionId,
      type,
      status: SalesChannelSyncStatus.RUNNING,
      summary: "Sincronizacao iniciada.",
    },
  });
}

async function finishSyncRun(input: {
  runId: string;
  status: SalesChannelSyncStatus;
  summary: string;
  payload?: unknown;
}) {
  await prisma.salesChannelSyncRun.update({
    where: {
      id: input.runId,
    },
    data: {
      status: input.status,
      summary: input.summary,
      payload: input.payload ? serializePayload(input.payload) : undefined,
    },
  });
}

export async function ensureTikTokConnection(userId: string) {
  return prisma.salesChannelConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: TIKTOK_PROVIDER,
      },
    },
    create: {
      userId,
      provider: TIKTOK_PROVIDER,
      status: SalesChannelStatus.PENDING,
      displayName: TIKTOK_DISPLAY_NAME,
    },
    update: {
      displayName: TIKTOK_DISPLAY_NAME,
    },
  });
}

export async function beginTikTokAuthorization(input: {
  userId: string;
  request: Request;
}) {
  const config = getTikTokShopConfig(input.request);

  if (!config.canConnect || !config.authUrl || !config.appKey || !config.redirectUri) {
    throw new Error(
      `Configure o TikTok Shop antes de conectar: ${config.missingConnectionFields.join(", ")}.`,
    );
  }

  const connection = await ensureTikTokConnection(input.userId);
  const stateToken = randomUUID();
  await prisma.salesChannelConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      stateToken,
      stateExpiresAt: new Date(Date.now() + 1000 * 60 * 15),
      status: SalesChannelStatus.PENDING,
      lastError: null,
    },
  });

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("app_key", config.appKey);
  authUrl.searchParams.set("client_key", config.appKey);
  authUrl.searchParams.set("state", stateToken);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);

  if (config.scopes.length > 0) {
    authUrl.searchParams.set("scope", config.scopes.join(","));
  }

  return authUrl.toString();
}

export async function completeTikTokAuthorization(request: Request) {
  const url = new URL(request.url);
  const stateToken = url.searchParams.get("state")?.trim();
  const authCode =
    url.searchParams.get("auth_code")?.trim() ?? url.searchParams.get("code")?.trim();
  const authError =
    url.searchParams.get("error_description")?.trim() ??
    url.searchParams.get("error")?.trim();

  if (!stateToken) {
    throw new Error("O TikTok Shop retornou sem o parametro de estado da conexao.");
  }

  const connection = await prisma.salesChannelConnection.findFirst({
    where: {
      provider: TIKTOK_PROVIDER,
      stateToken,
      stateExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!connection) {
    throw new Error("A conexao do TikTok Shop expirou. Tente conectar novamente.");
  }

  if (authError) {
    await persistConnectionError(connection.id, authError);
    throw new Error(authError);
  }

  if (!authCode) {
    await persistConnectionError(
      connection.id,
      "O TikTok Shop nao retornou o codigo de autorizacao.",
    );
    throw new Error("O TikTok Shop nao retornou o codigo de autorizacao.");
  }

  const tokenEnvelope = await exchangeAuthCodeForTokens({
    authCode,
    request,
  });

  if (!tokenEnvelope.accessToken) {
    await persistConnectionError(
      connection.id,
      "O TikTok Shop nao retornou um access token valido.",
    );
    throw new Error("O TikTok Shop nao retornou um access token valido.");
  }

  await prisma.salesChannelConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      status: SalesChannelStatus.ACTIVE,
      accessToken: encryptSecret(tokenEnvelope.accessToken),
      refreshToken: tokenEnvelope.refreshToken
        ? encryptSecret(tokenEnvelope.refreshToken)
        : null,
      accessTokenExpiresAt: resolveTokenExpiry(tokenEnvelope.expiresIn),
      refreshTokenExpiresAt: resolveTokenExpiry(tokenEnvelope.refreshExpiresIn),
      shopId: tokenEnvelope.shopId ?? connection.shopId,
      shopCipher:
        tokenEnvelope.shopCipher ??
        url.searchParams.get("shop_cipher")?.trim() ??
        connection.shopCipher,
      shopCode:
        tokenEnvelope.shopCode ??
        url.searchParams.get("shop_code")?.trim() ??
        connection.shopCode,
      shopName:
        tokenEnvelope.shopName ??
        url.searchParams.get("shop_name")?.trim() ??
        connection.shopName,
      shopRegion:
        tokenEnvelope.shopRegion ??
        url.searchParams.get("shop_region")?.trim() ??
        connection.shopRegion,
      scopes: tokenEnvelope.scopes ?? connection.scopes,
      stateToken: null,
      stateExpiresAt: null,
      lastError: null,
      metadata: serializePayload(tokenEnvelope.rawPayload),
    },
  });

  return {
    userId: connection.userId,
    message: "Conta do TikTok Shop conectada com sucesso.",
  };
}

export async function disconnectTikTokConnection(userId: string) {
  const connection = await ensureTikTokConnection(userId);

  await prisma.salesChannelConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      status: SalesChannelStatus.DISCONNECTED,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      stateToken: null,
      stateExpiresAt: null,
      lastError: null,
    },
  });
}

export async function runTikTokManualSync(input: {
  userId: string;
  type: SalesChannelSyncType;
}) {
  const connection = await prisma.salesChannelConnection.findFirst({
    where: {
      userId: input.userId,
      provider: TIKTOK_PROVIDER,
    },
  });

  if (!connection || connection.status !== SalesChannelStatus.ACTIVE) {
    throw new Error("Conecte uma conta do TikTok Shop antes de sincronizar.");
  }

  const syncRun = await createSyncRun(connection.id, input.type);

  try {
    const summary: Record<string, unknown> = {};
    const summaries: string[] = [];

    if (input.type === SalesChannelSyncType.FULL || input.type === SalesChannelSyncType.PRODUCTS) {
      const productResult = await syncTikTokProducts(connection.id, input.userId);
      summary.products = productResult;
      summaries.push(
        `${productResult.total} produto(s) lido(s), ${productResult.createdProducts} criado(s) e ${productResult.updatedProducts} atualizado(s).`,
      );
    }

    if (input.type === SalesChannelSyncType.FULL || input.type === SalesChannelSyncType.ORDERS) {
      const orderResult = await syncTikTokOrders(connection.id, input.userId);
      summary.orders = orderResult;
      summaries.push(
        `${orderResult.total} pedido(s) lido(s), ${orderResult.createdOrders} criado(s) e ${orderResult.updatedOrders} atualizado(s).`,
      );
    }

    const finalSummary = summaries.join(" ");
    await finishSyncRun({
      runId: syncRun.id,
      status: SalesChannelSyncStatus.SUCCESS,
      summary: finalSummary || "Sincronizacao concluida.",
      payload: summary,
    });

    return finalSummary || "Sincronizacao concluida com sucesso.";
  } catch (error) {
    const message = buildAuthErrorMessage(error);

    await prisma.salesChannelConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        status: SalesChannelStatus.ERROR,
        lastError: message,
      },
    });
    await finishSyncRun({
      runId: syncRun.id,
      status: SalesChannelSyncStatus.ERROR,
      summary: message,
    });

    throw error;
  }
}

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (signature.includes("t=") && signature.includes("s=")) {
    const parts = Object.fromEntries(
      signature.split(",").map((part) => {
        const [key, ...value] = part.split("=");
        return [key.trim(), value.join("=").trim()];
      }),
    );
    const timestamp = parts.t;
    const receivedSignature = parts.s;

    if (!timestamp || !receivedSignature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(receivedSignature);

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  const hexDigest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const base64Digest = createHmac("sha256", secret).update(rawBody).digest("base64");
  const normalizedSignature = signature.trim();

  const pairs = [
    [hexDigest, normalizedSignature],
    [base64Digest, normalizedSignature],
    [hexDigest.toLowerCase(), normalizedSignature.toLowerCase()],
    [base64Digest.toLowerCase(), normalizedSignature.toLowerCase()],
  ] as const;

  return pairs.some(([expected, received]) => {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  });
}

async function upsertOrderStatusFromWebhook(connectionId: string, order: NormalizedTikTokOrder) {
  const existingLink = await prisma.salesChannelOrderLink.findUnique({
    where: {
      connectionId_externalOrderId: {
        connectionId,
        externalOrderId: order.externalOrderId,
      },
    },
    include: {
      order: true,
    },
  });

  if (!existingLink?.order) {
    return false;
  }

  await prisma.order.update({
    where: {
      id: existingLink.order.id,
    },
    data: {
      status: order.status,
      trackingCode: order.trackingCode ?? existingLink.order.trackingCode,
      notes: mergeNotes(existingLink.order.notes, [
        "Atualizado automaticamente por webhook do TikTok Shop.",
        order.rawStatus ? `Status original: ${order.rawStatus}` : "",
      ].filter(Boolean)),
    },
  });
  await upsertTikTokOrderLink({
    connectionId,
    orderId: existingLink.order.id,
    order,
  });
  await syncPlatformFee(existingLink.order.id, order.purchaseDate, order.platformFee);
  await syncRefundEntry(existingLink.order.id, order.purchaseDate, order.refundAmount);

  return true;
}

export async function handleTikTokWebhook(input: {
  rawBody: string;
  headers: Headers;
}) {
  const config = getTikTokShopConfig();
  const signature =
    input.headers.get("tiktok-signature") ??
    input.headers.get("x-tts-signature") ??
    input.headers.get("x-tiktok-shop-signature") ??
    input.headers.get("x-signature");

  if (config.webhookSecret) {
    if (!signature || !verifyWebhookSignature(input.rawBody, signature, config.webhookSecret)) {
      throw new Error("Assinatura do webhook do TikTok Shop invalida.");
    }
  }

  if (!input.rawBody.trim()) {
    return {
      processed: 0,
      message: "Webhook recebido sem corpo para processar.",
    };
  }

  let payload: unknown;

  try {
    payload = JSON.parse(input.rawBody) as unknown;
  } catch {
    throw new Error("Webhook do TikTok Shop recebeu um JSON invalido.");
  }

  const shopIdentifier =
    pickString(payload, ["shop_id", "data.shop_id", "shopId"]) ??
    pickString(payload, ["shop_cipher", "data.shop_cipher", "shopCipher"]);
  const connection = await prisma.salesChannelConnection.findFirst({
    where: {
      provider: TIKTOK_PROVIDER,
      ...(shopIdentifier
        ? {
            OR: [{ shopId: shopIdentifier }, { shopCipher: shopIdentifier }],
          }
        : {}),
    },
  });

  if (!connection) {
    return {
      processed: 0,
      message: "Webhook recebido, mas nenhuma conexao correspondente foi encontrada.",
    };
  }

  const syncRun = await createSyncRun(connection.id, SalesChannelSyncType.WEBHOOK);

  try {
    const normalizedOrders = normalizeTikTokOrders(payload);
    let processed = 0;

    for (const order of normalizedOrders) {
      if (await upsertOrderStatusFromWebhook(connection.id, order)) {
        processed += 1;
      }
    }

    await prisma.salesChannelConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        lastWebhookAt: new Date(),
        status: SalesChannelStatus.ACTIVE,
        lastError: null,
      },
    });
    await finishSyncRun({
      runId: syncRun.id,
      status: SalesChannelSyncStatus.SUCCESS,
      summary: `${processed} pedido(s) atualizado(s) via webhook.`,
      payload,
    });

    return {
      processed,
      message: `${processed} pedido(s) atualizado(s) via webhook.`,
    };
  } catch (error) {
    const message = buildAuthErrorMessage(error);

    await prisma.salesChannelConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        status: SalesChannelStatus.ERROR,
        lastError: message,
      },
    });
    await finishSyncRun({
      runId: syncRun.id,
      status: SalesChannelSyncStatus.ERROR,
      summary: message,
      payload,
    });

    throw error;
  }
}
