import { Injectable } from "@tsed/di";
import { makeRequest, SOLANA } from "../utils";
import { CoingeckoFullToken } from "types";
import { envs } from "../config/envs";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class CoingeckoService {
  public baseURL = "https://api.coingecko.com/api/v3";

  public async fetchTokens() {
    console.log("FETCHING TOKENS FROM COINGECKO ...");
    const { data: list } = await makeRequest({
      url: `${this.baseURL}/coins/list`,
      method: "GET",
      headers: { "x-cg-demo-api-key": envs.COIN_GECKO_API_KEY },
      query: { include_platform: true }
    });
    console.log(`TOTAL COIN GECKO TOKENS: ${list.length} \n`);
    const filtered = list.filter((x: any) => Boolean(x?.platforms?.solana));
    console.log(`TOTAL SOLANA TOKENS ON COIN GECKO: ${filtered.length} \n`);
    return filtered;
  }

  public async isStableCoin(address: string): Promise<boolean> {
    try {
      const tokenDetail = await this.fetchTokenByAddress(address);
      return tokenDetail.categories.includes("Stablecoins") && tokenDetail.platforms.solana === address;
    } catch (err) {
      return false;
    }
  }

  @UseCache()
  public async fetchTokenByAddress(address: string): Promise<CoingeckoFullToken> {
    console.log(`[CACHE TEST] Executing fetchTokenByAddress for ${address}`);
    const { data } = await makeRequest({
      url: `${this.baseURL}/coins/${SOLANA}/contract/${address}`,
      method: "GET",
      headers: { "x-cg-demo-api-key": envs.COIN_GECKO_API_KEY },
      query: { include_platform: true }
    });

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      platforms: data.platforms,
      market_cap_rank: data.market_cap_rank,
      market_cap: data.market_data.market_cap["usd"],
      fully_diluted_valuation: data.market_data.fully_diluted_valuation["usd"],
      categories: data.categories,
      total_supply: data.market_data.total_supply,
      max_supply: data.market_data.max_supply,
      max_supply_infinite: data.market_data.max_supply_infinite,
      circulating_supply: data.market_data.circulating_supply
    };
  }
}
