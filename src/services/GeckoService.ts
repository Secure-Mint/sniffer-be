import { Injectable } from "@tsed/di";
import { GECK_STABLE_COIN_ID, HTTP_STATUS_404, HttpError, makeRequest, ONE_DAY, sleep, SOLANA } from "../utils";
import { CoingeckoSimpleToken, CoingeckoTokenData } from "types";
import { envs } from "../config/envs";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class GeckoService {
  public baseURL = "https://api.coingecko.com/api/v3";

  public async fetchTokens(): Promise<{ solanaTokens: CoingeckoSimpleToken[]; allTokens: CoingeckoSimpleToken[] }> {
    const { data: list } = await makeRequest({
      url: `${this.baseURL}/coins/list`,
      method: "GET",
      headers: { "x-cg-demo-api-key": envs.COIN_GECKO_API_KEY },
      query: { include_platform: true }
    });

    const solanaTokens = list.filter((x: any) => Boolean(x?.platforms?.solana));
    return { solanaTokens, allTokens: list };
  }

  public async fetchAllStableCoins(): Promise<CoingeckoSimpleToken[]> {
    let page = 1;
    let stablecoins: CoingeckoSimpleToken[] = [];
    let tokenAvailable = true;
    while (tokenAvailable) {
      const { data } = await makeRequest({
        url: `${this.baseURL}/coins/markets`,
        method: "GET",
        headers: { "x-cg-demo-api-key": envs.COIN_GECKO_API_KEY },
        query: { vs_currency: "usd", category: GECK_STABLE_COIN_ID, include_tokens: "top", per_page: 250, page }
      });
      if (!data.length) {
        tokenAvailable = false;
        continue;
      }
      stablecoins = [...stablecoins, ...data];
      page++;
      await sleep(1000);
    }

    return stablecoins;
  }

  @UseCache({ ttl: ONE_DAY })
  public async fetchTokenByMint(address: string): Promise<CoingeckoTokenData | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenByMint for ${address}`);
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
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenByMint for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache({ ttl: ONE_DAY })
  public async fetchTokenById(id: string): Promise<CoingeckoTokenData | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenById for ${id}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/coins/${id}`,
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
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenById for ${id}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
