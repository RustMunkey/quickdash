-- Prevent the same provider capture from fulfilling more than one order.
-- PostgreSQL unique indexes permit multiple NULL values, so unpaid/manual
-- payments without an external ID remain supported.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_workspace_external_id_unique"
ON "payments" ("workspace_id", "external_id");
