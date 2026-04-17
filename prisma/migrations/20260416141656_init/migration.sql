-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('WHATSAPP', 'WECHAT', 'EMAIL', 'TELEGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('TESTING', 'ACTIVE', 'WINNER', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'WAITING_SUPPLIER_PURCHASE', 'PURCHASED_FROM_SUPPLIER', 'SHIPPED', 'DELIVERED', 'DELAYED', 'ISSUE', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('INCOME', 'EXPENSE', 'REFUND');

-- CreateEnum
CREATE TYPE "FinancialCategory" AS ENUM ('ORDER_REVENUE', 'PRODUCT_COST', 'SHIPPING_COST', 'PLATFORM_FEE', 'AD_SPEND', 'REFUND', 'OPERATING_EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(191) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_channel" "ContactChannel",
    "region" TEXT,
    "avg_shipping_days" INTEGER,
    "reliability_score" DECIMAL(3,2),
    "issue_rate" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "supplier_id" VARCHAR(191) NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "store_link" TEXT,
    "supplier_link" TEXT,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "shipping_cost" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "estimated_margin" DECIMAL(10,2) NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "product_id" VARCHAR(191) NOT NULL,
    "supplier_id" VARCHAR(191) NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "sale_amount" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "tracking_code" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "estimated_delivery_date" TIMESTAMP(3),
    "delivered_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "order_id" VARCHAR(191),
    "type" "FinancialEntryType" NOT NULL,
    "category" "FinancialCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "related_order_id" VARCHAR(191),
    "related_product_id" VARCHAR(191),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "assignee_name" TEXT,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "suppliers_user_id_idx" ON "suppliers"("user_id");

-- CreateIndex
CREATE INDEX "suppliers_user_id_name_idx" ON "suppliers"("user_id", "name");

-- CreateIndex
CREATE INDEX "products_user_id_status_idx" ON "products"("user_id", "status");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_user_id_sku_key" ON "products"("user_id", "sku");

-- CreateIndex
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "orders_product_id_idx" ON "orders"("product_id");

-- CreateIndex
CREATE INDEX "orders_supplier_id_idx" ON "orders"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_order_number_key" ON "orders"("user_id", "order_number");

-- CreateIndex
CREATE INDEX "financial_entries_user_id_type_reference_date_idx" ON "financial_entries"("user_id", "type", "reference_date");

-- CreateIndex
CREATE INDEX "financial_entries_order_id_idx" ON "financial_entries"("order_id");

-- CreateIndex
CREATE INDEX "tasks_user_id_status_due_date_idx" ON "tasks"("user_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_related_order_id_idx" ON "tasks"("related_order_id");

-- CreateIndex
CREATE INDEX "tasks_related_product_id_idx" ON "tasks"("related_product_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
