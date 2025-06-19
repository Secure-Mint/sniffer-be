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
