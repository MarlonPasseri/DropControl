ALTER TABLE "users"
ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfa_secret_ciphertext" TEXT,
ADD COLUMN "mfa_enrolled_at" TIMESTAMP(3);
