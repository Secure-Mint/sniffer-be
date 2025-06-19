import { Inject, Injectable } from "@tsed/di";
import { PublicKey } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { CoingeckoService } from "./CoingeckoService";
import { SPLToken } from "types";

@Injectable()
export class SolanaService {
  public SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

  constructor(private coingeckoService: CoingeckoService) {}

  public fetchSPLStableCoins = async () => {
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
  };

  public fetchAccountInfo = async (mintAddress: string) => {
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
  };

  public getMintAndFreezeAuthority = async (mintAddress: string) => {
    const mintInfo = await getMint(Solana.connection, new PublicKey(mintAddress));

    return {
      address: mintAddress,
      mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null
    };
  };

  public getTokenHolders = async (mintAddress: string) => {
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

    return accounts.map((account) => {
      const accountData = AccountLayout.decode(account.account.data);
      const owner = new PublicKey(accountData.owner).toBase58();
      const amount = Number(accountData.amount); // This is in raw integer format (not uiAmount)
      return { owner, amount };
    });
  };
}
