import { Injectable } from "@tsed/di";
// import axios from "axios";
// import { createWriteStream } from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
import { UseCache } from "@tsed/platform-cache";
import { fixDecimals, HTTP_STATUS_404, HttpError, makeRequest } from "../utils";
import { JupiterVerifiedToken } from "types";

// const streamPipeline = promisify(pipeline);

@Injectable()
export class JupiterService {
  private baseURL = "https://lite-api.jup.ag";

  // public async downloadJsonToFile(filePath: string): Promise<void> {
  //   const response = await axios.get(`${this.baseURL}/tokens/v1/all`, { responseType: "stream" });

  //   if (response.status !== 200) {
  //     throw new Error(`Failed to fetch JSON. Status: ${response.status}`);
  //   }

  //   const writer = createWriteStream(filePath);

  //   await streamPipeline(response.data, writer);
  //   console.log(`✅ JSON written to ${filePath}`);
  // }

  public async fetchVerifiedTokens(): Promise<JupiterVerifiedToken[]> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchVerifiedTokens`);
      const resp = await makeRequest({
        url: `${this.baseURL}/tokens/v2/tag?query=verified`,
        method: "GET"
      });
      return resp.data;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchVerifiedTokens`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenByMint(mintAddress: string): Promise<JupiterVerifiedToken | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenByMint for ${mintAddress}`);
      const resp = await makeRequest({
        url: `${this.baseURL}/tokens/v2/search`,
        method: "GET",
        query: { query: mintAddress }
      });
      return resp.data[0] || null;
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenByMint for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenPrice(mintAddress: string): Promise<number> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenPrice for ${mintAddress}`);
      const resp = await makeRequest({
        url: `${this.baseURL}/price/v3`,
        method: "GET",
        query: { ids: mintAddress }
      });
      return fixDecimals(resp.data[mintAddress]?.usdPrice || 0, 12);
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenPrice for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return 0;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
