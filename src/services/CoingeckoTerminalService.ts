import { Injectable } from "@tsed/di";
import { HttpError, makeRequest, SOLANA } from "../utils";
import { CoingeckoTerminalTokenInfo, CoingeckoTerminalToken } from "types";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class CoingeckoTerminalService {
  public baseURL = "https://api.geckoterminal.com/api/v2";

  @UseCache()
  public async fetchToken(address: string): Promise<CoingeckoTerminalToken | null> {
    try {
      console.log(`[CACHE TEST] Executing ${this.constructor.name} - fetchToken for ${address}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/networks/${SOLANA}/tokens/${address}`,
        method: "GET",
        query: { include_platform: true }
      });

      return data.data;
    } catch (error) {
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenInfo(address: string): Promise<CoingeckoTerminalTokenInfo | null> {
    try {
      console.log(`[CACHE TEST] Executing ${this.constructor.name} - fetchTokenInfo for ${address}`);
      const { data } = await makeRequest({
        url: `${this.baseURL}/networks/${SOLANA}/tokens/${address}/info`,
        method: "GET",
        query: { include_platform: true }
      });

      return data.data;
    } catch (error) {
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
