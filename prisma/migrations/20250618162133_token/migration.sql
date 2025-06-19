-- CreateTable
CREATE TABLE "token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "address" VARCHAR NOT NULL,
    "logo_uri" VARCHAR,
    "name" VARCHAR NOT NULL,
    "symbol" VARCHAR NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "platform_id" VARCHAR NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "token_id_key" ON "token"("id");

-- CreateIndex
CREATE UNIQUE INDEX "token_address_key" ON "token"("address");

-- CreateIndex
CREATE INDEX "token_tags_idx" ON "token" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "token_created_at_idx" ON "token"("created_at" DESC);

-- CreateIndex
CREATE INDEX "token_updated_at_idx" ON "token"("updated_at" DESC);
