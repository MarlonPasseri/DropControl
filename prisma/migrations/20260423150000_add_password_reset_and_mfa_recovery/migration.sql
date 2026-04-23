ALTER TABLE "users"
ADD COLUMN "mfa_recovery_codes" JSONB,
ADD COLUMN "password_reset_token_hash" TEXT,
ADD COLUMN "password_reset_token_expires_at" TIMESTAMP(3);
