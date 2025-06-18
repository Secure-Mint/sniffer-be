import { Prisma, PrismaPromise } from "generated/prisma";
import { TokenService } from "../../services/TokenService";
import { PlatformService } from "../../services/PlatformService";
import { makeRequest, RequestData, SOL } from "../../utils";
import { prisma } from "../../services/PrismaService";
import { TokenMetadata } from "../../models";

const tokenService = new TokenService();
const platformService = new PlatformService();

const jupiterTokensURL = "https://lite-api.jup.ag/tokens/v1/all";
const coinGeckoTokensURL = "https://api.coingecko.com/api/v3/coins/list";
const coinGeckoPlatformsURL = "https://api.coingecko.com/api/v3/asset_platforms";

const chunkSize = 100;

const fetchJupiterTokens = async () => {
  console.log("FETCHING TOKENS FROM JUPITER ...");
  const jupiterRequest: RequestData = {
    url: jupiterTokensURL,
    method: "GET"
  };
  const list = await makeRequest(jupiterRequest);
  console.log(`TOTAL JUPITER TOKENS: , ${list.length} \n`);
  return list;
};

const fetchCoingeckoTokens = async () => {
  console.log("FETCHING TOKENS FROM COINGECKO ...");
  const coinGeckoRequest: RequestData = {
    url: coinGeckoTokensURL,
    method: "GET",
    headers: { "x-cg-demo-api-key": process.env.COIN_GECKO_API_KEY },
    query: { include_platform: true }
  };
  const list = await makeRequest(coinGeckoRequest);
  console.log(`TOTAL COIN GECKO TOKENS: ${list.length} \n`);
  const filtered = list.filter((x: any) => Boolean(x.platforms.solana));
  console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${filtered.length} \n`);
  return filtered;
};

const fetchCoingeckoPlatforms = async () => {
  console.log("FETCHING PLATFORMS FROM COINGECKO ...");
  const coinGeckoRequest: RequestData = {
    url: coinGeckoPlatformsURL,
    method: "GET",
    headers: { "x-cg-demo-api-key": process.env.COIN_GECKO_API_KEY }
  };
  const list = await makeRequest(coinGeckoRequest);
  console.log(`TOTAL COIN GECKO PLATFORMS: ${list.length} \n`);
  return list;
};

const fetchAndSavePlatforms = async () => {
  const allCoinGeckoPlatforms = await fetchCoingeckoPlatforms();

  while (allCoinGeckoPlatforms.length) {
    const prismaPromises: PrismaPromise<any>[] = [];
    const platforms = allCoinGeckoPlatforms.splice(0, chunkSize).map((platform: any) => {
      return {
        id: platform.id,
        chain_identifier: platform.chain_identifier || 0,
        name: platform.name,
        shortname: platform.shortname,
        native_coin_id: platform.native_coin_id,
        images: platform.image
      };
    });

    for (let index = 0; index < platforms.length; index++) {
      const platform = platforms[index];

      const dbPlatform = await platformService.findById(platform.id);
      if (!dbPlatform) {
        prismaPromises.push(
          prisma.platform.create({
            data: platform
          })
        );
      }

      await Promise.all(prismaPromises);
      console.log("SAVED PLATFORMS ...", platforms.length);
      console.log("REMAINING PLATFORMS ...", allCoinGeckoPlatforms.length, "\n");
    }
  }
};

const fetchAndSaveTokens = async () => {
  const allCoinGeckoTokens: any[] = await fetchCoingeckoTokens();
  const allJupiterTokens: any[] = await fetchJupiterTokens();

  while (allJupiterTokens.length) {
    const prismaPromises: PrismaPromise<any>[] = [];
    const jupiterTokens = allJupiterTokens.splice(0, chunkSize).map(({ logoURI, ...rest }: any) => {
      return {
        ...rest,
        symbol: rest.symbol.toUpperCase(),
        logo_uri: logoURI
      };
    });

    for (let index = 0; index < jupiterTokens.length; index++) {
      const fetchedJupiterToken = jupiterTokens[index];
      const dbToken = await tokenService.findByAddress(fetchedJupiterToken.address);
      const tokenMetadata = dbToken?.metadata as unknown as TokenMetadata;
      const coinGeckoVerified = Boolean(allCoinGeckoTokens.find((x) => x.id === fetchedJupiterToken?.extensions?.coingeckoId));

      if (!dbToken) {
        const metadata = {
          coin_gecko_id: fetchedJupiterToken?.extensions?.coingeckoId || null,
          coin_gecko_verified: coinGeckoVerified,
          impersonated: !coinGeckoVerified,
          decimals: fetchedJupiterToken?.decimals || 0,
          freeze_authority: fetchedJupiterToken?.freeze_authority || null,
          mint_authority: fetchedJupiterToken?.mint_authority || null,
          minted_at: fetchedJupiterToken?.minted_at || null,
          permanent_delegate: fetchedJupiterToken?.permanent_delegate || null,
          daily_volume: fetchedJupiterToken?.daily_volume || 0
        };
        prismaPromises.push(
          prisma.token.create({
            data: {
              address: fetchedJupiterToken.address,
              name: fetchedJupiterToken.name,
              symbol: fetchedJupiterToken.symbol.toUpperCase(),
              logo_uri: fetchedJupiterToken.logo_uri,
              platformId: "solana",
              tags: fetchedJupiterToken.tags.filter((item: string) => item !== "unknown"),
              metadata: metadata as unknown as Prisma.JsonObject,
              created_at: new Date(fetchedJupiterToken.created_at),
              updated_at: new Date(fetchedJupiterToken.created_at),
              deleted_at: null
            }
          })
        );
      } else if (tokenMetadata.coin_gecko_verified != coinGeckoVerified) {
        prismaPromises.push(
          prisma.token.update({
            where: { id: dbToken.id },
            data: {
              logo_uri: fetchedJupiterToken.logo_uri,
              metadata: { ...tokenMetadata, coin_gecko_verified: coinGeckoVerified, impersonated: !coinGeckoVerified },
              updated_at: new Date()
            }
          })
        );
      } else if (fetchedJupiterToken.extensions?.coingeckoId !== tokenMetadata.coin_gecko_id) {
        prismaPromises.push(
          prisma.token.update({
            where: { id: dbToken.id },
            data: {
              logo_uri: fetchedJupiterToken.logo_uri,
              metadata: { ...tokenMetadata, coin_gecko_id: fetchedJupiterToken.extensions?.coingeckoId || null },
              updated_at: new Date()
            }
          })
        );
      }
    }

    await Promise.all(prismaPromises);
    console.log("SAVED TOKENS ...", jupiterTokens.length);
    console.log("REMAINING TOKENS ...", allJupiterTokens.length, "\n");
  }
};

(async () => {
  await fetchAndSavePlatforms();
  await fetchAndSaveTokens();
  console.log("CRON TASKS COMPLETED ...\n");
})();
