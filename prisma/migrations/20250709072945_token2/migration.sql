-- CreateIndex
CREATE INDEX "token_info_idx" ON "token" USING GIN ("info");

-- CreateIndex
CREATE INDEX "token_metadata_idx" ON "token" USING GIN ("metadata");
