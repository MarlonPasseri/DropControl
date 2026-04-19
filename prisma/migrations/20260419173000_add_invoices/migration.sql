-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('PURCHASE', 'SALE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191) NOT NULL,
    "order_id" VARCHAR(191),
    "supplier_id" VARCHAR(191),
    "number" TEXT NOT NULL,
    "series" TEXT,
    "access_key" TEXT,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_user_id_status_issue_date_idx" ON "invoices"("user_id", "status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_user_id_type_status_idx" ON "invoices"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "invoices_supplier_id_idx" ON "invoices"("supplier_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
