import { Prisma, PrismaPromise } from "generated/prisma";
import { TokenService } from "../../services/TokenService";
import { makeRequest, sleep, Solana, SOLANA, STABLE_COIN } from "../../utils";
import { prisma } from "../../services/PrismaService";
import { TokenMetadata } from "../../models";
import { CoingeckoSimpleToken, JupiterToken, SPLToken } from "../../../types";

const tokenService = new TokenService();

const jupiterTokensURL = "https://lite-api.jup.ag/tokens/v1/all";
const coinGeckoTokensURL = "https://api.coingecko.com/api/v3/coins/list";
const SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

const CHUNK_SIZE = 500;

const isStablecoinOnCoinGeckoById = async (id: string, address: string): Promise<boolean> => {
  try {
    const { data: tokenDetail } = await makeRequest({
      url: `https://api.coingecko.com/api/v3/coins/${SOLANA}/contract/${address}`,
      method: "GET",
      headers: { "x-cg-demo-api-key": process.env.COIN_GECKO_API_KEY || "" }
    });
    return tokenDetail.categories.includes("Stablecoins") && tokenDetail.platforms.solana === address;
  } catch (err) {
    return false;
  }
};

async function fetchSPLStableCoins() {
  console.log("FETCHING TOKENS FROM SPL ...");
  const { data } = await makeRequest({ url: SPLTokensURL, method: "GET" });
  const stableTagged = data.tokens.filter((token: SPLToken) => (token.tags || []).includes("stablecoin"));
  console.log(`Tagged Stablecoins: ${stableTagged.length}`);

  const verified: any[] = [];
  for (const token of stableTagged) {
    const id = token.extensions?.coingeckoId;
    if (!id) continue;
    if (await isStablecoinOnCoinGeckoById(id, token.address)) verified.push(token);
    await sleep(1500);
  }
  return verified;
}

const fetchJupiterTokens = async () => {
  console.log("FETCHING TOKENS FROM JUPITER ...");
  const { data: list } = await makeRequest({ url: jupiterTokensURL, method: "GET" });
  console.log(`TOTAL JUPITER TOKENS: , ${list.length} \n`);
  return list;
};

const fetchCoingeckoTokens = async () => {
  console.log("FETCHING TOKENS FROM COINGECKO ...");
  const { data: list } = await makeRequest({
    url: coinGeckoTokensURL,
    method: "GET",
    headers: { "x-cg-demo-api-key": process.env.COIN_GECKO_API_KEY || "" },
    query: { include_platform: true }
  });
  console.log(`TOTAL COIN GECKO TOKENS: ${list.length} \n`);
  const filtered = list.filter((x: any) => Boolean(x?.platforms?.solana));
  console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${filtered.length} \n`);
  return filtered;
};

const fetchAndSaveTokens = async () => {
  const stablecoins = await fetchSPLStableCoins();
  const coinGeckoTokens: CoingeckoSimpleToken[] = await fetchCoingeckoTokens();

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
        impersonator: !tokenAddressMatched,
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
        dbTokenMetadata.impersonator != metadata.impersonator ||
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
