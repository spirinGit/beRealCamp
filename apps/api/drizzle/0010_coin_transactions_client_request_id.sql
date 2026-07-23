ALTER TABLE "coin_transactions" ADD COLUMN "client_request_id" text;
CREATE UNIQUE INDEX "coin_transactions_client_request_id_unique" ON "coin_transactions" ("client_request_id");