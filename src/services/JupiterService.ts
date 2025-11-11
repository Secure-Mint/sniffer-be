import { Injectable } from "@tsed/di";
import axios from "axios";
import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import { UseCache } from "@tsed/platform-cache";
import { fixDecimals, HttpError, makeRequest } from "../utils";

const streamPipeline = promisify(pipeline);

@Injectable()
export class JupiterService {
  private baseURL = "https://lite-api.jup.ag";

  public async downloadJsonToFile(filePath: string): Promise<void> {
    const response = await axios.get(`${this.baseURL}/tokens/v1/all`, { responseType: "stream" });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch JSON. Status: ${response.status}`);
    }

    const writer = createWriteStream(filePath);

    await streamPipeline(response.data, writer);
    console.log(`✅ JSON written to ${filePath}`);
  }

  @UseCache()
  public async fetchTokenPrice(address: string): Promise<number> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenPrice for ${address}`);
      const resp = await makeRequest({
        url: `${this.baseURL}/price/v3?ids=${address}`,
        method: "GET"
      });
      return fixDecimals(resp.data[address]?.usdPrice || 0, 12);
    } catch (error) {
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return 0;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }
}
