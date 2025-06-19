import { Prisma, PrismaPromise } from "generated/prisma";
import { makeRequest, Solana, SOLANA, STABLE_COIN } from "../../utils";
import { prisma } from "../../services/PrismaService";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { CoingeckoService } from "../../services/CoingeckoService";
import { TokenMetadata } from "../../models";
import { CoingeckoSimpleToken, JupiterToken } from "../../../types";

const tokenService = new TokenService();
const coingeckoService = new CoingeckoService();
const solanaService = new SolanaService(coingeckoService);

const jupiterTokensURL = "https://lite-api.jup.ag/tokens/v1/all";

const CHUNK_SIZE = 500;

const fetchJupiterTokens = async () => {
  console.log("FETCHING TOKENS FROM JUPITER ...");
  const { data: list } = await makeRequest({ url: jupiterTokensURL, method: "GET" });
  console.log(`TOTAL JUPITER TOKENS: , ${list.length} \n`);
  return list;
};

const fetchAndSaveTokens = async () => {
  const stablecoins = await solanaService.fetchSPLStableCoins();
  const coinGeckoTokens: CoingeckoSimpleToken[] = await coingeckoService.fetchTokens();

  const allJupiterTokens: JupiterToken[] = await fetchJupiterTokens();

  while (allJupiterTokens.length) {
    const prismaPromises: PrismaPromise<any>[] = [];
    const jupiterTokens = allJupiterTokens.splice(0, CHUNK_SIZE).map(({ logoURI, ...rest }: any) => {
      return {
        ...rest,
        symbol: rest.symbol.toUpperCase(),
        logo_uri: logoURI
      };
    });

    for (let index = 0; index < jupiterTokens.length; index++) {
      const jupiterToken = jupiterTokens[index];
      const dbToken = await tokenService.findByAddress(jupiterToken.address);
      const dbTokenMetadata = dbToken?.metadata as unknown as TokenMetadata;

      const coinGeckoToken = coinGeckoTokens.find((x) => x.id === jupiterToken?.extensions?.coingeckoId);
      const coingeckoId = coinGeckoToken?.id;
      const tokenAddressMatched = coinGeckoToken?.platforms?.solana?.trim() === jupiterToken?.address?.trim();

      const tags = jupiterToken.tags.filter((item: string) => item !== "unknown");

      const isVerifiedStablecoin = stablecoins.find((stable) => stable.address === jupiterToken.address);
      if (isVerifiedStablecoin) tags.push(STABLE_COIN);

      const metadata = {
        coingecko_id: coingeckoId || null,
        coingecko_verified: tokenAddressMatched,
        decimals: jupiterToken?.decimals || 0,
        freeze_authority: jupiterToken?.freeze_authority || null,
        mint_authority: jupiterToken?.mint_authority || null,
        minted_at: jupiterToken?.minted_at || null,
        permanent_delegate: jupiterToken?.permanent_delegate || null,
        daily_volume: jupiterToken?.daily_volume || 0,
        mint_info_updated_at: null
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
              metadata: metadata as unknown as Prisma.JsonObject,
              created_at: new Date(jupiterToken.created_at),
              updated_at: new Date(jupiterToken.created_at),
              deleted_at: null
            }
          })
        );
      } else if (
        dbTokenMetadata.coingecko_verified != metadata.coingecko_verified ||
        dbTokenMetadata.mint_authority !== metadata.mint_authority ||
        dbTokenMetadata.freeze_authority !== metadata.freeze_authority ||
        dbTokenMetadata.coingecko_id !== metadata.coingecko_id
      ) {
        prismaPromises.push(
          prisma.token.update({
            where: { id: dbToken?.id },
            data: {
              tags: tags,
              metadata: metadata,
              updated_at: new Date()
            }
          })
        );
      } else if (jupiterToken.extensions?.coingeckoId !== dbTokenMetadata.coingecko_id) {
        prismaPromises.push(
          prisma.token.update({
            where: { id: dbToken?.id },
            data: {
              logo_uri: jupiterToken.logo_uri,
              metadata: { ...dbTokenMetadata, coingecko_id: jupiterToken.extensions?.coingeckoId || null },
              updated_at: new Date()
            }
          })
        );
      }
    }

    await Promise.all(prismaPromises);
    console.log("REMAINING TOKENS ...", allJupiterTokens.length, "\n");
  }
};

(async () => {
  Solana.init();
  // await fetchAndSavePlatforms();
  await fetchAndSaveTokens();
  console.log("CRON TASKS COMPLETED ...\n");
})();
