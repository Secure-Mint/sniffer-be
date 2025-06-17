-- CreateTable
CREATE TABLE "platform" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform_id" VARCHAR NOT NULL,
    "chain_identifier" INTEGER,
    "name" VARCHAR NOT NULL,
    "shortname" VARCHAR,
    "native_coin_id" VARCHAR,
    "images" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6)
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_id_key" ON "platform"("id");

-- CreateIndex
CREATE INDEX "platform_created_at_idx" ON "platform"("created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_updated_at_idx" ON "platform"("updated_at" DESC);
