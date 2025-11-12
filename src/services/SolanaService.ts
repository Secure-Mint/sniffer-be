import { Injectable } from "@tsed/di";
import { AccountLayout, TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";
import { isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { GeckoService } from "./GeckoService";
import { SPLToken } from "types";
import { UseCache } from "@tsed/platform-cache";
import { GeckoTerminalService } from "./GeckoTerminalService";
import { PublicKey, TransactionSignature, ParsedTransactionWithMeta } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

interface AccountInfo {
  data: {
    mintAuthority: string | null;
    supply: number;
    decimals: number;
    isInitialized: boolean;
    freezeAuthority: string | null;
    immutableMetadata: boolean;
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
  private ACCOUNT_STATE_FROZEN = 2; // Frozen state byte value
  private ACCOUNT_STATE_OFFSET = 108; // State field offset in AccountLayout
  private ACCOUNT_SIZE = 165; // Size of a standard Token Account

  constructor(
    private geckoService: GeckoService,
    private geckoTerminalService: GeckoTerminalService
  ) {}

  public async fetchSPLStableCoins() {
    const { data } = await makeRequest({ url: this.SPLTokensURL, method: "GET" });
    const stableTagged = data.tokens.filter((token: SPLToken) => (token.tags || []).includes("stablecoin"));

    const verified: any[] = [];
    for (const token of stableTagged) {
      const id = token.extensions?.coingeckoId;
      if (!id) continue;
      if (await this.geckoService.isStableCoin(token.address)) verified.push(token);
      await sleep(2500);
    }
    return verified;
  }

  public async isMetadataImmutable(mintAddress: string): Promise<boolean> {
    const mintPublicKey = new PublicKey(mintAddress);
    const metaplex = Metaplex.make(Solana.connection);

    try {
      const metadata = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
      return !metadata.isMutable;
    } catch (error) {
      return true;
    }
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

    const immutableMetadata = await this.isMetadataImmutable(mintAddress);

    return {
      data: {
        mintAuthority: mintAuthority ? mintAuthority.toBase58() : null,
        supply: Number(decoded.supply.toString()),
        decimals: decoded.decimals,
        isInitialized: decoded.isInitialized,
        freezeAuthority: freezeAuthority ? freezeAuthority.toBase58() : null,
        immutableMetadata
      },
      executable: accountInfo.executable,
      lamports: accountInfo.lamports,
      owner: accountInfo.owner.toBase58(),
      rentEpoch: accountInfo.rentEpoch || null,
      totalSupply: Number(decoded.supply.toString()) / Math.pow(10, decoded.decimals)
    };
  }

  @UseCache()
  public async fetchTokenSupply(mintAddress: string): Promise<{
    top10HoldersPercentage: number;
    top20HoldersPercentage: number;
    top30HoldersPercentage: number;
    top40HoldersPercentage: number;
    top50HoldersPercentage: number;
    totalHoldersCount: number;
    circulatingSupply: number;
    totalSupply: number;
  }> {
    console.log(`[CACHE CHECK] Executing ${this.constructor.name} fetchTokenSupply for ${mintAddress}`);
    const mintPublicKey = new PublicKey(mintAddress);

    let totalSupplyInfo;
    let totalRawSupply;
    let accounts;
    let decimals;
    let divisor;

    const supplyResponse = await Solana.connection.getTokenSupply(mintPublicKey);
    totalSupplyInfo = supplyResponse.value;

    if (!totalSupplyInfo) {
      throw new Error("Could not retrieve token supply information.");
    }

    decimals = totalSupplyInfo.decimals;
    totalRawSupply = BigInt(totalSupplyInfo.amount);
    divisor = BigInt(10) ** BigInt(decimals);

    accounts = await Solana.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: this.ACCOUNT_SIZE },
        {
          memcmp: {
            offset: 0,
            bytes: mintAddress
          }
        }
      ]
    });

    let frozenSupplyRaw = 0n;
    let frozenCount = 0;
    const allCirculatingAmountsRaw = []; // Stores BigInt amounts of circulating supply

    for (const account of accounts) {
      try {
        const accountData = AccountLayout.decode(account.account.data);
        const rawAmount = accountData.amount;

        const accountStateByte = account.account.data[this.ACCOUNT_STATE_OFFSET];

        const isFrozen = accountStateByte === this.ACCOUNT_STATE_FROZEN || accountData.isNative;

        if (isFrozen) {
          frozenSupplyRaw += rawAmount;
          frozenCount++;
        } else if (rawAmount > 0n) {
          allCirculatingAmountsRaw.push(rawAmount);
        }
      } catch (error) {
        console.warn(`Could not decode account data for: ${account.pubkey.toBase58()}. Skipping.`, error.message);
      }
    }

    // const frozenSupply = Number(frozenSupplyRaw) / Number(divisor);
    const circulatingRawSupply = totalRawSupply - frozenSupplyRaw;
    const circulatingSupply = Number(circulatingRawSupply) / Number(divisor);
    const totalSupply = Number(totalRawSupply) / Number(divisor);

    allCirculatingAmountsRaw.sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));

    const totalCirculatingHolders = allCirculatingAmountsRaw.length;
    let cumulativeRawTotal = 0n;

    let top10HoldersPercentage = 0;
    let top20HoldersPercentage = 0;
    let top30HoldersPercentage = 0;
    let top40HoldersPercentage = 0;
    let top50HoldersPercentage = 0;

    for (let i = 0; i < totalCirculatingHolders; i++) {
      cumulativeRawTotal += allCirculatingAmountsRaw[i];
      const currentN = i + 1;

      if (circulatingRawSupply > 0n) {
        const percentage = (Number(cumulativeRawTotal) / Number(circulatingRawSupply)) * 100;

        if (currentN === 10) {
          top10HoldersPercentage = percentage;
        } else if (currentN === 20) {
          top20HoldersPercentage = percentage;
        } else if (currentN === 30) {
          top30HoldersPercentage = percentage;
        } else if (currentN === 40) {
          top40HoldersPercentage = percentage;
        } else if (currentN === 50) {
          top50HoldersPercentage = percentage;
          break;
        }
      }

      if (currentN === 50) break;
    }

    return {
      totalSupply,
      circulatingSupply,
      totalHoldersCount: totalCirculatingHolders,
      top10HoldersPercentage,
      top20HoldersPercentage,
      top30HoldersPercentage,
      top40HoldersPercentage,
      top50HoldersPercentage
    };
  }

  public async getFirstTokenActivity(mintAddress: string): Promise<ParsedTransactionWithMeta | null> {
    const mintPublicKey = new PublicKey(mintAddress);

    const LIMIT = 1000;
    let options: { limit: number; before?: TransactionSignature } = { limit: LIMIT };

    let firstTransactionSignature: TransactionSignature | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (firstTransactionSignature === null && attempts < MAX_ATTEMPTS) {
      attempts++;

      const signatures = await Solana.connection.getSignaturesForAddress(mintPublicKey, options);

      if (signatures.length === 0) {
        break;
      }

      if (signatures.length < LIMIT) {
        firstTransactionSignature = signatures[signatures.length - 1].signature;
        console.log(`Search complete in ${attempts} attempt(s).`);
        break;
      }

      options.before = signatures[signatures.length - 1].signature;

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (!firstTransactionSignature) {
      return null;
    }

    const firstTransaction = await Solana.connection.getParsedTransaction(firstTransactionSignature, {
      maxSupportedTransactionVersion: 0
    });

    if (firstTransaction && firstTransaction.blockTime) {
      console.log("First transaction details:");
      console.log(`Timestamp: ${new Date(firstTransaction.blockTime * 1000).toUTCString()}`);
      console.log(`Slot: ${firstTransaction.slot}`);
    } else {
      console.log("Failed to retrieve details or timestamp for the first transaction.");
    }

    return firstTransaction;
  }
}
