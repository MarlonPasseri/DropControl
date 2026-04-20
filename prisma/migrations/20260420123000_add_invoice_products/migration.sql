-- CreateTable
CREATE TABLE "invoice_products" (
    "id" VARCHAR(191) NOT NULL,
    "invoice_id" VARCHAR(191) NOT NULL,
    "product_id" VARCHAR(191) NOT NULL,
    "item_number" TEXT,
    "xml_product_code" TEXT,
    "xml_ean" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "line_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_products_invoice_id_item_number_key" ON "invoice_products"("invoice_id", "item_number");

-- CreateIndex
CREATE INDEX "invoice_products_invoice_id_idx" ON "invoice_products"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_products_product_id_idx" ON "invoice_products"("product_id");

-- AddForeignKey
ALTER TABLE "invoice_products" ADD CONSTRAINT "invoice_products_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_products" ADD CONSTRAINT "invoice_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
