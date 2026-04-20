-- CreateEnum
CREATE TYPE "SalesChannelProvider" AS ENUM ('TIKTOK_SHOP');

-- CreateEnum
CREATE TYPE "SalesChannelStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'ACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SalesChannelSyncType" AS ENUM ('FULL', 'PRODUCTS', 'ORDERS', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SalesChannelSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'ERROR');

-- CreateTable
CREATE TABLE "sales_channel_connections" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "provider" "SalesChannelProvider" NOT NULL,
    "status" "SalesChannelStatus" NOT NULL DEFAULT 'PENDING',
    "display_name" TEXT NOT NULL,
    "shop_id" TEXT,
    "shop_cipher" TEXT,
    "shop_code" TEXT,
    "shop_name" TEXT,
    "shop_region" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scopes" TEXT,
    "state_token" TEXT,
    "state_expires_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_products_sync_at" TIMESTAMP(3),
    "last_orders_sync_at" TIMESTAMP(3),
    "last_webhook_at" TIMESTAMP(3),
    "last_error" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channel_sync_runs" (
    "id" VARCHAR(191) NOT NULL,
    "connection_id" VARCHAR(191) NOT NULL,
    "type" "SalesChannelSyncType" NOT NULL,
    "status" "SalesChannelSyncStatus" NOT NULL,
    "summary" TEXT,
    "payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channel_product_links" (
    "id" VARCHAR(191) NOT NULL,
    "connection_id" VARCHAR(191) NOT NULL,
    "product_id" VARCHAR(191) NOT NULL,
    "external_product_id" TEXT NOT NULL,
    "external_sku_id" TEXT,
    "external_sku_key" TEXT NOT NULL DEFAULT '',
    "external_sku" TEXT,
    "title" TEXT,
    "raw_payload" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_product_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channel_order_links" (
    "id" VARCHAR(191) NOT NULL,
    "connection_id" VARCHAR(191) NOT NULL,
    "order_id" VARCHAR(191) NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "raw_payload" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_order_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_channel_connections_user_id_provider_key" ON "sales_channel_connections"("user_id", "provider");

-- CreateIndex
CREATE INDEX "sales_channel_connections_provider_status_idx" ON "sales_channel_connections"("provider", "status");

-- CreateIndex
CREATE INDEX "sales_channel_connections_user_id_status_idx" ON "sales_channel_connections"("user_id", "status");

-- CreateIndex
CREATE INDEX "sales_channel_sync_runs_connection_id_created_at_idx" ON "sales_channel_sync_runs"("connection_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channel_product_links_connection_id_external_product_id_external_sku_key_key" ON "sales_channel_product_links"("connection_id", "external_product_id", "external_sku_key");

-- CreateIndex
CREATE INDEX "sales_channel_product_links_product_id_idx" ON "sales_channel_product_links"("product_id");

-- CreateIndex
CREATE INDEX "sales_channel_product_links_connection_id_last_seen_at_idx" ON "sales_channel_product_links"("connection_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channel_order_links_connection_id_external_order_id_key" ON "sales_channel_order_links"("connection_id", "external_order_id");

-- CreateIndex
CREATE INDEX "sales_channel_order_links_order_id_idx" ON "sales_channel_order_links"("order_id");

-- CreateIndex
CREATE INDEX "sales_channel_order_links_connection_id_last_seen_at_idx" ON "sales_channel_order_links"("connection_id", "last_seen_at");

-- AddForeignKey
ALTER TABLE "sales_channel_connections" ADD CONSTRAINT "sales_channel_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_sync_runs" ADD CONSTRAINT "sales_channel_sync_runs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "sales_channel_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_product_links" ADD CONSTRAINT "sales_channel_product_links_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "sales_channel_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_product_links" ADD CONSTRAINT "sales_channel_product_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_order_links" ADD CONSTRAINT "sales_channel_order_links_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "sales_channel_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_order_links" ADD CONSTRAINT "sales_channel_order_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
