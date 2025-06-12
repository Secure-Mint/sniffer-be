-- CreateTable
CREATE TABLE "token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "address" VARCHAR NOT NULL,
    "daily_volume" DOUBLE PRECISION,
    "decimals" INTEGER NOT NULL,
    "extensions" JSONB NOT NULL,
    "freeze_authority" VARCHAR,
    "logo_uri" VARCHAR,
    "mint_authority" VARCHAR,
    "minted_at" TIMESTAMP(3),
    "name" VARCHAR NOT NULL,
    "permanent_delegate" VARCHAR,
    "symbol" VARCHAR NOT NULL,
    "network" VARCHAR NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiry" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6)
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

-- CreateIndex
CREATE INDEX "token_minted_at_idx" ON "token"("minted_at" DESC);
