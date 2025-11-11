import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { streamArray } = require("stream-json/streamers/StreamArray");
const { parser } = require("stream-json/parser");
const { chain } = require("stream-chain");

import { Prisma, PrismaPromise } from "generated/prisma";
import { Solana, SOLANA, STABLE_COIN } from "../../utils";
import { prisma } from "../../services/PrismaService";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { CoingeckoService } from "../../services/GeckoService";
import { CoingeckoTerminalService } from "../../services/GeckoTerminalService";
import { JupiterService } from "../../services/JupiterService";
import { TokenExtendedInfo } from "../../models";
import { CoingeckoSimpleToken } from "../../../types";
import { createReadStream } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tokenService = new TokenService();
const coingeckoService = new CoingeckoService();
const coingeckoTerminalService = new CoingeckoTerminalService();
const jupiterService = new JupiterService();
const solanaService = new SolanaService(coingeckoService, coingeckoTerminalService);

const CHUNK_SIZE = 500;
const FILE_PATH = `${__dirname}/jupiter_tokens.json`;

const fetchAndSaveTokens = async () => {
  console.log("FETCHING TOKENS FROM JUPITER ...");
  await jupiterService.downloadJsonToFile(FILE_PATH);
  const stablecoins = await solanaService.fetchSPLStableCoins();
  const coinGeckoTokens: CoingeckoSimpleToken[] = await coingeckoService.fetchTokens();
  console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${coinGeckoTokens.length} \n`);

  await new Promise<void>((resolve, reject) => {
    const jupiterTokens: any[] = [];
    let totalCount = 0;
    let chunkIndex = 1;

    const pipeline = chain([createReadStream(FILE_PATH), parser(), streamArray()]);

    pipeline.on("data", async ({ value }: any) => {
      jupiterTokens.push(value);
      totalCount++;

      if (jupiterTokens.length >= CHUNK_SIZE) {
        pipeline.pause();
        try {
          const prismaPromises: PrismaPromise<any>[] = [];
          const mappedjupiterTokens = jupiterTokens.map(({ logoURI, ...rest }: any) => {
            return {
              ...rest,
              symbol: rest.symbol.toUpperCase(),
              logo_uri: logoURI
            };
          });

          for (let index = 0; index < mappedjupiterTokens.length; index++) {
            const jupiterToken = mappedjupiterTokens[index];
            const dbToken = await tokenService.findByAddress(jupiterToken.address);
            const dbTokenInfo = dbToken?.info as unknown as TokenExtendedInfo;

            const coinGeckoToken = coinGeckoTokens.find((x) => x.id === jupiterToken?.extensions?.coingeckoId);
            const coingeckoId = coinGeckoToken?.id;
            const tokenAddressMatched = coinGeckoToken?.platforms?.solana?.trim() === jupiterToken?.address?.trim();

            const tags = jupiterToken.tags.filter((item: string) => item !== "unknown");

            const isVerifiedStablecoin = stablecoins.find((stable) => stable.address === jupiterToken.address);
            if (isVerifiedStablecoin) tags.push(STABLE_COIN);

            const info = {
              coingecko_id: coingeckoId || null,
              coingecko_verified: tokenAddressMatched,
              minted_at: jupiterToken?.minted_at || null,
              daily_volume: jupiterToken?.daily_volume || 0
            };

            if (!dbToken) {
              prismaPromises.push(
                prisma.token.create({
                  data: {
                    address: jupiterToken.address,
                    name: jupiterToken.name,
                    symbol: jupiterToken.symbol.toUpperCase(),
                    logo_uri: jupiterToken.logo_uri,
                    platform_id: SOLANA,
                    tags,
                    info: info as unknown as Prisma.JsonObject,
                    created_at: new Date(jupiterToken.created_at),
                    updated_at: new Date(jupiterToken.created_at),
                    deleted_at: null
                  }
                })
              );
            } else if (dbTokenInfo.coingecko_id !== info.coingecko_id || dbTokenInfo.coingecko_verified != info.coingecko_verified) {
              prismaPromises.push(
                prisma.token.update({
                  where: { id: dbToken?.id },
                  data: {
                    tags: tags,
                    info: info,
                    updated_at: new Date()
                  }
                })
              );
            } else if (jupiterToken.extensions?.coingeckoId !== dbTokenInfo.coingecko_id) {
              prismaPromises.push(
                prisma.token.update({
                  where: { id: dbToken?.id },
                  data: {
                    logo_uri: jupiterToken.logo_uri,
                    info: { ...dbTokenInfo, coingecko_id: jupiterToken.extensions?.coingeckoId || null },
                    updated_at: new Date()
                  }
                })
              );
            }
          }

          await Promise.all(prismaPromises);
          console.log("SAVED TOKENS ...", chunkIndex * CHUNK_SIZE, "\n");
          chunkIndex++;
          jupiterTokens.length = 0; // Clear chunk
          pipeline.resume(); // ✅ Resume stream after DB save
        } catch (err) {
          reject(err);
        }
      }
    });

    pipeline.on("end", async () => {
      console.log(`✅ STREAM FINISHED: ${totalCount}`);
      await fs.unlink(FILE_PATH);
      console.log(`🗑️ Deleted file: ${FILE_PATH}`);
      resolve();
    });

    pipeline.on("error", (err: any) => {
      console.error("❌ Stream error:", err);
      reject(err);
    });
  });
};

(async () => {
  Solana.init();
  // await fetchAndSavePlatforms();
  await fetchAndSaveTokens();
  console.log("CRON TASKS COMPLETED ...\n");
})();
