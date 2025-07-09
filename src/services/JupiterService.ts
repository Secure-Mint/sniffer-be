import { Injectable } from "@tsed/di";
import axios from "axios";
import { parser } from "stream-json";
import { chain } from "stream-chain";
import { Readable } from "stream";
import { streamArray } from "stream-json/streamers/StreamArray";
import { JupiterToken } from "types";

import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import fs from "fs/promises";

const streamPipeline = promisify(pipeline);

@Injectable()
export class JupiterService {
  private tokenListURL = "https://lite-api.jup.ag/tokens/v1/all";

  public async downloadJsonToFile(filePath: string): Promise<void> {
    const response = await axios.get(this.tokenListURL, { responseType: "stream" });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch JSON. Status: ${response.status}`);
    }

    const writer = createWriteStream(filePath);

    await streamPipeline(response.data, writer);
    console.log(`✅ JSON written to ${filePath}`);
  }
}
