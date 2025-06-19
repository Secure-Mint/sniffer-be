import { Injectable } from "@tsed/di";
import { makeRequest, Secrets, SOLANA } from "../utils";

@Injectable()
export class CoingeckoService {
  public baseURL = "https://api.coingecko.com/api/v3";

  public fetchCoingeckoTokens = async () => {
    console.log("FETCHING TOKENS FROM COINGECKO ...");
    const { data: list } = await makeRequest({
      url: `${this.baseURL}/coins/list`,
      method: "GET",
      headers: { "x-cg-demo-api-key": Secrets.coingeckoApiKey },
      query: { include_platform: true }
    });
    console.log(`TOTAL COIN GECKO TOKENS: ${list.length} \n`);
    const filtered = list.filter((x: any) => Boolean(x?.platforms?.solana));
    console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${filtered.length} \n`);
    return filtered;
  };

  public isStableOnCoingeckoByAddress = async (address: string): Promise<boolean> => {
    try {
      const { data: tokenDetail } = await makeRequest({
        url: `${this.baseURL}/coins/${SOLANA}/contract/${address}`,
        method: "GET",
        headers: { "x-cg-demo-api-key": Secrets.coingeckoApiKey }
      });
      return tokenDetail.categories.includes("Stablecoins") && tokenDetail.platforms.solana === address;
    } catch (err) {
      return false;
    }
  };
}
