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
    "platformId" VARCHAR
);

-- CreateTable
CREATE TABLE "platform" (
    "id" VARCHAR NOT NULL,
    "chain_identifier" INTEGER,
    "name" VARCHAR NOT NULL,
    "shortname" VARCHAR,
    "native_coin_id" VARCHAR NOT NULL,
    "images" JSONB NOT NULL,
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
CREATE UNIQUE INDEX "platform_id_key" ON "platform"("id");

-- CreateIndex
CREATE INDEX "platform_created_at_idx" ON "platform"("created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_updated_at_idx" ON "platform"("updated_at" DESC);

-- AddForeignKey
ALTER TABLE "token" ADD CONSTRAINT "token_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
