import { Injectable } from "@tsed/di";
import { HttpError, makeRequest, SOLANA } from "../utils";
import { GeckoTerminalTokenInfo, GeckoTerminalTradeData } from "types";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class GeckoTerminalService {
  public baseURL = "https://api.geckoterminal.com/api/v2";

  @UseCache()
  public async fetchTokenInfo(address: string): Promise<GeckoTerminalTokenInfo | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenInfo for ${address}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/networks/${SOLANA}/tokens/${address}/info`,
        method: "GET",
        query: { include_platform: true }
      });

      return data.data;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenInfo for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenTradeData(address: string): Promise<GeckoTerminalTradeData | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchToken for ${address}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/networks/${SOLANA}/tokens/${address}?include=top_pools&include_composition=true`,
        method: "GET",
        query: { include_platform: true }
      });

      return data;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchToken for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
