import { Injectable } from "@tsed/di";
import { PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";
import { HttpError, isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { CoingeckoService } from "./CoingeckoService";
import { SPLToken } from "types";
import { UseCache } from "@tsed/platform-cache";

interface TokenRestrictionCheckResult {
  exampleFrozenAccount: string | null;
  recentFailedTransfers: number;
  recentSuccessfulTransfers: number;
  warnings: string[];
}

@Injectable()
export class SolanaService {
  public SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

  constructor(private coingeckoService: CoingeckoService) {}

  public async fetchSPLStableCoins() {
    const { data } = await makeRequest({ url: this.SPLTokensURL, method: "GET" });
    const stableTagged = data.tokens.filter((token: SPLToken) => (token.tags || []).includes("stablecoin"));

    const verified: any[] = [];
    for (const token of stableTagged) {
      const id = token.extensions?.coingeckoId;
      if (!id) continue;
      if (await this.coingeckoService.isStableCoin(token.address)) verified.push(token);
      await sleep(1500);
    }
    return verified;
  }

  @UseCache({ ttl: -1 })
  private async fetchAccountInfo(mintAddress: string) {
    console.log(`[CACHE CHECK] Executing fetchAccountInfo for ${mintAddress}`);
    if (!isBase58Encoded(mintAddress)) throw new Error("invalid address");
    const publicKey = new PublicKey(mintAddress);
    const accountInfo = await Solana.connection.getAccountInfo(publicKey);
    if (!accountInfo) return null;
    return accountInfo;
  }

  private async getMintAccountInfo(mintAddress: string): Promise<{
    dataBuffer: Buffer;
    owner: string;
    lamports: number;
    executable: boolean;
  } | null> {
    const mintAccountInfo = await this.fetchAccountInfo(mintAddress);
    if (!mintAccountInfo) return null;

    const rawData: unknown = mintAccountInfo.data;

    let dataBuffer: Buffer;
    if (Buffer.isBuffer(rawData)) {
      dataBuffer = rawData;
    } else if (rawData && typeof rawData === "object" && "data" in rawData && Array.isArray((rawData as any).data)) {
      dataBuffer = Buffer.from((rawData as any).data);
    } else {
      throw new Error("Invalid or corrupted account data");
    }

    const owner =
      mintAccountInfo.owner instanceof PublicKey ? mintAccountInfo.owner.toBase58() : new PublicKey(mintAccountInfo.owner).toBase58();

    return {
      dataBuffer,
      owner,
      lamports: mintAccountInfo.lamports,
      executable: mintAccountInfo.executable
    };
  }

  public async getMintAndFreezeAuthority(mintAddress: string) {
    const publicKey = new PublicKey(mintAddress);

    const accountInfo = await this.getMintAccountInfo(mintAddress);
    if (!accountInfo) throw new HttpError("Mint address not found", 404);

    if (!new PublicKey(accountInfo.owner).equals(TOKEN_PROGRAM_ID)) {
      throw new HttpError("Address is not a valid SPL Token Mint", 400);
    }

    const mintInfo = await getMint(Solana.connection, publicKey);

    return {
      address: mintAddress,
      mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null
    };
  }

  @UseCache({ ttl: -1 })
  getTokenMetadata = async (mintAddress: string) => {
    const accountInfo = await this.getMintAccountInfo(mintAddress);
    if (!accountInfo) throw new HttpError("Mint address not found", 404);

    const data = MintLayout.decode(accountInfo.dataBuffer);
    const supply = Number(data.supply);
    const decimals = data.decimals;

    return { totalSupply: supply / Math.pow(10, decimals), rawSupply: supply, decimals, programId: accountInfo.owner };
  };

  @UseCache()
  public async getTokenHolders(mintAddress: string, decimals: number) {
    console.log(`[CACHE CHECK] Executing getTopTokenHolders for ${mintAddress}`);
    const connection = Solana.connection;
    const allAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
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
    let total = 0;
    let totalHolders = 0;

    for (const account of allAccounts) {
      const accountData = AccountLayout.decode(account.account.data);
      const owner = new PublicKey(accountData.owner).toBase58();
      const amount = Number(accountData.amount);

      if (owner === "11111111111111111111111111111111") continue;
      total += amount;
      totalHolders += 1;

      if (amount === 0) continue;

      if (topHolders.length < MAX_TOP) {
        topHolders.push({ owner, amount });
        topHolders.sort((a, b) => a.amount - b.amount);
      } else if (amount > topHolders[0].amount) {
        topHolders[0] = { owner, amount };
        topHolders.sort((a, b) => a.amount - b.amount);
      }
    }

    topHolders.sort((a, b) => b.amount - a.amount);

    return {
      circulatingSupply: total / Math.pow(10, decimals),
      totalHolders,
      top50Holders: topHolders,
      top50HoldersAmount: topHolders.reduce((sum, a) => sum + a.amount, 0) / Math.pow(10, decimals),
      top10HoldersAmount: topHolders.splice(0, 10).reduce((sum, a) => sum + a.amount, 0) / Math.pow(10, decimals)
    };
  }

  @UseCache()
  public async checkTokenTransferRestrictions(mintAddress: string): Promise<TokenRestrictionCheckResult> {
    const warnings: string[] = [];

    const mintPubkey = new PublicKey(mintAddress);

    const signatures: ConfirmedSignatureInfo[] = await Solana.connection.getSignaturesForAddress(mintPubkey, { limit: 50 });
    let recentFailedTransfers = 0;
    let recentSuccessfulTransfers = 0;
    const seenAccounts = new Set<string>();
    let exampleFrozenAccount: string | null = null;

    for (const sigInfo of signatures) {
      const tx = await Solana.connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0
      });
      if (!tx) continue;

      const { instructions } = tx.transaction.message;
      const meta = tx.meta;

      for (const ix of instructions) {
        if ("parsed" in ix && ix.programId.equals(TOKEN_PROGRAM_ID)) {
          const parsed = ix.parsed as any;
          if (parsed?.type === "transfer") {
            const dest = parsed.info.destination;
            seenAccounts.add(dest);

            if (meta?.err) recentFailedTransfers++;
            else recentSuccessfulTransfers++;
          }
        }
      }
    }

    if (recentSuccessfulTransfers === 0) {
      warnings.push("No successful token transfers detected — may be transfer-locked");
    }

    if (recentFailedTransfers > 0) {
      warnings.push(`${recentFailedTransfers} failed transfer(s) detected — possibly restricted`);
    }

    // Optional: Check if any of the seen destination accounts are frozen
    for (const acc of seenAccounts) {
      const info = await Solana.connection.getParsedAccountInfo(new PublicKey(acc));
      const state = (info.value?.data as any)?.parsed?.info?.state;
      if (state === "frozen") {
        exampleFrozenAccount = acc;
        warnings.push(`Account ${acc} is frozen — freeze restriction confirmed`);
        break;
      }
    }

    return {
      exampleFrozenAccount,
      recentFailedTransfers,
      recentSuccessfulTransfers,
      warnings
    };
  }
}
