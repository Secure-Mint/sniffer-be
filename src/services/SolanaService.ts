import { Injectable } from "@tsed/di";
import { AccountLayout, TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";
import { HttpError, isBase58Encoded, makeRequest, sleep, Solana } from "../utils";
import { GeckoService } from "./GeckoService";
import { TokenAccountInfo, SPLToken, TokenSupplyInfo } from "types";
import { UseCache } from "@tsed/platform-cache";
import { GeckoTerminalService } from "./GeckoTerminalService";
import { PublicKey, TransactionSignature, ParsedTransactionWithMeta } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

@Injectable()
export class SolanaService {
  public SPLTokensURL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";
  private ACCOUNT_STATE_FROZEN = 2; // Frozen state byte value
  private ACCOUNT_STATE_OFFSET = 108; // State field offset in AccountLayout
  private ACCOUNT_SIZE = 165; // Size of a standard Token Account
  private BURN_ADDRESSES = ["11111111111111111111111111111111", "1nc1nerator11111111111111111111111111111111", "dead" + "0".repeat(40)];
  private PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
  private BONDING_CURVE_SEED = "bonding-curve";

  constructor(
    private geckoService: GeckoService,
    private geckoTerminalService: GeckoTerminalService
  ) {}

  public isValidAddress(mintAddress: string) {
    try {
      const key = new PublicKey(mintAddress);
      return PublicKey.isOnCurve(key.toBytes());
    } catch (error) {
      return false;
    }
  }

  public isPDA(key: PublicKey): boolean {
    try {
      PublicKey.isOnCurve(key.toBytes());
      return false;
    } catch (e) {
      return !PublicKey.isOnCurve(key.toBytes());
    }
  }

  public getPumpFunBondingCurvePDA(mintAddress: PublicKey): PublicKey {
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(this.BONDING_CURVE_SEED), mintAddress.toBuffer()],
      this.PUMP_FUN_PROGRAM_ID
    );
    return bondingCurvePDA;
  }

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
  public async fetchAccountInfo(mintAddress: string): Promise<TokenAccountInfo | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} fetchAccountInfo for ${mintAddress}`);
      if (!isBase58Encoded(mintAddress)) throw new Error("invalid address");
      let isPumpFun = false;

      const mintPublicKey = new PublicKey(mintAddress);
      const accountInfo = await Solana.connection.getAccountInfo(mintPublicKey);
      if (!accountInfo) return null;

      const decoded = MintLayout.decode(accountInfo.data);
      const mintAuthority = decoded.mintAuthorityOption === 0 ? null : new PublicKey(decoded.mintAuthority);
      const freezeAuthority = decoded.freezeAuthorityOption === 0 ? null : new PublicKey(decoded.freezeAuthority);

      const mintAuthorityBuffer = decoded.mintAuthorityOption ? decoded.mintAuthority : null;

      if (!mintAuthorityBuffer) isPumpFun = false;
      else {
        const actualMintAuthority = new PublicKey(mintAuthorityBuffer);
        const expectedAuthorityPDA = this.getPumpFunBondingCurvePDA(mintPublicKey);
        isPumpFun = actualMintAuthority.equals(expectedAuthorityPDA);
      }

      const immutableMetadata = await this.isMetadataImmutable(mintAddress);
      const divisor = BigInt(10) ** BigInt(decoded.decimals);

      return {
        data: {
          mintAuthority: mintAuthority ? mintAuthority.toBase58() : null,
          supply: Number(decoded.supply.toString()),
          decimals: decoded.decimals,
          isInitialized: decoded.isInitialized,
          freezeAuthority: freezeAuthority ? freezeAuthority.toBase58() : null,
          immutableMetadata
        },
        isPumpFun,
        executable: accountInfo.executable,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        rentEpoch: accountInfo.rentEpoch || null,
        totalSupplyRaw: Number(decoded.supply),
        divisor: Number(divisor),
        totalSupply: Number(decoded.supply) / Math.pow(10, decoded.decimals)
      };
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchAccountInfo for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchTokenSupply(mintAddress: string): Promise<TokenSupplyInfo | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} fetchTokenSupply for ${mintAddress}`);

      const accountInfo = await this.fetchAccountInfo(mintAddress);
      const totalRawSupply = BigInt(accountInfo?.totalSupplyRaw!);
      const divisor = accountInfo?.divisor;

      // --- 2. Fetch All Token Accounts --- (Optimized version should be used here, but using provided code for context)
      const accounts = await Solana.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
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
      let burnedSupplyRaw = 0n;
      let frozenCount = 0;
      const allCirculatingAmountsRaw = [];

      // --- 3. Iterate and Filter Non-User Wallets ---
      for (const account of accounts) {
        try {
          const accountData = AccountLayout.decode(account.account.data);
          const rawAmount = accountData.amount;
          const ownerPublicKey = accountData.owner;
          const ownerAddressString = ownerPublicKey.toBase58();

          if (this.BURN_ADDRESSES.includes(ownerAddressString)) {
            burnedSupplyRaw += rawAmount;
            continue;
          }

          if (this.isPDA(ownerPublicKey)) {
            console.log(`Skipping PDA owner: ${ownerAddressString}`);
            continue;
          }

          const accountStateByte = account.account.data[this.ACCOUNT_STATE_OFFSET];
          const isFrozen = accountStateByte === this.ACCOUNT_STATE_FROZEN || accountData.isNative;

          if (isFrozen) {
            frozenSupplyRaw += rawAmount;
            frozenCount++;
          } else if (rawAmount > 0n) {
            allCirculatingAmountsRaw.push(rawAmount);
          }
        } catch (error) {
          console.warn(`Could not decode account data for: ${account.pubkey.toBase58()}. Skipping.`, (error as Error).message);
        }
      }

      // --- 4. Calculate Supply and Holder Percentages ---
      // Circulating supply excludes frozen AND effectively burned tokens
      const nonCirculatingRawSupply = frozenSupplyRaw + burnedSupplyRaw;
      const circulatingRawSupply = totalRawSupply - nonCirculatingRawSupply;

      const circulatingSupply = Number(circulatingRawSupply) / Number(divisor);
      const totalSupply = Number(totalRawSupply) / Number(divisor);
      const burnedTokens = Number(burnedSupplyRaw) / Number(divisor);

      allCirculatingAmountsRaw.sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));

      const totalHoldersCount = allCirculatingAmountsRaw.length;
      let cumulativeRawTotal = 0n;

      let top10HoldersPercentage = 0;
      let top20HoldersPercentage = 0;
      let top30HoldersPercentage = 0;
      let top40HoldersPercentage = 0;
      let top50HoldersPercentage = 0;

      for (let i = 0; i < totalHoldersCount; i++) {
        cumulativeRawTotal += allCirculatingAmountsRaw[i];
        const currentN = i + 1;

        if (circulatingRawSupply > 0n) {
          const percentage = (Number(cumulativeRawTotal) * 100) / Number(circulatingRawSupply);
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
        totalHoldersCount,
        top10HoldersPercentage,
        top20HoldersPercentage,
        top30HoldersPercentage,
        top40HoldersPercentage,
        top50HoldersPercentage,
        burnedTokens
      };
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenSupply for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === 404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  // public async getFirstTokenActivity(mintAddress: string): Promise<ParsedTransactionWithMeta | null> {
  //   try {
  //     const mintPublicKey = new PublicKey(mintAddress);

  //     const LIMIT = 1000;
  //     let options: { limit: number; before?: TransactionSignature } = { limit: LIMIT };

  //     let firstTransactionSignature: TransactionSignature | null = null;
  //     let attempts = 0;
  //     const MAX_ATTEMPTS = 50;

  //     while (firstTransactionSignature === null && attempts < MAX_ATTEMPTS) {
  //       attempts++;

  //       const signatures = await Solana.connection.getSignaturesForAddress(mintPublicKey, options);

  //       if (signatures.length === 0) {
  //         break;
  //       }

  //       if (signatures.length < LIMIT) {
  //         firstTransactionSignature = signatures[signatures.length - 1].signature;
  //         console.log(`Search complete in ${attempts} attempt(s).`);
  //         break;
  //       }

  //       options.before = signatures[signatures.length - 1].signature;

  //       await new Promise((resolve) => setTimeout(resolve, 200));
  //     }

  //     if (!firstTransactionSignature) {
  //       return null;
  //     }

  //     const firstTransaction = await Solana.connection.getParsedTransaction(firstTransactionSignature, {
  //       maxSupportedTransactionVersion: 0
  //     });

  //     if (firstTransaction && firstTransaction.blockTime) {
  //       console.log("First transaction details:");
  //       console.log(`Timestamp: ${new Date(firstTransaction.blockTime * 1000).toUTCString()}`);
  //       console.log(`Slot: ${firstTransaction.slot}`);
  //     } else {
  //       console.log("Failed to retrieve details or timestamp for the first transaction.");
  //     }

  //     return firstTransaction;
  //   } catch (error) {
  //     console.log(`[ERROR] Executing - ${this.constructor.name} getFirstTokenActivity for ${mintAddress}`);
  //     console.log(error);
  //     const formattedError = error as unknown as HttpError;
  //     if (formattedError.status === 404) return null;
  //     throw new HttpError(formattedError.message, formattedError.status);
  //   }
  // }
}
