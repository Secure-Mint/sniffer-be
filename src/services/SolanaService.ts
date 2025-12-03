import { Injectable } from "@tsed/di";
import { AccountLayout, TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";
import {
  calculateBuyers24h,
  calculateDailyVolume,
  calculateDexCount,
  calculateLiquidityTokenAmount,
  calculateLiquidityUSD,
  calculateSellers24h,
  calculateTransactions24h,
  fixDecimals,
  getEmptyRiskAnalysisParams,
  HTTP_STATUS_404,
  HttpError,
  isBase58Encoded,
  Solana,
  STABLE_COIN
} from "../utils";
import { GeckoService } from "./GeckoService";
import { TokenService } from "./TokenService";
import { GeckoTerminalService } from "./GeckoTerminalService";
import { TokenAccountInfo, OnchainSupply, RiskAnalysisParams } from "types";
import { UseCache } from "@tsed/platform-cache";
import { PublicKey, TransactionSignature, ParsedTransactionWithMeta } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { Token } from "generated/prisma";
import { JupiterService } from "./JupiterService";

@Injectable()
export class SolanaService {
  private ACCOUNT_STATE_FROZEN = 2; // Frozen state byte value
  private ACCOUNT_STATE_OFFSET = 108; // State field offset in AccountLayout
  private ACCOUNT_SIZE = 165; // Size of a standard Token Account
  private BURN_ADDRESSES = ["11111111111111111111111111111111", "1nc1nerator11111111111111111111111111111111", "dead" + "0".repeat(40)];
  private PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
  private BONDING_CURVE_SEED = "bonding-curve";

  constructor(
    private tokenService: TokenService,
    private geckoService: GeckoService,
    private geckoTerminalService: GeckoTerminalService,
    private jupiterService: JupiterService
  ) {}

  public isValidAddress(mintAddress: string): boolean {
    try {
      return Boolean(new PublicKey(mintAddress));
    } catch {
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
  public async fetchOnchainMetadata(mintAddress: string): Promise<TokenAccountInfo | null> {
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
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  @UseCache()
  public async fetchOnchainSupply(mintAddress: string): Promise<OnchainSupply | null> {
    try {
      console.log(`[CACHE CHECK] Executing ${this.constructor.name} fetchTokenSupply for ${mintAddress}`);

      const accountInfo = await this.fetchOnchainMetadata(mintAddress);
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

      let top10HoldersSupplyPercentage = 0;
      let top20HoldersSupplyPercentage = 0;
      let top30HoldersSupplyPercentage = 0;
      let top40HoldersSupplyPercentage = 0;
      let top50HoldersSupplyPercentage = 0;

      for (let i = 0; i < totalHoldersCount; i++) {
        cumulativeRawTotal += allCirculatingAmountsRaw[i];
        const currentN = i + 1;

        if (circulatingRawSupply > 0n) {
          const percentage = (Number(cumulativeRawTotal) * 100) / Number(circulatingRawSupply);
          if (currentN === 10) {
            top10HoldersSupplyPercentage = percentage;
          } else if (currentN === 20) {
            top20HoldersSupplyPercentage = percentage;
          } else if (currentN === 30) {
            top30HoldersSupplyPercentage = percentage;
          } else if (currentN === 40) {
            top40HoldersSupplyPercentage = percentage;
          } else if (currentN === 50) {
            top50HoldersSupplyPercentage = percentage;
            break;
          }
        }

        if (currentN === 50) break;
      }

      return {
        totalSupply,
        circulatingSupply,
        totalHoldersCount,
        top10HoldersSupplyPercentage,
        top20HoldersSupplyPercentage,
        top30HoldersSupplyPercentage,
        top40HoldersSupplyPercentage,
        top50HoldersSupplyPercentage,
        burnedTokens
      };
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} fetchTokenSupply for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  public async getFirstTokenActivity(mintAddress: string): Promise<ParsedTransactionWithMeta | null> {
    try {
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
    } catch (error) {
      console.log(`[ERROR] Executing - ${this.constructor.name} getFirstTokenActivity for ${mintAddress}`);
      console.log(error);
      const formattedError = error as unknown as HttpError;
      if (formattedError.status === HTTP_STATUS_404) return null;
      throw new HttpError(formattedError.message, formattedError.status);
    }
  }

  public async fetchTokenAnalysisParams(token: Token): Promise<RiskAnalysisParams> {
    const mintAddress = token.address;
    let tokenAnalysiParams = getEmptyRiskAnalysisParams();
    const geckoTerminalTokenInfo = await this.geckoTerminalService.fetchTokenInfo(mintAddress);
    const geckoTerminalTradeData = await this.geckoTerminalService.fetchTokenTradeData(mintAddress);
    const onchainMetadata = await this.fetchOnchainMetadata(token.address);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);
    const tokenInfo = this.tokenService.parsedInfo(token);
    const impersonator = Boolean(sameSymbolTokens.length > 1 && !tokenInfo.coingecko_verified);
    const isStableCoin = token.tags.includes(STABLE_COIN);
    let circulatingSupply = 0;
    let totalSupply = 0;
    let totalHolders = 0;
    let networksCount = 1;
    let verifiedOnCoingecko = false;
    let verifiedOnCoingeckoTerminal = false;
    let verifiedOnJupiter = tokenInfo.jupiter_verified || false;
    let top10HolderSupplyPercentage = 0;
    let top20HolderSupplyPercentage = 0;
    let freezeAuthority = onchainMetadata?.data.freezeAuthority || null;
    let mintAuthority = onchainMetadata?.data.mintAuthority || null;
    let immutableMetadata = Boolean(onchainMetadata?.data.immutableMetadata);

    if (geckoTerminalTokenInfo && geckoTerminalTradeData) {
      verifiedOnCoingeckoTerminal = true;
      try {
        const geckoToken = await this.geckoService.fetchTokenByMint(mintAddress);
        if (geckoToken) {
          circulatingSupply = geckoToken.circulating_supply;
          networksCount = Object.keys(geckoToken.platforms).length || 1;
          top10HolderSupplyPercentage = Number(geckoTerminalTokenInfo?.attributes.holders.distribution_percentage.top_10);
          top20HolderSupplyPercentage =
            top10HolderSupplyPercentage + Number(geckoTerminalTokenInfo?.attributes.holders.distribution_percentage["11_20"]);
          verifiedOnCoingecko = true;
        }
      } catch (error) {
        console.log(error);
        const onchainSupplyData = await this.fetchOnchainSupply(mintAddress);
        circulatingSupply = onchainSupplyData?.circulatingSupply!;
        totalSupply = onchainSupplyData?.totalSupply!;
        totalHolders = onchainSupplyData?.totalHoldersCount!;
        top10HolderSupplyPercentage = onchainSupplyData?.top10HoldersSupplyPercentage || 0;
        top20HolderSupplyPercentage = onchainSupplyData?.top20HoldersSupplyPercentage || 0;
      }

      totalSupply = +geckoTerminalTradeData.data.attributes.normalized_total_supply;
      totalHolders = geckoTerminalTokenInfo.attributes.holders.count;

      const txCount24h = calculateTransactions24h(geckoTerminalTradeData);

      tokenAnalysiParams = {
        ...tokenAnalysiParams,
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        decimals: geckoTerminalTokenInfo.attributes.decimals,
        imageUrl: geckoTerminalTokenInfo.attributes.image_url,
        tags: [...token.tags, ...(isStableCoin ? [STABLE_COIN] : [])],
        circulatingSupply,
        totalSupply,
        totalHolders,
        top10HolderSupplyPercentage,
        top20HolderSupplyPercentage,
        networksCount,
        verifiedOnCoingecko,
        verifiedOnCoingeckoTerminal,
        verifiedOnJupiter,
        whaleAccountsAvailable: top20HolderSupplyPercentage > 20,
        volume24h: geckoTerminalTradeData?.data.attributes.volume_usd.h24
          ? Number(geckoTerminalTradeData?.data.attributes.volume_usd.h24)
          : 0,
        marketCap:
          Number(geckoTerminalTradeData?.data.attributes.price_usd) *
          Number(geckoTerminalTradeData.data.attributes.normalized_total_supply),
        liquidityUSD: calculateLiquidityUSD(geckoTerminalTradeData),
        liquidityTokenAmount: calculateLiquidityTokenAmount(geckoTerminalTradeData),
        priceUSD: Number(geckoTerminalTradeData?.data?.attributes?.price_usd) || 0,
        dexCount: calculateDexCount(geckoTerminalTradeData),
        freezeAuthority,
        freezeAuthorityAvailable: Boolean(freezeAuthority),
        mintAuthority,
        mintAuthorityAvailable: Boolean(mintAuthority),
        immutableMetadata,
        isStableCoin,
        impersonator,
        symbolCollisionCount: sameSymbolTokens.length,
        firstOnchainActivity: tokenInfo?.minted_at?.toString() || token.created_at.toString(),
        dailyVolume: calculateDailyVolume(geckoTerminalTradeData),
        txCount24h,
        uniqueBuyers24h: calculateBuyers24h(geckoTerminalTradeData),
        uniqueSellers24h: calculateSellers24h(geckoTerminalTradeData),
        twitter: geckoTerminalTokenInfo.attributes.twitter_handle,
        websites: geckoTerminalTokenInfo.attributes.websites || [],
        telegram: geckoTerminalTokenInfo.attributes.telegram_handle,
        discord: geckoTerminalTokenInfo.attributes.discord_url,
        socialsVerified: true,
        metadataVerified: true,
        recentActivity: txCount24h > 0,
        totalSupplyUnlocked: totalSupply === circulatingSupply
      };
    } else {
      const onchainSupplyData = await this.fetchOnchainSupply(mintAddress);
      const tokenPrice = await this.jupiterService.fetchTokenPrice(token.address);
      tokenAnalysiParams = {
        ...tokenAnalysiParams,
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        decimals: onchainMetadata?.data.decimals || 0,
        imageUrl: geckoTerminalTradeData?.data.attributes.image_url || geckoTerminalTokenInfo?.attributes.image.thumb || "",
        tags: [...token.tags, ...(token.tags.includes(STABLE_COIN) ? [STABLE_COIN] : [])],
        circulatingSupply: onchainSupplyData?.circulatingSupply || 0,
        totalSupply: onchainSupplyData?.totalSupply || 0,
        totalHolders: onchainSupplyData?.totalHoldersCount || 0,
        top10HolderSupplyPercentage: onchainSupplyData?.top10HoldersSupplyPercentage || 0,
        top20HolderSupplyPercentage: onchainSupplyData?.top20HoldersSupplyPercentage || 0,
        totalTransactions: 0,
        totalTransfers: 0,
        marketCap: fixDecimals((onchainSupplyData?.circulatingSupply || 1) * Number(tokenPrice), 2),
        priceUSD: tokenPrice,
        dailyVolume: 0,
        networksCount,
        verifiedOnCoingecko,
        verifiedOnCoingeckoTerminal,
        verifiedOnJupiter,
        freezeAuthorityAvailable: Boolean(freezeAuthority),
        mintAuthority,
        mintAuthorityAvailable: Boolean(mintAuthority),
        immutableMetadata,
        isStableCoin,
        impersonator,
        socialsVerified: false,
        metadataVerified: false,
        recentActivity: false,
        totalSupplyUnlocked: totalSupply === circulatingSupply
      };
    }

    return tokenAnalysiParams;
  }
}
