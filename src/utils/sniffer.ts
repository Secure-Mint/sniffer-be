import { RiskAnalysisParams } from "types";
import { NUMBERS, RISK_STATUS } from "../utils/constants";
import { fixDecimals, getRiskStatus } from ".";
import { DetailedAnalysis } from "../models";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const NOT_VERIFIED_COINGECKO = NUMBERS.FIVE;
const NOT_VERIFIED_GECKOTERMINAL = NUMBERS.THREE;
const VOLUME_PENALTY_LOW = NUMBERS.EIGHT;
const VOLUME_PENALTY_MID = NUMBERS.FIVE;
const VOLUME_PENALTY_HIGH = NUMBERS.THREE;
const STABLE_COIN_BONUS = NUMBERS.TEN;
const MAX_CONCENTRATION_PENALTY = NUMBERS.TWENTY;
const NOT_VERIFIED_COINGECKO_PENALTY = NUMBERS.TEN;
const NOT_VERIFIED_GECKOTERMINAL_PENALTY = NUMBERS.EIGHT;
const SOCIALS_MISSING_PENALTY = NUMBERS.FIVE;
const METADATA_NOT_VERIFIED_PENALTY = NUMBERS.FIVE;
const MINT_AUTHORITY_PENALTY = NUMBERS.TEN;
const FREEZE_AUTHORITY_PENALTY = NUMBERS.TEN;
const NON_IMMUTABLE_METADATA_PENALTY = NUMBERS.FIVE;
const METADATA_NOT_IMMUTABLE_PENALTY = NUMBERS.FIVE;
const IMPERSONATOR_PENALTY = NUMBERS.TWENTY_FIVE;
const HONEY_POT_PENALTY = NUMBERS.TWENTY_FIVE;
const RUG_PUL_PENALTY = NUMBERS.TWENTY_FIVE;
const NO_RECENT_ACTIVITY_PENALTY = NUMBERS.TEN;
const NO_ACTIVITY_24H_PENALTY = NUMBERS.TEN;
const BUYER_SELLER_IMBALANCE = NUMBERS.FOUR;
const SYMBOL_COLLISION_PENALTY = NUMBERS.FIVE;
const DEX_LOW = NUMBERS.FOUR;
const NETWORK_LOW = NUMBERS.THREE;
const SOCIAL_NONE = NUMBERS.TEN;
const SOCIAL_FEW = NUMBERS.FOUR;
const SUPPLY_PENALTY_HIGH = NUMBERS.EIGHT;
const SUPPLY_PENALTY_MODERATE = NUMBERS.FOUR;
const NETWORKS_LOW_PENALTY = NUMBERS.FIVE;
const NETWORKS_HIGH_BONUS = NUMBERS.THREE;
const NETWORK_HIGH_BONUS = NUMBERS.TWO;
const DEX_HIGH_BONUS = NUMBERS.THREE;
const SOCIAL_STRONG_BONUS = NUMBERS.THREE;

const VOLUME_BONUS = {
  NORMAL: NUMBERS.ONE,
  STRONG: NUMBERS.THREE,
  HIGH: NUMBERS.FIVE
};

const MARKETCAP_BONUS = {
  TINY: NUMBERS.ONE,
  SMALL: NUMBERS.TWO,
  LARGE: NUMBERS.THREE,
  HIGH: NUMBERS.FIVE,
  VERY_HIGH: NUMBERS.SEVEN
};

const MAX_SCORE = NUMBERS.HUNDRED;
const MIN_SCORE = NUMBERS.ZERO;

const MARKETCAP_PENALTY = {
  TINY: NUMBERS.TWELVE,
  SMALL: NUMBERS.EIGHT,
  MID: NUMBERS.FOUR
};

const HOLDERS_PENALTY = {
  VERY_LOW: NUMBERS.THREE,
  LOW: NUMBERS.FIVE,
  MODERATE: NUMBERS.EIGHT,
  HIGH: NUMBERS.TEN,
  VERY_HIGH: NUMBERS.TEN,
  EXTREME: NUMBERS.TWELVE
};

const AGE_PENALTY = {
  NEW: NUMBERS.TWELVE,
  WEEK: NUMBERS.EIGHT,
  MONTH: NUMBERS.FOUR
};

export const getEmptyRiskAnalysisParams = (): RiskAnalysisParams => ({
  symbol: "",
  name: "",
  address: "",
  decimals: 0,
  imageUrl: null,
  tags: [],
  totalSupply: 0,
  circulatingSupply: 0,
  totalSupplyUnlocked: false,
  // burnedSupply: 0,
  // burnedPercentage: 0,
  top10HolderSupplyPercentage: 0,
  top20HolderSupplyPercentage: 0,
  totalHolders: 0,
  whaleAccountsAvailable: false,
  volume24h: 0,
  marketCap: 0,
  liquidityUSD: 0,
  liquidityTokenAmount: 0,
  priceUSD: 0,
  networksCount: 1,
  dexCount: 0,
  freezeAuthority: null,
  freezeAuthorityAvailable: false,
  mintAuthority: null,
  mintAuthorityAvailable: false,
  immutableMetadata: false,
  isStableCoin: false,
  impersonator: false,
  symbolCollisionCount: 0,
  // similarTokenNames: [],
  // programId: "",
  // ownerProgram: "",
  verifiedOnRaydium: false,
  verifiedOnCoingecko: false,
  verifiedOnCoingeckoTerminal: false,
  verifiedOnJupiter: true,
  // lpLockedPercentage: 0,
  // lpUnlockDate: null,
  // lpCreatorShare: 0,
  // lpTokenAddress: "",
  firstOnchainActivity: "",
  dailyVolume: 0,
  txCount24h: 0,
  uniqueBuyers24h: 0,
  uniqueSellers24h: 0,
  // whaleCount: 0,
  // suspiciousWallets: [],
  totalTransactions: 0,
  totalTransfers: 0,
  recentActivity: false,
  isHoneyPot: false,
  isRugPull: false,
  twitter: null,
  websites: [],
  telegram: null,
  discord: null,
  github: null,
  socialsVerified: false,
  metadataVerified: false
});

export const calculateTokenAgeDays = (firstOnchainActivity: string): number => {
  const created = new Date(firstOnchainActivity).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
};

/**
 * Full balanced risk function with human-readable detailedAnalysis entries for every condition.
 */
export const calculateRiskScoreBalanced = ({
  totalHolders,
  circulatingSupply,
  totalSupply,
  top10HolderSupplyPercentage,
  top20HolderSupplyPercentage,
  freezeAuthorityAvailable,
  mintAuthorityAvailable,
  immutableMetadata,
  verifiedOnCoingecko,
  verifiedOnJupiter,
  liquidityUSD,
  marketCap,
  dailyVolume,
  dexCount,
  txCount24h,
  recentActivity,
  firstOnchainActivity,
  uniqueBuyers24h,
  uniqueSellers24h,
  impersonator,
  isStableCoin,
  symbolCollisionCount,
  twitter,
  telegram,
  discord,
  websites,
  socialsVerified,
  metadataVerified,
  networksCount,
  whaleAccountsAvailable,
  isHoneyPot,
  isRugPull
}: RiskAnalysisParams): { totalScore: number; score: number; risk: RISK_STATUS; detailedAnalysis: DetailedAnalysis[] } => {
  let score = MAX_SCORE;
  const detailedAnalysis: DetailedAnalysis[] = [];

  // === 1. Holder Concentration ========================================
  let concentrationPenalty = 0;

  // Top 10
  if (!top10HolderSupplyPercentage && top10HolderSupplyPercentage !== 0) {
    concentrationPenalty += 15 * NUMBERS.FIFTY_PERCENT; // worst-case baseline
    detailedAnalysis.push({
      detail: "Unable to determine distribution among the top 10 holders due to missing data, increasing uncertainty and potential risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (top10HolderSupplyPercentage > 15) {
    concentrationPenalty += Math.abs(top10HolderSupplyPercentage - 15) * NUMBERS.FIFTY_PERCENT;
    detailedAnalysis.push({
      detail: `High Top 10 holder concentration: ${fixDecimals(top10HolderSupplyPercentage)}% of the supply is held by the top 10 wallets — increased manipulation risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Top 10 holder distribution looks healthy: ${fixDecimals(top10HolderSupplyPercentage)}% held by top 10 wallets.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // Top 20
  if (!top20HolderSupplyPercentage && top20HolderSupplyPercentage !== 0) {
    concentrationPenalty += 40 * NUMBERS.TWENTY_FIVE_PERCCENT; // worst-case baseline
    detailedAnalysis.push({
      detail: "Unable to determine distribution among the top 20 holders due to missing data, increasing uncertainty and potential risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (top20HolderSupplyPercentage > 40) {
    concentrationPenalty += Math.abs(top20HolderSupplyPercentage - 40) * NUMBERS.TWENTY_FIVE_PERCCENT;
    detailedAnalysis.push({
      detail: `High Top 20 holder concentration: ${fixDecimals(top20HolderSupplyPercentage)}% of the supply is held by the top 20 wallets — centralization risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Top 20 holder distribution looks healthy: ${fixDecimals(top20HolderSupplyPercentage)}% held by top 20 wallets.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // apply concentration penalty capped
  const appliedConcentrationPenalty = Math.min(concentrationPenalty, MAX_CONCENTRATION_PENALTY);
  score -= appliedConcentrationPenalty;

  // Whale accounts
  if (whaleAccountsAvailable) {
    score += NUMBERS.FIVE;
    detailedAnalysis.push({
      detail: "Whale account activity detected, indicating interest from large holders (may imply liquidity or strategic support).",
      risk: RISK_STATUS.INFO
    });
  } else {
    detailedAnalysis.push({
      detail: "No whale account activity detected.",
      risk: RISK_STATUS.INFO
    });
  }

  // === 2. Verification ========================================
  if (verifiedOnCoingecko) {
    score += NOT_VERIFIED_COINGECKO * NUMBERS.TWENTY_FIVE_PERCCENT;
    detailedAnalysis.push({
      detail: "Token is verified on CoinGecko, improving credibility and transparency.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    score -= NOT_VERIFIED_COINGECKO_PENALTY;
    detailedAnalysis.push({
      detail: "Token is not verified on CoinGecko, reducing trust and public visibility.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }

  if (verifiedOnJupiter) {
    score += NOT_VERIFIED_GECKOTERMINAL * NUMBERS.TWENTY_FIVE_PERCCENT;
    detailedAnalysis.push({
      detail: "Token is verified on Jupiter, improving routing/aggregator visibility.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    score -= NOT_VERIFIED_GECKOTERMINAL_PENALTY;
    detailedAnalysis.push({
      detail: "Token is not verified on Jupiter, limiting routing and aggregator trust.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }

  if (socialsVerified) {
    detailedAnalysis.push({
      detail: "Social accounts and handles have been verified, improving public trust.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    score -= SOCIALS_MISSING_PENALTY;
    detailedAnalysis.push({
      detail: "Project social accounts are missing or unverified, reducing credibility and community trust.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }

  if (metadataVerified) {
    detailedAnalysis.push({
      detail: "Token metadata is verified and consistent with registry information.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    score -= METADATA_NOT_VERIFIED_PENALTY;
    detailedAnalysis.push({
      detail: "Token metadata is not verified, increasing risk of misinformation or metadata tampering.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }

  // === 3. Authorities & Metadata ========================================
  if (!isStableCoin && mintAuthorityAvailable) {
    score -= MINT_AUTHORITY_PENALTY;
    detailedAnalysis.push({
      detail: "Mint authority is enabled — additional tokens can be minted (dilution / rug risk).",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Mint authority is disabled or irrelevant for stablecoins — no additional minting risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!isStableCoin && freezeAuthorityAvailable) {
    score -= FREEZE_AUTHORITY_PENALTY;
    detailedAnalysis.push({
      detail: "Freeze authority is active — wallets could be frozen (centralized control risk).",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Freeze authority is disabled or irrelevant for stablecoins — no wallet-freezing risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (immutableMetadata) {
    detailedAnalysis.push({
      detail: "Metadata is immutable — token information cannot be changed after deployment.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    score -= METADATA_NOT_IMMUTABLE_PENALTY;
    detailedAnalysis.push({
      detail: "Metadata is mutable — project can change token information after deployment (misinformation risk).",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }

  // === 4. Identity / Impersonation ========================================
  if (impersonator) {
    score -= IMPERSONATOR_PENALTY;
    detailedAnalysis.push({
      detail: "Token appears to impersonate another project — high scam/impersonation risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "No impersonation signs detected — identity looks legitimate.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 5. Symbol Collisions ========================================
  if (symbolCollisionCount > 0) {
    const penalty = Math.min(symbolCollisionCount * SYMBOL_COLLISION_PENALTY, SYMBOL_COLLISION_PENALTY);
    score -= penalty;
    detailedAnalysis.push({
      detail: `${symbolCollisionCount} symbol collision(s) detected — increases confusion and impersonation risk.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Token symbol is unique — reduced confusion and impersonation risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 6. Honey Pot / Rug Pull ========================================
  if (isHoneyPot) {
    score -= HONEY_POT_PENALTY;
    detailedAnalysis.push({
      detail: "Honeypot behavior detected — buyers may not be able to sell. Extremely high scam risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "No honeypot behavior detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (isRugPull) {
    score -= RUG_PUL_PENALTY;
    detailedAnalysis.push({
      detail: "Rug-pull indicators present — liquidity drain or fraudulent behavior risk is high.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "No rug-pull indicators detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 7. Liquidity ========================================
  if (liquidityUSD < NUMBERS.THOUSAND) {
    score -= 21;
    detailedAnalysis.push({
      detail: "Liquidity is extremely low (< $1k), making trading unsafe and prone to manipulation.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (liquidityUSD < NUMBERS.TEN_THOUSAND) {
    score -= 18;
    detailedAnalysis.push({
      detail: "Liquidity is very low ($1k–$10k), resulting in poor price stability and high slippage.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIFTY_THOUSAND) {
    score -= 15;
    detailedAnalysis.push({
      detail: "Liquidity is below recommended levels ($10k–$50k) for safe trading.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (liquidityUSD < NUMBERS.HUNDRED_THOUSAND) {
    score -= 12;
    detailedAnalysis.push({
      detail: "Liquidity is moderate ($50k–$100k) but may cause volatility for large trades.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (liquidityUSD < NUMBERS.TWO_HUNDRED_THOUSAND) {
    score -= 9;
    detailedAnalysis.push({
      detail: "Liquidity is acceptable ($100k–$200k).",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIVE_HUNDRED_THOUSAND) {
    score -= 6;
    detailedAnalysis.push({
      detail: "Liquidity is reasonably healthy ($200k–$500k).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.MILLION) {
    score -= 4;
    detailedAnalysis.push({
      detail: "Liquidity is good ($500k–$1M).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.TWO_MILLION) {
    score -= 2;
    detailedAnalysis.push({
      detail: "Liquidity is strong ($1M–$2M).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIVE_MILLION) {
    score -= 1;
    detailedAnalysis.push({
      detail: "Liquidity is very strong ($2M–$5M).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Liquidity is excellent (> $5M), supporting stable trading with minimal slippage.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 8. Market Cap Bonuses / Penalties (scaled) ========================================
  if (marketCap < NUMBERS.TWENTY_FIVE_THOUSAND) {
    score -= MARKETCAP_PENALTY.TINY;
    detailedAnalysis.push({
      detail: "Market cap is extremely low (< $25k), typical of very early-stage or high-risk tokens.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (marketCap < NUMBERS.HUNDRED_THOUSAND) {
    score -= MARKETCAP_PENALTY.SMALL;
    detailedAnalysis.push({
      detail: "Market cap is small ($25k–$100k), indicating early stage and increased volatility.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (marketCap < NUMBERS.FIVE_HUNDRED_THOUSAND) {
    score -= MARKETCAP_PENALTY.MID;
    detailedAnalysis.push({
      detail: "Market cap is moderate ($100k–$500k) with typical early-stage volatility.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Market cap is ${marketCap >= NUMBERS.TWENTY_MILLION ? "large" : "growing"}, improving credibility.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (marketCap > NUMBERS.FIFTY_MILLION) score += MARKETCAP_BONUS.VERY_HIGH;
  else if (marketCap > NUMBERS.TWENTY_MILLION) score += MARKETCAP_BONUS.HIGH;
  else if (marketCap > NUMBERS.TEN_MILLION) score += MARKETCAP_BONUS.LARGE;
  else if (marketCap > NUMBERS.FIVE_MILLION) score += MARKETCAP_BONUS.SMALL;
  else if (marketCap > NUMBERS.MILLION) score += MARKETCAP_BONUS.TINY;

  // === 9. Volume Bonuses / Penalties (scaled) ========================================
  if (!isStableCoin) {
    if (dailyVolume < NUMBERS.TWO_THOUSAND) {
      score -= VOLUME_PENALTY_LOW;
      detailedAnalysis.push({
        detail: "Trading volume is extremely low (< $2k), indicating low interest or an abandoned project.",
        risk: RISK_STATUS.HIGH_RISK
      });
    } else if (dailyVolume < NUMBERS.TEN_THOUSAND) {
      score -= VOLUME_PENALTY_MID;
      detailedAnalysis.push({
        detail: "Trading volume is low ($2k–$10k), which may cause volatility.",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (dailyVolume < NUMBERS.FIFTY_THOUSAND) {
      score -= VOLUME_PENALTY_HIGH;
      detailedAnalysis.push({
        detail: "Trading volume is moderate ($10k–$50k).",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (dailyVolume > NUMBERS.FIVE_HUNDRED_THOUSAND) {
      score += VOLUME_BONUS.HIGH;
      detailedAnalysis.push({
        detail: "Trading volume is very high (> $500k), indicating strong market interest.",
        risk: RISK_STATUS.LOW_RISK
      });
    } else if (dailyVolume > NUMBERS.TWO_FIFTY_THOUSAND) {
      score += VOLUME_BONUS.STRONG;
      detailedAnalysis.push({
        detail: "Trading volume is strong ($250k–$500k), indicating active market participation.",
        risk: RISK_STATUS.LOW_RISK
      });
    } else if (dailyVolume > NUMBERS.HUNDRED_THOUSAND) {
      score += VOLUME_BONUS.NORMAL;
      detailedAnalysis.push({
        detail: "Trading volume is healthy ($100k–$250k).",
        risk: RISK_STATUS.LOW_RISK
      });
    } else {
      // if none matched (e.g., exactly zero but handled above) give neutral note
      detailedAnalysis.push({
        detail: `24h trading volume: $${dailyVolume}.`,
        risk: RISK_STATUS.INFO
      });
    }
  } else {
    detailedAnalysis.push({
      detail: "Stablecoin detected — volume/price volatility expectations differ.",
      risk: RISK_STATUS.INFO
    });
  }

  // === 10. Activity ========================================
  if (!isStableCoin) {
    if (!recentActivity || txCount24h === 0) {
      score -= NO_ACTIVITY_24H_PENALTY;
      detailedAnalysis.push({
        detail: "No recent on-chain activity or zero transactions in the last 24h — project may be inactive or abandoned.",
        risk: RISK_STATUS.HIGH_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: `Recent activity detected: ${txCount24h} tx in the last 24h.`,
        risk: RISK_STATUS.LOW_RISK
      });
    }

    if (uniqueBuyers24h < uniqueSellers24h) {
      score -= BUYER_SELLER_IMBALANCE;
      detailedAnalysis.push({
        detail: "More sellers than buyers in the last 24h — downward pressure or loss of confidence.",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: "Buyer/seller balance in the last 24h looks healthy.",
        risk: RISK_STATUS.INFO
      });
    }
  }

  // === 11. Total Holders ========================================
  if (totalHolders < NUMBERS.TWO_THOUSAND) {
    score -= HOLDERS_PENALTY.EXTREME;
    detailedAnalysis.push({
      detail: `Very low number of holders (${totalHolders}) — typical of new or highly speculative tokens.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (totalHolders < NUMBERS.FIVE_THOUSAND) {
    score -= HOLDERS_PENALTY.VERY_HIGH;
    detailedAnalysis.push({
      detail: `Low number of holders (${totalHolders}) suggesting early-stage adoption.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (totalHolders < NUMBERS.TEN_THOUSAND) {
    score -= HOLDERS_PENALTY.HIGH;
    detailedAnalysis.push({
      detail: `Moderate number of holders (${totalHolders}) indicating growing adoption.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (totalHolders < NUMBERS.TWENTY_FIVE_THOUSAND) {
    score -= HOLDERS_PENALTY.MODERATE;
    detailedAnalysis.push({
      detail: `Healthy holder distribution (${totalHolders}) showing steady growth.`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (totalHolders < NUMBERS.FIFTY_THOUSAND) {
    score -= HOLDERS_PENALTY.LOW;
    detailedAnalysis.push({
      detail: `Good holder base (${totalHolders}).`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Large and diverse holder base (${totalHolders}) indicating maturity and reduced risk.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 12. Token Age ========================================
  const ageDays = firstOnchainActivity ? (Date.now() - new Date(firstOnchainActivity).getTime()) / 86400000 : Infinity;
  if (!firstOnchainActivity) {
    detailedAnalysis.push({
      detail: "First on-chain activity date missing — cannot assess token age.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (ageDays < 3) {
    score -= AGE_PENALTY.NEW;
    detailedAnalysis.push({
      detail: `Token is extremely new (<3 days). Age: ${Math.floor(ageDays)} days — high volatility/scam risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (ageDays < 7) {
    score -= AGE_PENALTY.WEEK;
    detailedAnalysis.push({
      detail: `Token is newly launched (${Math.floor(ageDays)} days) and may still be stabilizing.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (ageDays < 30) {
    score -= AGE_PENALTY.MONTH;
    detailedAnalysis.push({
      detail: `Token has short track record (${Math.floor(ageDays)} days).`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Token age (${Math.floor(ageDays)} days) indicates more established history and lower risk.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 13. Supply Inflation ========================================
  if (circulatingSupply > 0) {
    const supplyRatio = totalSupply / circulatingSupply;
    if (supplyRatio > 1.5) {
      score -= SUPPLY_PENALTY_HIGH;
      detailedAnalysis.push({
        detail: `Total supply (${totalSupply}) significantly exceeds circulating supply (${circulatingSupply}) — supply ratio ${supplyRatio.toFixed(
          2
        )} indicates high inflation/dilution risk.`,
        risk: RISK_STATUS.HIGH_RISK
      });
    } else if (supplyRatio > 1.2) {
      score -= SUPPLY_PENALTY_MODERATE;
      detailedAnalysis.push({
        detail: `Moderate difference between total and circulating supply — supply ratio ${supplyRatio.toFixed(
          2
        )} may indicate future unlocking or inflation.`,
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: "Supply distribution between total and circulating appears healthy (low inflation risk).",
        risk: RISK_STATUS.LOW_RISK
      });
    }
  } else {
    score -= SUPPLY_PENALTY_HIGH;
    detailedAnalysis.push({
      detail: "No circulating supply reported — extremely high risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  }

  // === 14. Networks & DEX ========================================
  if (!isStableCoin) {
    if (networksCount <= 1) {
      score -= NETWORK_LOW;
      detailedAnalysis.push({
        detail: `Token is available on only ${networksCount} network(s) — limited exposure and higher isolation risk.`,
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (networksCount >= 3) {
      score += NETWORK_HIGH_BONUS;
      detailedAnalysis.push({
        detail: `Token operates across ${networksCount} networks — improved distribution and reliability.`,
        risk: RISK_STATUS.LOW_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: `Token is available on ${networksCount} networks.`,
        risk: RISK_STATUS.INFO
      });
    }
  }

  if (dexCount <= 1) {
    score -= DEX_LOW;
    detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEX(s) — limited liquidity access.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (dexCount >= 5) {
    score += DEX_HIGH_BONUS;
    detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEXs — broad access and improved liquidity depth.`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEX(s).`,
      risk: RISK_STATUS.INFO
    });
  }

  // === 15. Social Presence ========================================
  const socialCount = [twitter, telegram, discord, ...(websites || [])].filter(Boolean).length;
  if (socialCount === 0) {
    score -= SOCIAL_NONE;
    detailedAnalysis.push({
      detail: "No social channels found — severely harming credibility and communication.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (socialCount === 1) {
    score -= SOCIAL_FEW;
    detailedAnalysis.push({
      detail: "Minimal social presence detected — project visibility is limited.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (socialCount >= 3) {
    score += SOCIAL_STRONG_BONUS;
    detailedAnalysis.push({
      detail: `Strong social presence across ${socialCount} platforms — boosts trust and engagement.`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Moderate social presence across ${socialCount} platforms.`,
      risk: RISK_STATUS.INFO
    });
  }

  // === 16. Stable coin bonus ========================================
  if (isStableCoin) {
    if (score <= 70) {
      score += STABLE_COIN_BONUS;
      detailedAnalysis.push({
        detail: "Token identified as a stablecoin; baseline risk reduced due to expected price stability.",
        risk: RISK_STATUS.LOW_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: "Stablecoin detected; no additional bonus applied because score is already high.",
        risk: RISK_STATUS.INFO
      });
    }
  } else {
    detailedAnalysis.push({
      detail: "Token is not a stablecoin.",
      risk: RISK_STATUS.INFO
    });
  }

  // === 17. Final clamp and return ========================================
  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score),
    detailedAnalysis
  };
};

/**
 * Light risk function with human-readable details.
 */
export const calculateLightRiskScore = ({
  circulatingSupply,
  totalSupply,
  top10HolderSupplyPercentage,
  top20HolderSupplyPercentage,
  whaleAccountsAvailable,
  networksCount,
  verifiedOnCoingecko,
  verifiedOnCoingeckoTerminal,
  freezeAuthorityAvailable,
  mintAuthorityAvailable,
  immutableMetadata,
  impersonator,
  socialsVerified,
  metadataVerified,
  recentActivity
}: RiskAnalysisParams): {
  totalScore: number;
  score: number;
  risk: RISK_STATUS;
  detailedAnalysis: DetailedAnalysis[];
} => {
  let score = MAX_SCORE;
  const detailedAnalysis: DetailedAnalysis[] = [];

  // === 1. Holders Concentration ========================================
  let concentrationPenalty = 0;

  if (!top10HolderSupplyPercentage && top10HolderSupplyPercentage !== 0) {
    concentrationPenalty += Math.abs(20) * 0.5;
    detailedAnalysis.push({
      detail: "Top 10 holder percentage missing — cannot assess concentration for top 10 holders.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (top10HolderSupplyPercentage > 15) {
    concentrationPenalty += Math.abs(top10HolderSupplyPercentage - 20) * 0.5;
    detailedAnalysis.push({
      detail: `High Top 10 holder concentration: ${fixDecimals(top10HolderSupplyPercentage)}% held by top 10 — elevated risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Top 10 holder distribution appears acceptable: ${fixDecimals(top10HolderSupplyPercentage)}%.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!top20HolderSupplyPercentage && top20HolderSupplyPercentage !== 0) {
    concentrationPenalty += Math.abs(40) * 0.25;
    detailedAnalysis.push({
      detail: "Top 20 holder percentage missing — cannot assess concentration for top 20 holders.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (top20HolderSupplyPercentage > 40) {
    concentrationPenalty += Math.abs(top20HolderSupplyPercentage - 40) * 0.25;
    detailedAnalysis.push({
      detail: `High Top 20 holder concentration: ${fixDecimals(top20HolderSupplyPercentage)}% held by top 20 — elevated risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Top 20 holder distribution appears acceptable: ${fixDecimals(top20HolderSupplyPercentage)}%.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  score -= Math.min(concentrationPenalty, MAX_CONCENTRATION_PENALTY);

  if (whaleAccountsAvailable) {
    score += NUMBERS.FIVE;
    detailedAnalysis.push({
      detail: "Whale accounts present — may indicate liquidity or large-holder interest.",
      risk: RISK_STATUS.INFO
    });
  } else {
    detailedAnalysis.push({
      detail: "No whale account activity detected.",
      risk: RISK_STATUS.INFO
    });
  }

  // === 2. Authorities & Metadata =======================================
  if (mintAuthorityAvailable) {
    score -= MINT_AUTHORITY_PENALTY;
    detailedAnalysis.push({
      detail: "Mint authority enabled — risk of token inflation or unexpected minting.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Mint authority disabled — no minting risk detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (freezeAuthorityAvailable) {
    score -= FREEZE_AUTHORITY_PENALTY;
    detailedAnalysis.push({
      detail: "Freeze authority enabled — possibility of wallet freezes (centralized control).",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Freeze authority disabled — no wallet-freezing risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!immutableMetadata) {
    score -= NON_IMMUTABLE_METADATA_PENALTY;
    detailedAnalysis.push({
      detail: "Metadata is mutable — can be changed after deployment (risk of misinformation).",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Metadata is immutable — secure token info.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 3. Identity Risks ===============================================
  if (impersonator) {
    score -= IMPERSONATOR_PENALTY;
    detailedAnalysis.push({
      detail: "Impersonation signs detected — very high scam risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "No impersonation detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 4. Verification ==================================================
  if (!verifiedOnCoingecko) {
    score -= NOT_VERIFIED_COINGECKO_PENALTY;
    detailedAnalysis.push({
      detail: "Not verified on CoinGecko — reduced public trust.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Verified on CoinGecko — improved visibility.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!verifiedOnCoingeckoTerminal) {
    score -= NOT_VERIFIED_GECKOTERMINAL_PENALTY;
    detailedAnalysis.push({
      detail: "Not verified on aggregators — reduced aggregator trust.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Verified on aggregator / terminal — improved credibility.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!socialsVerified) {
    score -= SOCIALS_MISSING_PENALTY;
    detailedAnalysis.push({
      detail: "Socials not verified — reduced credibility.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Socials verified — good social proof.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!metadataVerified) {
    score -= METADATA_NOT_VERIFIED_PENALTY;
    detailedAnalysis.push({
      detail: "Metadata not verified — risk of incorrect token info.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Metadata verified — authentic token information.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  // === 5. Network Presence (Credibility) ================================
  if (networksCount <= 1) {
    score -= NETWORKS_LOW_PENALTY;
    detailedAnalysis.push({
      detail: `Token available on only ${networksCount} network(s) — limited exposure.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (networksCount >= 3) {
    score += NETWORKS_HIGH_BONUS;
    detailedAnalysis.push({
      detail: `Token available on ${networksCount} networks — good cross-chain presence.`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: `Token available on ${networksCount} network(s).`,
      risk: RISK_STATUS.INFO
    });
  }

  // === 6. Supply Inflation ==============================================
  if (circulatingSupply <= 0 && totalSupply > 0) {
    score -= 10;
    detailedAnalysis.push({
      detail: "No circulating supply reported while total supply exists — extremely high risk.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    const supplyRatio = totalSupply / (circulatingSupply || 1);
    if (supplyRatio > 1.5) {
      score -= 10;
      detailedAnalysis.push({
        detail: `High supply inflation: total/circulating ratio ${supplyRatio.toFixed(2)} — dilution risk.`,
        risk: RISK_STATUS.HIGH_RISK
      });
    } else if (supplyRatio > 1.2) {
      score -= 5;
      detailedAnalysis.push({
        detail: `Moderate supply inflation: ratio ${supplyRatio.toFixed(2)}.`,
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else {
      detailedAnalysis.push({
        detail: "Supply ratio appears healthy.",
        risk: RISK_STATUS.LOW_RISK
      });
    }
  }

  // === 7. Activity ======================================================
  if (!recentActivity) {
    score -= NO_RECENT_ACTIVITY_PENALTY;
    detailedAnalysis.push({
      detail: "No recent on-chain activity detected — project may be abandoned or inactive.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    detailedAnalysis.push({
      detail: "Recent on-chain activity detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }

  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score),
    detailedAnalysis
  };
};

export const calculateRiskScore = (params: RiskAnalysisParams) =>
  params.isStableCoin || params.verifiedOnCoingeckoTerminal ? calculateRiskScoreBalanced(params) : calculateLightRiskScore(params);
