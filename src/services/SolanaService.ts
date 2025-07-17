import { Injectable } from "@tsed/di";
import { PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";
import { HttpError, isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { CoingeckoService } from "./CoingeckoService";
import { SPLToken } from "types";
import { UseCache } from "@tsed/platform-cache";
import { Description } from "@tsed/schema";
import { CoingeckoTerminalService } from "./CoingeckoTerminalService";

interface TokenRestrictionCheckResult {
  exampleFrozenAccount: string | null;
  recentFailedTransfers: number;
  recentSuccessfulTransfers: number;
  warnings: string[];
}

interface AccountInfo {
  data: {
    mintAuthority: string | null;
    supply: number;
    decimals: number;
    isInitialized: boolean;
    freezeAuthority: string | null;
  };
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number | null;
  totalSupply: number;
}

@Injectable()
export class SolanaService {
  public SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

  constructor(
    private coingeckoService: CoingeckoService,
    private coingeckoTerminalService: CoingeckoTerminalService
  ) {}

  public async fetchSPLStableCoins() {
    const { data } = await makeRequest({ url: this.SPLTokensURL, method: "GET" });
    const stableTagged = data.tokens.filter((token: SPLToken) => (token.tags || []).includes("stablecoin"));

    const verified: any[] = [];
    for (const token of stableTagged) {
      const id = token.extensions?.coingeckoId;
      if (!id) continue;
      if (await this.coingeckoService.isStableCoin(token.address)) verified.push(token);
      await sleep(2500);
    }
    return verified;
  }

  @UseCache()
  public async fetchAccountInfo(mintAddress: string): Promise<AccountInfo | null> {
    console.log(`[CACHE CHECK] Executing ${this.constructor.name} fetchAccountInfo for ${mintAddress}`);
    if (!isBase58Encoded(mintAddress)) throw new Error("invalid address");

    const publicKey = new PublicKey(mintAddress);
    const accountInfo = await Solana.connection.getAccountInfo(publicKey);
    if (!accountInfo) return null;

    const decoded = MintLayout.decode(accountInfo.data);
    const mintAuthority = decoded.mintAuthorityOption === 0 ? null : new PublicKey(decoded.mintAuthority);
    const freezeAuthority = decoded.freezeAuthorityOption === 0 ? null : new PublicKey(decoded.freezeAuthority);

    return {
      data: {
        mintAuthority: mintAuthority ? mintAuthority.toBase58() : null,
        supply: Number(decoded.supply.toString()),
        decimals: decoded.decimals,
        isInitialized: decoded.isInitialized,
        freezeAuthority: freezeAuthority ? freezeAuthority.toBase58() : null
      },
      executable: accountInfo.executable,
      lamports: accountInfo.lamports,
      owner: accountInfo.owner.toBase58(),
      rentEpoch: accountInfo.rentEpoch || null,
      totalSupply: Number(decoded.supply.toString()) / Math.pow(10, decoded.decimals)
    };
  }

  public async getMintAndFreezeAuthority(mintAddress: string) {
    const publicKey = new PublicKey(mintAddress);

    const accountInfo = await this.fetchAccountInfo(mintAddress);
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

  @UseCache()
  public async fetchTokenSupply(mintAddress: string, decimals: number) {
    console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchTokenSupply for ${mintAddress}`);
    try {
      const geckoToken = await this.coingeckoService.fetchToken(mintAddress);
      if (geckoToken) {
        const geckoTerminalTokenInfo = await this.coingeckoTerminalService.fetchTokenInfo(mintAddress);

        return {
          circulatingSupply: geckoToken?.circulating_supply,
          totalSupply: geckoToken?.total_supply,
          totalHoldersCount: geckoTerminalTokenInfo?.attributes.holders.count || 0,
          top10HoldersPercentage: Number(geckoTerminalTokenInfo?.attributes.holders.distribution_percentage.top_10)
        };
      } else {
        return await this.fetchOnchainSupply(mintAddress, decimals);
      }
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  @UseCache()
  public async fetchOnchainSupply(mintAddress: string, decimals: number) {
    console.log(`[CACHE CHECK] Executing ${this.constructor.name} - fetchOnchainSupply for ${mintAddress}`);
    const allAccounts = await Solana.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
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
    const MAX_TOP = 10;
    let circulatingSupply = 0;
    let totalSupply = 0;
    let totalHoldersCount = 0;

    for (const account of allAccounts) {
      const accountData = AccountLayout.decode(account.account.data);
      const owner = new PublicKey(accountData.owner).toBase58();
      const amount = Number(accountData.amount);

      if (owner === "11111111111111111111111111111111") {
        totalSupply += amount;
        continue;
      }
      totalSupply += amount;
      circulatingSupply += amount;
      totalHoldersCount += 1;

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
    circulatingSupply = circulatingSupply / Math.pow(10, decimals);
    totalSupply = totalSupply / Math.pow(10, decimals);

    return {
      circulatingSupply,
      totalSupply,
      totalHoldersCount,
      top10HoldersPercentage:
        (topHolders.splice(0, 10).reduce((sum, a) => sum + a.amount, 0) / Math.pow(10, decimals) / circulatingSupply) * 100
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
