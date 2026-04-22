CREATE TABLE "audit_logs" (
    "id" VARCHAR(191) NOT NULL,
    "actor_user_id" VARCHAR(191),
    "actor_email" VARCHAR(320),
    "action" VARCHAR(80) NOT NULL,
    "resource" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(191),
    "summary" VARCHAR(500),
    "metadata" JSONB,
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "request_id" VARCHAR(191),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_events" (
    "id" VARCHAR(191) NOT NULL,
    "user_id" VARCHAR(191),
    "email" VARCHAR(320),
    "type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "message" VARCHAR(500),
    "metadata" JSONB,
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "request_id" VARCHAR(191),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "security_events_user_id_created_at_idx" ON "security_events"("user_id", "created_at");
CREATE INDEX "security_events_email_created_at_idx" ON "security_events"("email", "created_at");
CREATE INDEX "security_events_type_created_at_idx" ON "security_events"("type", "created_at");
CREATE INDEX "security_events_severity_created_at_idx" ON "security_events"("severity", "created_at");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
