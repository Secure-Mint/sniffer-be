import { Injectable } from "@tsed/di";
import { HTTP_STATUS_404, HttpError, makeRequest, SOLANA } from "../utils";
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
        method: "GET"
      });

      return data.data;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenInfo for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenTradeData(address: string): Promise<GeckoTerminalTradeData | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenTradeData for ${address}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/networks/${SOLANA}/tokens/${address}`,
        method: "GET",
        query: { include: "top_pools", include_composition: true }
      });

      return data;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenTradeData for ${address}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
