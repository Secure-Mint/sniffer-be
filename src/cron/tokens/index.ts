import { Prisma, PrismaPromise, Token } from "generated/prisma";
import { TokenService } from "../../services/TokenService";
import { makeRequest, RequestData } from "../../utils";
import { addMinutes } from "date-fns";
import { TokenModel } from "../../models";
import { prisma } from "../../services/PrismaService";
import { isDeepStrictEqual } from "util";

const tokenService = new TokenService();

const tokensURL = "https://lite-api.jup.ag/tokens/v1/all";

const hasTokenChanged = (
  { expiry: expiry_db, updated_at: updated_at_db, deleted_at: deleted_at_db, ...dbToken }: Token,
  { updated_at: updated_at_fet, deleted_at: deleted_at_fet, ...fetchedToken }: TokenModel
) => {
  return isDeepStrictEqual(dbToken, fetchedToken);
};

(async () => {
  console.log("FETCHING TOKENS ...");

  const chunkSize = 100;
  const tokenExpiryInMinutes = 60;
  const request: RequestData = {
    url: tokensURL,
    method: "GET"
  };
  const allTokens = await makeRequest(request);
  console.log("TOTAL tokens", allTokens.length);

  while (allTokens.length) {
    const prismaPromises: PrismaPromise<any>[] = [];
    const tokens: TokenModel[] = allTokens.splice(0, chunkSize).map(({ logoURI, ...rest }: any) => {
      return {
        ...rest,
        symbol: rest.symbol.toUpperCase(),
        logo_uri: logoURI
      };
    });

    for (let index = 0; index < tokens.length; index++) {
      const fetchedToken = tokens[index];
      const dbToken = await tokenService.findByAddress(fetchedToken.address);

      if (!dbToken) {
        prismaPromises.push(
          prisma.token.create({
            data: {
              ...fetchedToken,
              tags: fetchedToken.tags.filter((item) => item !== "unknown"),
              extensions: fetchedToken.extensions as unknown as Prisma.JsonObject,
              expiry: addMinutes(new Date(), tokenExpiryInMinutes),
              created_at: new Date(fetchedToken.created_at),
              updated_at: new Date(fetchedToken.created_at),
              deleted_at: null
            }
          })
        );
      } else if (hasTokenChanged({ ...dbToken, extensions: dbToken.extensions as unknown as Prisma.JsonObject }, fetchedToken)) {
        prisma.token.update({
          where: { address: fetchedToken.address },
          data: {
            ...fetchedToken,
            extensions: fetchedToken.extensions as unknown as Prisma.JsonObject,
            expiry: addMinutes(new Date(dbToken.expiry || new Date()), tokenExpiryInMinutes),
            updated_at: new Date()
          }
        });
      } else {
        prisma.token.update({
          where: { address: fetchedToken.address },
          data: {
            expiry: addMinutes(new Date(dbToken.expiry || new Date()), tokenExpiryInMinutes)
          }
        });
      }
    }

    await prisma.$transaction(prismaPromises);
    console.log("SAVED TOKENS ...", tokens.length);
    console.log("REMAINING TOKENS ...", allTokens.length, "\n");
  }

  console.log("CRON TASKS COMPLETED ...\n");
})();
