import { Prisma, PrismaPromise } from "generated/prisma";
import { HTTP_STATUS_404, HttpError, sleep, Solana, SOLANA, STABLE_COIN } from "../../utils";
import { prisma } from "../../services/PrismaService";
import { TokenService } from "../../services/TokenService";
import { GeckoService } from "../../services/GeckoService";
import { JupiterService } from "../../services/JupiterService";
import { TokenExtendedInfo } from "../../models";
import { token } from "@metaplex-foundation/js";

const tokenService = new TokenService();
const geckoService = new GeckoService();
const jupiterService = new JupiterService();

const MAX_COUNT = 20;

const fetchAndSaveJupiterTokens = async () => {
  console.log("FETCHING TOKENS FROM JUPITER ...");
  const jupiterVerifiedTokens = await jupiterService.fetchVerifiedTokens();
  console.log(`TOTAL TOKENS ON JUPITER: ${jupiterVerifiedTokens.length} \n`);

  try {
    let count = 0;
    let prismaPromises: PrismaPromise<any>[] = [];

    for (let index = 0; index < jupiterVerifiedTokens.length; index++) {
      const jupiterToken = jupiterVerifiedTokens[index];
      const mintAddress = jupiterToken.id;
      const dbToken = await tokenService.findByAddress(mintAddress);
      const tags = jupiterToken.tags.filter((item: string) => item !== "unknown");

      const info = {
        coingecko_id: null,
        coingecko_verified: false,
        jupiter_verified: true,
        minted_at: null,
        token_program: jupiterToken.tokenProgram || null
      };

      if (!dbToken) {
        const tokenData = {
          data: {
            address: mintAddress.trim(),
            name: jupiterToken.name,
            symbol: jupiterToken.symbol.toUpperCase(),
            platform_id: SOLANA,
            tags,
            info: info as unknown as Prisma.JsonObject,
            created_at: new Date(jupiterToken?.createdAt?.toString() || jupiterToken?.firstPool?.createdAt || new Date()),
            updated_at: new Date(jupiterToken?.updatedAt.toString()),
            deleted_at: null
          }
        };
        prismaPromises.push(prisma.token.create(tokenData));
        count++;
        console.log(`PUSHED TOKEN TO PROMISE ARRAY: ${mintAddress}`);
      }

      if (count === MAX_COUNT) {
        console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
        await Promise.all(prismaPromises);
        count = 0;
        prismaPromises = [];
      }
    }

    if (prismaPromises.length) {
      console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
      await Promise.all(prismaPromises);
    }

    console.log("----------- SAVED TOKENS FROM JUPITER ----------- \n\n");
  } catch (err) {
    console.log(err);
  }
};

const fetchAndSaveCoinGeckoTokens = async () => {
  console.log("FETCHING TOKENS FROM COINGECKO ...");
  const { solanaTokens: coinGeckoTokens } = await geckoService.fetchTokens();
  console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${coinGeckoTokens.length} \n`);

  try {
    let count = 0;
    let prismaPromises: PrismaPromise<any>[] = [];

    for (let index = 0; index < coinGeckoTokens.length; index++) {
      const geckoToken = coinGeckoTokens[index];
      const mintAddress = geckoToken.platforms.solana || null;

      if (mintAddress) {
        const dbToken = await tokenService.findByAddress(mintAddress);
        const dbTokenInfo = (dbToken?.info as unknown as TokenExtendedInfo) || {};

        if (!dbToken) {
          let jupiterToken = null;

          try {
            jupiterToken = await jupiterService.fetchTokenByMint(mintAddress);
          } catch (error) {
            const formattedError = error as unknown as HttpError;
            if (formattedError.status === HTTP_STATUS_404) continue;
          }

          if (jupiterToken) {
            const tags = jupiterToken.tags?.filter((item: string) => item !== "unknown") || [];

            const info = {
              ...dbTokenInfo,
              coingecko_id: geckoToken.id,
              coingecko_verified: true,
              jupiter_verified: true,
              minted_at: null,
              token_program: jupiterToken.tokenProgram || null
            };

            const tokenData = {
              data: {
                address: mintAddress.trim(),
                name: jupiterToken.name,
                symbol: jupiterToken.symbol.toUpperCase(),
                platform_id: SOLANA,
                tags,
                info: info as unknown as Prisma.JsonObject,
                created_at: new Date(jupiterToken?.createdAt?.toString() || jupiterToken?.firstPool?.createdAt || new Date()),
                updated_at: new Date(jupiterToken?.updatedAt?.toString() || new Date()),
                deleted_at: null
              }
            };
            prismaPromises.push(prisma.token.create(tokenData));
            count++;
            console.log(`PUSHED TOKEN TO PROMISE ARRAY: ${mintAddress}`);

            await sleep(1000);
          }
        }
      }

      if (count === MAX_COUNT) {
        console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
        await Promise.all(prismaPromises);
        count = 0;
        prismaPromises = [];
      }
    }

    if (prismaPromises.length) {
      console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
      await Promise.all(prismaPromises);
    }

    console.log("----------- SAVED TOKENS FROM COINGECKO ----------- \n\n");
  } catch (err) {
    console.log(err);
  }
};

const fetchAndSaveStableCoins = async () => {
  console.log("FETCHING STABLE COINS FROM COINGECKO ...");
  const stablecoins = await geckoService.fetchAllStableCoins();
  console.log(`TOTAL STABLE COINS ON COINGECKO: ${stablecoins.length} \n`);

  try {
    let count = 0;
    let prismaPromises: PrismaPromise<any>[] = [];

    for (let index = 0; index < stablecoins.length; index++) {
      const stablecoin = stablecoins[index];
      const geckoToken = await geckoService.fetchTokenById(stablecoin.id);
      const mintAddress = geckoToken?.platforms.solana || null;

      if (geckoToken && mintAddress) {
        const dbToken = await tokenService.findByAddress(mintAddress);
        const dbTokenInfo = (dbToken?.info as unknown as TokenExtendedInfo) || {};

        if (!dbToken) {
          let jupiterToken = null;

          try {
            jupiterToken = await jupiterService.fetchTokenByMint(mintAddress);
          } catch (error) {
            const formattedError = error as unknown as HttpError;
            if (formattedError.status === HTTP_STATUS_404) continue;
          }

          if (jupiterToken) {
            const tags = jupiterToken.tags?.filter((item: string) => item !== "unknown") || [];

            const info = {
              ...dbTokenInfo,
              coingecko_id: geckoToken.id,
              coingecko_verified: true,
              jupiter_verified: true,
              minted_at: null,
              token_program: jupiterToken.tokenProgram || null
            };

            const tokenData = {
              data: {
                address: mintAddress.trim(),
                name: jupiterToken.name,
                symbol: jupiterToken.symbol.toUpperCase(),
                platform_id: SOLANA,
                tags,
                info: info as unknown as Prisma.JsonObject,
                created_at: new Date(jupiterToken?.createdAt?.toString() || jupiterToken?.firstPool?.createdAt || new Date()),
                updated_at: new Date(jupiterToken?.updatedAt?.toString() || new Date()),
                deleted_at: null
              }
            };
            prismaPromises.push(prisma.token.create(tokenData));
            count++;
            console.log(`PUSHED TOKEN TO PROMISE ARRAY: ${mintAddress}`);

            await sleep(1000);
          }
        } else {
          let jupiterToken = null;

          try {
            jupiterToken = await jupiterService.fetchTokenByMint(mintAddress);
          } catch (error) {
            const formattedError = error as unknown as HttpError;
            if (formattedError.status === HTTP_STATUS_404) continue;
          }

          if (jupiterToken) {
            const info = {
              ...dbTokenInfo,
              coingecko_id: geckoToken.id,
              coingecko_verified: true,
              jupiter_verified: true,
              minted_at: null,
              token_program: jupiterToken.tokenProgram || null
            };

            let tags = [...dbToken.tags, ...(jupiterToken.tags?.filter((item: string) => item !== "unknown") || [])];
            tags = [...new Set(tags)];
            tags.push(STABLE_COIN);

            prismaPromises.push(
              prisma.token.update({
                where: { id: dbToken.id },
                data: {
                  tags,
                  info
                }
              })
            );
            count++;
            console.log(`PUSHED TOKEN TO PROMISE ARRAY: ${mintAddress}`);

            await sleep(1000);
          }
        }

        if (count === MAX_COUNT) {
          console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
          await Promise.all(prismaPromises);
          count = 0;
          prismaPromises = [];
        }
      }

      await sleep(2000);
    }

    if (prismaPromises.length) {
      console.log(`---------- SAVING ${prismaPromises.length} TOKENS TO DATABASE ----------`);
      await Promise.all(prismaPromises);
    }

    console.log("----------- SAVED STABLE COINS FROM COINGECKO ----------- \n\n");
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  console.log("CRON TASKS STARTED ...\n");
  Solana.init();
  await fetchAndSaveJupiterTokens();
  await fetchAndSaveCoinGeckoTokens();
  await fetchAndSaveStableCoins();
  console.log("CRON TASKS COMPLETED ...\n");
})();
