import { Injectable } from "@tsed/di";
import { makeRequest, Secrets, SOLANA } from "../utils";
import { CoingeckoFullToken } from "types";

@Injectable()
export class CoingeckoService {
  public baseURL = "https://api.coingecko.com/api/v3";

  public fetchTokens = async () => {
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

  public isStableCoin = async (address: string): Promise<boolean> => {
    try {
      const tokenDetail = await this.fetchTokenByAddress(address);
      return tokenDetail.categories.includes("Stablecoins") && tokenDetail.platforms.solana === address;
    } catch (err) {
      return false;
    }
  };

  public fetchTokenByAddress = async (address: string): Promise<CoingeckoFullToken> => {
    const { data } = await makeRequest({
      url: `${this.baseURL}/coins/${SOLANA}/contract/${address}`,
      method: "GET",
      headers: { "x-cg-demo-api-key": Secrets.coingeckoApiKey },
      query: { include_platform: true }
    });
    return data;
  };
}
