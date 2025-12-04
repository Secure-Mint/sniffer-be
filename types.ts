import { AnalysisReport } from "./src/models";
import { RISK_STATUS, YES_NO } from "./src/utils";

// export interface SPLToken {
//   chainId: number; // Should be 101 for Solana mainnet
//   address: string; // Mint address (base58, case-sensitive)
//   symbol: string;
//   name: string;
//   decimals: number;
//   logoURI?: string;
//   tags?: string[]; // e.g., ['stablecoin', 'usd-backed']
//   extensions?: {
//     website?: string;
//     bridgeContract?: string;
//     assetContract?: string;
//     address?: string;
//     twitter?: string;
//     github?: string;
//     medium?: string;
//     tgann?: string;
//     tggroup?: string;
//     discord?: string;
//     serumV3Usdc?: string;
//     serumV3Usdt?: string;
//     coingeckoId?: string;
//     [key: string]: any; // Extensions are open-ended
//   };
// }

// export interface JupiterToken {
//   address: string;
//   created_at: string;
//   daily_volume: number | null;
//   decimals: number;
//   extensions: JSON;
//   freeze_authority: string | null;
//   logoURI: string | null;
//   mint_authority: string | null;
//   minted_at: string;
//   name: string;
//   permanent_delegate: string | null;
//   symbol: string;
//   tags: string[] | null;
// }

interface JupiterVerifiedTokenStats {
  priceChange: number;
  liquidityChange: number;
  volumeChange: number;
  buyVolume: number;
  sellVolume: number;
  buyOrganicVolume: number;
  sellOrganicVolume: number;
  numBuys: number;
  numSells: number;
  numTraders: number;
  numOrganicBuyers: number;
  numNetBuyers: number;
}

export interface JupiterVerifiedToken {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  dev?: "3etKXcW2fzEJR5YXoSKSmP6UZ633g9uiFv5yuqFUf66k";
  mintAuthority?: "4LjesTqRA8SLWph1zngxkNzmBaKuLMB5dAgdG3viwSy6";
  firstPool: { id: string; createdAt: string };
  holderCount: number;
  audit?: { mintAuthorityDisabled: boolean; freezeAuthorityDisabled: boolean; topHoldersPercentage: number };
  apy: { jupEarn: number };
  organicScore: number;
  organicScoreLabel: string;
  isVerified: boolean;
  tags: [string];
  createdAt: string;
  fdv?: number;
  mcap?: number;
  usdPrice?: number;
  priceBlockId?: number;
  liquidity: number;
  stats5m?: JupiterVerifiedTokenStats;
  stats1h?: JupiterVerifiedTokenStats;
  stats6h?: JupiterVerifiedTokenStats;
  stats24h?: JupiterVerifiedTokenStats;
  stats7d?: { priceChange: number };
  stats30d?: { priceChange: number };
  ctLikes?: number;
  smartCtLikes?: number;
  updatedAt: string;
}

export interface CoingeckoSimpleToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

export interface CoingeckoMarketToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: 1;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: string;
  last_updated: string;
}

export interface CoingeckoTokenData {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<
    | "solana"
    | "ethereum"
    | "polkadot"
    | "flow"
    | "avalanche"
    | "optimistic-ethereum"
    | "stellar"
    | "near-protocol"
    | "hedera-hashgraph"
    | "zksync"
    | "tron"
    | "celo"
    | "arbitrum-one"
    | "base"
    | "polygon-pos",
    string
  >;
  market_cap: number;
  fully_diluted_valuation: number;
  categories: string[];
  total_supply: number;
  max_supply: number;
  max_supply_infinite: boolean;
  circulating_supply: number;
  market_cap_rank: number;
}

export interface GeckoTerminalTokenTopPools {
  id: string;
  type: string;
}

interface GeckoTerminalTokenLP {
  id: string;
  type: string;
  attributes: {
    base_token_price_usd: string;
    base_token_price_native_currency: string;
    base_token_balance: string;
    base_token_liquidity_usd: string;
    quote_token_price_usd: string;
    quote_token_price_native_currency: string;
    quote_token_balance: string;
    quote_token_liquidity_usd: string;
    base_token_price_quote_token: string;
    quote_token_price_base_token: string;
    address: string;
    name: string;
    pool_created_at: string;
    token_price_usd: string;
    fdv_usd: string;
    market_cap_usd: string;
    price_change_percentage: {
      m5: string;
      m15: string;
      m30: string;
      h1: string;
      h6: string;
      h24: string;
    };
    transactions: {
      m5: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
      m15: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
      m30: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
      h1: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
      h6: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
      h24: {
        buys: number;
        sells: number;
        buyers: number;
        sellers: number;
      };
    };
    volume_usd: {
      m5: string;
      m15: string;
      m30: string;
      h1: string;
      h6: string;
      h24: string;
    };
    reserve_in_usd: string;
  };
  relationships: {
    base_token: {
      data: {
        id: string;
        type: string;
      };
    };
    quote_token: {
      data: {
        id: string;
        type: string;
      };
    };
    dex: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export interface GeckoTerminalTradeData {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      image_url: string;
      coingecko_coin_id: string;
      total_supply: string;
      normalized_total_supply: string;
      price_usd: string;
      fdv_usd: string;
      total_reserve_in_usd: string;
      volume_usd: {
        h24: string;
      };
      market_cap_usd: string;
    };
    relationships: {
      top_pools: {
        data: GeckoTerminalTokenTopPools[];
      };
    };
  };
  included: GeckoTerminalTokenLP[];
}

export interface GeckoTerminalTokenInfo {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image_url: string;
    image: {
      thumb: string;
      small: string;
      large: string;
    };
    coingecko_coin_id: string;
    websites: string[];
    discord_url: string | null;
    telegram_handle: string;
    twitter_handle: string | null;
    description: string;
    gt_score: number;
    gt_score_details: {
      pool: number;
      transaction: number;
      creation: number;
      info: number;
      holders: number;
    };
    categories: string[];
    gt_category_ids: string[];
    holders: {
      count: number;
      distribution_percentage: {
        top_10: string;
        "11_20": string;
        "21_40": string;
        rest: string;
      };
      last_updated: string;
    };
    mint_authority: YES_NO;
    freeze_authority: YES_NO;
    is_honeypot: string | null;
  };
}

export interface TokenAccountInfo {
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
  totalSupplyRaw: number;
  divisor: number;
  totalSupply: number;
  isPumpFun: boolean;
}

export interface OnchainSupply {
  top10HoldersSupplyPercentage: number;
  top20HoldersSupplyPercentage: number;
  top30HoldersSupplyPercentage: number;
  top40HoldersSupplyPercentage: number;
  top50HoldersSupplyPercentage: number;
  totalHoldersCount: number;
  circulatingSupply: number;
  totalSupply: number;
  burnedTokens: number;
}

export interface RiskAnalysisParams {
  /* ========== BASIC TOKEN INFO ========== */
  symbol: string; // done
  name: string; // done
  address: string; // done
  decimals: number; // done
  imageUrl: string | null; // done but needs to update from gecko terminal
  tags: string[]; // done

  /* ========== SUPPLY & DISTRIBUTION ========== */
  totalSupply: number; // done
  circulatingSupply: number; // done
  totalSupplyUnlocked: boolean;
  // burnedSupply: number;
  // burnedPercentage: number;
  networksCount: number;
  dexCount: number;

  top10HolderSupplyPercentage: number; // done
  top20HolderSupplyPercentage: number; // done

  totalHolders: number; // done
  whaleAccountsAvailable: boolean;

  /* ========== MARKET DATA ========== */
  volume24h: number;
  marketCap: number; // done
  liquidityUSD: number;
  liquidityTokenAmount: number;
  priceUSD: number;

  /* ========== AUTHORITY & TOKEN SECURITY ========== */
  freezeAuthority: string | null; // done
  freezeAuthorityAvailable: boolean; // done

  mintAuthority: string | null; // done
  mintAuthorityAvailable: boolean; // done

  immutableMetadata: boolean; // done
  isStableCoin: boolean;

  /* ========== IMPERSONATION & NAME RISK ========== */
  impersonator: boolean; // done
  symbolCollisionCount: number;
  // similarTokenNames: string[];

  // programId: string; // SPL Program ID
  // ownerProgram: string; // program of mint account
  verifiedOnRaydium: boolean;
  verifiedOnCoingecko: boolean;
  verifiedOnCoingeckoTerminal: boolean;
  verifiedOnJupiter: boolean;

  /* ========== LIQUIDITY POOL ANALYSIS ========== */
  // lpLockedPercentage: number; // how much LP is locked
  // lpUnlockDate: string | null; // when liquidity unlocks
  // lpCreatorShare: number; // % LP owned by deployer
  // lpTokenAddress: string;

  /* ========== TRANSACTION & HOLDER BEHAVIOR ========== */
  firstOnchainActivity: string; // done
  dailyVolume: number;
  txCount24h: number;
  uniqueBuyers24h: number;
  uniqueSellers24h: number;
  // whaleCount: number; // # of wallets with >1% supply
  // suspiciousWallets: string[];

  /* ========== TRANSACTIONS ========== */
  totalTransactions: number;
  totalTransfers: number;
  recentActivity: boolean;

  isHoneyPot: boolean;
  isRugPull: boolean;

  /* ========== SOCIAL / EXTERNAL SIGNALS ========== */
  twitter: string | null;
  websites: string[];
  telegram: string | null;
  discord: string | null;
  github: string | null;
  socialsVerified: boolean;
  metadataVerified: boolean;
}

export interface RiskAnalysisResult {
  totalScore: number;
  score: number;
  risk: RISK_STATUS;
  detailedAnalysis: AnalysisReport[];
}
