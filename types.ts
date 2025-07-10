import { YES_NO } from "./src/utils";

export interface SPLToken {
  chainId: number; // Should be 101 for Solana mainnet
  address: string; // Mint address (base58, case-sensitive)
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[]; // e.g., ['stablecoin', 'usd-backed']
  extensions?: {
    website?: string;
    bridgeContract?: string;
    assetContract?: string;
    address?: string;
    twitter?: string;
    github?: string;
    medium?: string;
    tgann?: string;
    tggroup?: string;
    discord?: string;
    serumV3Usdc?: string;
    serumV3Usdt?: string;
    coingeckoId?: string;
    [key: string]: any; // Extensions are open-ended
  };
}

export interface JupiterToken {
  address: string;
  created_at: string;
  daily_volume: number | null;
  decimals: number;
  extensions: JSON;
  freeze_authority: string | null;
  logoURI: string | null;
  mint_authority: string | null;
  minted_at: string;
  name: string;
  permanent_delegate: string | null;
  symbol: string;
  tags: string[] | null;
}

export interface CoingeckoSimpleToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

export interface CoingeckoFullToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<"solana" | "ethereum", string>;
  market_cap: number;
  fully_diluted_valuation: number;
  categories: string[];
  total_supply: number;
  max_supply: number;
  max_supply_infinite: boolean;
  circulating_supply: number;
  market_cap_rank: number;
}

export interface CoingeckoTerminalTokenPool {
  id: string;
  type: string;
}

export interface CoingeckoTerminalToken {
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
      data: CoingeckoTerminalTokenPool[];
    };
  };
}

export interface CoingeckoTerminalTokenInfo {
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
