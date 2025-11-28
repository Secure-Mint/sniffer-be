import { Injectable } from "@tsed/di";
import { HOUR_24_SECONDS, HttpError, makeRequest, SOLANA } from "../utils";
import { CoingeckoTokenData } from "types";
import { envs } from "../config/envs";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class GeckoService {
  public baseURL = "https://api.coingecko.com/api/v3";

  public async fetchTokens() {
    const { data: list } = await makeRequest({
      url: `${this.baseURL}/coins/list`,
      method: "GET",
      headers: { "x-cg-demo-api-key": envs.COIN_GECKO_API_KEY },
      query: { include_platform: true }
    });

    const filtered = list.filter((x: any) => Boolean(x?.platforms?.solana));
    return filtered;
  }

  public async isStableCoin(address: string): Promise<boolean> {
    try {
      const tokenDetail = await this.fetchToken(address);
      return Boolean(tokenDetail?.categories.includes("Stablecoins") && tokenDetail?.platforms.solana === address);
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} isStableCoin for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return false;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache({ ttl: HOUR_24_SECONDS })
  public async fetchToken(address: string): Promise<CoingeckoTokenData | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenInfo for ${address}`);
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
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchToken for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
