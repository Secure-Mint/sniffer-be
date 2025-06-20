import { Inject, Injectable } from "@tsed/di";
import { PublicKey } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { CoingeckoService } from "./CoingeckoService";
import { SPLToken } from "types";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class SolanaService {
  public SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

  constructor(private coingeckoService: CoingeckoService) {}

  public async fetchSPLStableCoins() {
    console.log("FETCHING TOKENS FROM SPL ...");
    const { data } = await makeRequest({ url: this.SPLTokensURL, method: "GET" });
    const stableTagged = data.tokens.filter((token: SPLToken) => (token.tags || []).includes("stablecoin"));
    console.log(`Tagged Stablecoins: ${stableTagged.length}`);

    const verified: any[] = [];
    for (const token of stableTagged) {
      const id = token.extensions?.coingeckoId;
      if (!id) continue;
      if (await this.coingeckoService.isStableCoin(token.address)) verified.push(token);
      await sleep(1500);
    }
    return verified;
  }

  @UseCache()
  public async fetchAccountInfo(mintAddress: string) {
    try {
      if (!isBase58Encoded(mintAddress)) throw new Error("invalid address");
      const publicKey = new PublicKey(mintAddress);
      const accountInfo = await Solana.connection.getAccountInfo(publicKey);
      if (!accountInfo) {
        console.log("Account not found");
      }
      return accountInfo;
    } catch (error) {
      console.error("Error fetching account info:", error);
    }
  }

  @UseCache()
  public async getMintAndFreezeAuthority(mintAddress: string) {
    const mintInfo = await getMint(Solana.connection, new PublicKey(mintAddress));

    return {
      address: mintAddress,
      mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null
    };
  }

  @UseCache()
  public async getTop50TokenHolders(mintAddress: string) {
    console.log(`[CACHE TEST] Executing getTopTokenHolders for ${mintAddress}`);
    const connection = Solana.connection;
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 0,
            bytes: mintAddress
          }
        }
      ]
    });

    const topHolders: { owner: string; amount: number }[] = [];
    const MAX_TOP = 50;

    for (const account of accounts) {
      const accountData = AccountLayout.decode(account.account.data);
      const owner = new PublicKey(accountData.owner).toBase58();
      const amount = Number(accountData.amount);

      if (amount === 0) continue; // optionally skip zero balances

      if (topHolders.length < MAX_TOP) {
        topHolders.push({ owner, amount });
        topHolders.sort((a, b) => a.amount - b.amount); // maintain min heap
      } else if (amount > topHolders[0].amount) {
        topHolders[0] = { owner, amount };
        topHolders.sort((a, b) => a.amount - b.amount);
      }
    }

    return topHolders.sort((a, b) => b.amount - a.amount);
  }
}
