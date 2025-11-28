import { RiskAnalysisParams } from "types";
import { RISK_STATUS } from "../utils/constants";
import { getRiskStatus } from ".";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const NUMBERS = {
  HUNDRED_MILLION: 100_000_000,
  FIFTY_MILLION: 50_000_000,
  TWENTY_MILLION: 20_000_000,
  TEN_MILLION: 10_000_000,
  FIVE_MILLION: 5_000_000,
  TWO_MILLION: 2_000_000,
  MILLION: 1_000_000,
  FIVE_HUNDRED_THOUSAND: 500_000,
  TWO_FIFTY_THOUSAND: 250_000,
  TWO_HUNDRED_THOUSAND: 250_000,
  HUNDRED_THOUSAND: 100_000,
  FIFTY_THOUSAND: 50_000,
  TWENTY_FIVE_THOUSAND: 25_000,
  TWENTY_THOUSAND: 20_000,
  FIFTEEN_THOUSAND: 15_000,
  TEN_THOUSAND: 10_000,
  FIVE_THOUSAND: 5_000,
  TWO_THOUSAND: 2_000,
  THOUSAND: 1_000,
  FIVE_HUNDRED: 500,
  HUNDRED: 100,
  TWENTY_FIVE: 25,
  TEN: 10,
  FIVE: 5,
  ONE: 1,
  FIFTY_PERCENT: 0.5,
  TWENTY_FIVE_PERCCENT: 0.25
};

// verification
const NOT_VERIFIED_COINGECKO = 5;
const NOT_VERIFIED_GECKOTERMINAL = 3;

const VOLUME_PENALTY_LOW = 8;
const VOLUME_PENALTY_MID = 5;
const VOLUME_PENALTY_HIGH = 3;

const STABLE_COIN_SCORE = 90;
const MAX_CONCENTRATION_PENALTY = 20;

// --- Verification Penalties ---
const NOT_VERIFIED_COINGECKO_PENALTY = 10;
const NOT_VERIFIED_GECKOTERMINAL_PENALTY = 8;
const SOCIALS_MISSING_PENALTY = 5;
const METADATA_NOT_VERIFIED_PENALTY = 5;

// --- Authorities & Metadata ---
const MINT_AUTHORITY_PENALTY = 10;
const FREEZE_AUTHORITY_PENALTY = 10;
const NON_IMMUTABLE_METADATA_PENALTY = 5;
const METADATA_NOT_IMMUTABLE_PENALTY = 5;

// --- Concentration / Impersonation ---
const IMPERSONATOR_PENALTY = 25;

// --- Activity ---
const NO_RECENT_ACTIVITY_PENALTY = 10;
const NO_ACTIVITY_24H_PENALTY = 10;
const BUYER_SELLER_IMBALANCE = 4;

// --- Symbol Collisions ---
const SYMBOL_COLLISION_PENALTY = 5;

// --- DEX / Networks ---
const DEX_LOW = 4;
const NETWORK_LOW = 3;

// --- Social ---
const SOCIAL_NONE = 10;
const SOCIAL_FEW = 4;

// --- Supply ---
const SUPPLY_PENALTY_HIGH = 8;
const SUPPLY_PENALTY_MODERATE = 4;

const NETWORKS_LOW_PENALTY = 5;
const NETWORKS_HIGH_BONUS = 3;
const NETWORK_HIGH_BONUS = 2;

const DEX_HIGH_BONUS = 3;

const SOCIAL_STRONG_BONUS = 3;

const VOLUME_BONUS = {
  NORMAL: 1,
  STRONG: 3,
  HIGH: 5
};

const MARKETCAP_BONUS = {
  TINY: 1,
  SMALL: 2,
  LARGE: 3,
  HIGH: 5,
  VERY_HIGH: 7
};

const MAX_SCORE = 100;
const MIN_SCORE = 0;

const MARKETCAP_PENALTY = {
  TINY: 12,
  SMALL: 8,
  MID: 4
};

const HOLDERS_PENALTY = {
  VERY_LOW: 3,
  LOW: 5,
  MODERATE: 8,
  HIGH: 10,
  VERY_HIGH: 10,
  EXTREME: 12
};

const AGE_PENALTY = {
  NEW: 12,
  WEEK: 8,
  MONTH: 4
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

export const calculateRiskScoreBalanced = (token: RiskAnalysisParams): { totalScore: number; score: number; risk: RISK_STATUS } => {
  let score = MAX_SCORE;

  const {
    totalHolders,
    circulatingSupply,
    totalSupply,
    top10HolderSupplyPercentage,
    top20HolderSupplyPercentage,
    freezeAuthorityAvailable,
    mintAuthorityAvailable,
    immutableMetadata,
    verifiedOnCoingecko,
    verifiedOnCoingeckoTerminal,
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
    whaleAccountsAvailable
  } = token;

  // ---------------------------------------------------------------------
  // 0. Stablecoins (auto strong score)
  // ---------------------------------------------------------------------
  if (isStableCoin) {
    return {
      totalScore: MAX_SCORE,
      score: STABLE_COIN_SCORE,
      risk: getRiskStatus(STABLE_COIN_SCORE)
    };
  }

  // ---------------------------------------------------------------------
  // 1. Holder Concentration
  // ---------------------------------------------------------------------
  let concentrationPenalty = 0;
  if (top10HolderSupplyPercentage > 15) concentrationPenalty += (top10HolderSupplyPercentage - 20) * 0.5;
  if (top20HolderSupplyPercentage > 40) concentrationPenalty += (top20HolderSupplyPercentage - 40) * 0.25;
  score -= Math.min(concentrationPenalty, MAX_CONCENTRATION_PENALTY);

  if (whaleAccountsAvailable) score += 5;

  // ---------------------------------------------------------------------
  // 2. Verification
  // ---------------------------------------------------------------------
  if (!verifiedOnCoingecko) score -= NOT_VERIFIED_COINGECKO_PENALTY;
  else score += NOT_VERIFIED_COINGECKO * NUMBERS.TWENTY_FIVE_PERCCENT;

  if (!verifiedOnCoingeckoTerminal) score -= NOT_VERIFIED_GECKOTERMINAL_PENALTY;
  else score += NOT_VERIFIED_GECKOTERMINAL * NUMBERS.TWENTY_FIVE_PERCCENT;

  if (!socialsVerified) score -= SOCIALS_MISSING_PENALTY;
  if (!metadataVerified) score -= METADATA_NOT_VERIFIED_PENALTY;

  // ---------------------------------------------------------------------
  // 3. Authorities & Metadata
  // ---------------------------------------------------------------------
  if (mintAuthorityAvailable) score -= MINT_AUTHORITY_PENALTY;
  if (freezeAuthorityAvailable) score -= FREEZE_AUTHORITY_PENALTY;
  if (!immutableMetadata) score -= METADATA_NOT_IMMUTABLE_PENALTY;

  // ---------------------------------------------------------------------
  // 4. Identity / Impersonation
  // ---------------------------------------------------------------------
  if (impersonator) score -= IMPERSONATOR_PENALTY;

  // ---------------------------------------------------------------------
  // 5. Symbol Collisions
  // ---------------------------------------------------------------------
  score -= Math.min(symbolCollisionCount * SYMBOL_COLLISION_PENALTY, SYMBOL_COLLISION_PENALTY);

  // ---------------------------------------------------------------------
  // 6. Liquidity
  // ---------------------------------------------------------------------
  if (liquidityUSD < NUMBERS.THOUSAND) score -= 20;
  else if (liquidityUSD < NUMBERS.TEN_THOUSAND) score -= 18;
  else if (liquidityUSD < NUMBERS.FIFTY_THOUSAND) score -= 15;
  else if (liquidityUSD < NUMBERS.HUNDRED_THOUSAND) score -= 12;
  else if (liquidityUSD < NUMBERS.TWO_HUNDRED_THOUSAND) score -= 10;
  else if (liquidityUSD < NUMBERS.FIVE_HUNDRED_THOUSAND) score -= 8;
  else if (liquidityUSD < NUMBERS.MILLION) score -= 8;
  else if (liquidityUSD < NUMBERS.TWO_MILLION) score -= 5;
  else if (liquidityUSD < NUMBERS.FIVE_MILLION) score -= 3;

  // ---------------------------------------------------------------------
  // 7. Market Cap Bonuses / Penalties (scaled)
  // ---------------------------------------------------------------------
  if (marketCap < NUMBERS.TWENTY_FIVE_THOUSAND) score -= MARKETCAP_PENALTY.TINY;
  else if (marketCap < NUMBERS.HUNDRED_THOUSAND) score -= MARKETCAP_PENALTY.SMALL;
  else if (marketCap < NUMBERS.FIVE_HUNDRED_THOUSAND) score -= MARKETCAP_PENALTY.MID;

  if (marketCap > NUMBERS.FIFTY_MILLION) score += MARKETCAP_BONUS.VERY_HIGH;
  else if (marketCap > NUMBERS.TWENTY_MILLION) score += MARKETCAP_BONUS.HIGH;
  else if (marketCap > NUMBERS.TEN_MILLION) score += MARKETCAP_BONUS.LARGE;
  else if (marketCap > NUMBERS.FIVE_MILLION) score += MARKETCAP_BONUS.SMALL;
  else if (marketCap > NUMBERS.MILLION) score += MARKETCAP_BONUS.TINY;

  // ---------------------------------------------------------------------
  // 8. Volume Bonuses / Penalties (scaled)
  // ---------------------------------------------------------------------
  if (dailyVolume < NUMBERS.TWO_THOUSAND) score -= VOLUME_PENALTY_LOW;
  else if (dailyVolume < NUMBERS.TEN_THOUSAND) score -= VOLUME_PENALTY_MID;
  else if (dailyVolume < NUMBERS.FIFTY_THOUSAND) score -= VOLUME_PENALTY_HIGH;
  else if (dailyVolume > NUMBERS.FIVE_HUNDRED_THOUSAND) score += VOLUME_BONUS.HIGH;
  else if (dailyVolume > NUMBERS.TWO_FIFTY_THOUSAND) score += VOLUME_BONUS.STRONG;
  else if (dailyVolume > NUMBERS.HUNDRED_THOUSAND) score += VOLUME_BONUS.NORMAL;

  // ---------------------------------------------------------------------
  // 9. Activity
  // ---------------------------------------------------------------------
  if (!recentActivity || txCount24h === 0) score -= NO_ACTIVITY_24H_PENALTY;
  if (uniqueBuyers24h < uniqueSellers24h) score -= BUYER_SELLER_IMBALANCE;

  // ---------------------------------------------------------------------
  // 10. Total Holders
  // ---------------------------------------------------------------------
  if (totalHolders < NUMBERS.FIVE_HUNDRED) score -= HOLDERS_PENALTY.EXTREME;
  else if (totalHolders < NUMBERS.TEN_THOUSAND) score -= HOLDERS_PENALTY.VERY_HIGH;
  else if (totalHolders < NUMBERS.FIFTY_THOUSAND) score -= HOLDERS_PENALTY.HIGH;
  else if (totalHolders < NUMBERS.HUNDRED_THOUSAND) score -= HOLDERS_PENALTY.MODERATE;
  else if (totalHolders < NUMBERS.TWO_FIFTY_THOUSAND) score -= HOLDERS_PENALTY.LOW;
  else if (totalHolders < NUMBERS.FIVE_HUNDRED_THOUSAND) score -= HOLDERS_PENALTY.VERY_LOW;

  // ---------------------------------------------------------------------
  // 11. Token Age
  // ---------------------------------------------------------------------
  const ageDays = (Date.now() - new Date(firstOnchainActivity).getTime()) / 86400000;
  if (ageDays < 3) score -= AGE_PENALTY.NEW;
  else if (ageDays < 7) score -= AGE_PENALTY.WEEK;
  else if (ageDays < 30) score -= AGE_PENALTY.MONTH;

  // ---------------------------------------------------------------------
  // 12. Supply Inflation
  // ---------------------------------------------------------------------
  if (circulatingSupply > 0) {
    const supplyRatio = totalSupply / circulatingSupply;
    if (supplyRatio > 1.5) score -= SUPPLY_PENALTY_HIGH;
    else if (supplyRatio > 1.2) score -= SUPPLY_PENALTY_MODERATE;
  } else {
    score -= SUPPLY_PENALTY_HIGH;
  }

  // ---------------------------------------------------------------------
  // 13. Networks & DEX
  // ---------------------------------------------------------------------
  if (networksCount <= 1) score -= NETWORK_LOW;
  else if (networksCount >= 3) score += NETWORK_HIGH_BONUS;

  if (dexCount <= 1) score -= DEX_LOW;
  else if (dexCount >= 5) score += DEX_HIGH_BONUS;

  // ---------------------------------------------------------------------
  // 14. Social Presence
  // ---------------------------------------------------------------------
  const socialCount = [twitter, telegram, discord, ...(websites || [])].filter(Boolean).length;
  if (socialCount === 0) score -= SOCIAL_NONE;
  else if (socialCount === 1) score -= SOCIAL_FEW;
  else if (socialCount >= 3) score += SOCIAL_STRONG_BONUS;

  console.log("raw score", score);

  // ---------------------------------------------------------------------
  // 15. Clamp final score
  // ---------------------------------------------------------------------
  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score)
  };
};

export const calculateLightRiskScore = (
  token: RiskAnalysisParams
): {
  totalScore: number;
  score: number;
  risk: RISK_STATUS;
} => {
  let score = MAX_SCORE;

  const {
    circulatingSupply,
    totalSupply,
    totalHolders,
    top10HolderSupplyPercentage: t10,
    top20HolderSupplyPercentage: t20,

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
  } = token;

  // =====================================================================
  // === 1. Holders Concentration ========================================
  // =====================================================================

  const equalPercentagePerHolder = totalHolders > 0 ? 100 / totalHolders : 100;

  let concentrationPenalty = 0;

  if (t10 > equalPercentagePerHolder * 10) {
    concentrationPenalty += (t10 - equalPercentagePerHolder * 10) * 0.6;
  }

  if (t20 > equalPercentagePerHolder * 20) {
    concentrationPenalty += (t20 - equalPercentagePerHolder * 20) * 0.35;
  }

  concentrationPenalty = Math.min(MAX_CONCENTRATION_PENALTY, concentrationPenalty);
  score -= concentrationPenalty;

  // =====================================================================
  // === 2. Authorities & Metadata =======================================
  // =====================================================================

  if (mintAuthorityAvailable) score -= MINT_AUTHORITY_PENALTY;
  if (freezeAuthorityAvailable) score -= FREEZE_AUTHORITY_PENALTY;
  if (!immutableMetadata) score -= NON_IMMUTABLE_METADATA_PENALTY;

  // =====================================================================
  // === 3. Identity Risks ===============================================
  // =====================================================================

  if (impersonator) score -= IMPERSONATOR_PENALTY;

  // =====================================================================
  // === 4. Verification ==================================================
  // =====================================================================

  if (!verifiedOnCoingecko) score -= NOT_VERIFIED_COINGECKO_PENALTY;
  if (!verifiedOnCoingeckoTerminal) score -= NOT_VERIFIED_GECKOTERMINAL_PENALTY;

  if (!socialsVerified) score -= SOCIALS_MISSING_PENALTY;
  if (!metadataVerified) score -= METADATA_NOT_VERIFIED_PENALTY;

  // =====================================================================
  // === 5. Network Presence (Credibility) ================================
  // =====================================================================

  if (networksCount <= 1) score -= NETWORKS_LOW_PENALTY;
  if (networksCount >= 3) score += NETWORKS_HIGH_BONUS;

  // =====================================================================
  // === 6. Supply Inflation ==============================================
  // =====================================================================

  if (circulatingSupply <= 0 && totalSupply > 0) {
    score -= 10;
  } else {
    const supplyRatio = totalSupply / (circulatingSupply || 1);
    if (supplyRatio > 1.5) score -= 10;
    else if (supplyRatio > 1.2) score -= 5;
  }

  // =====================================================================
  // === 7. Activity ======================================================
  // =====================================================================

  if (!recentActivity) score -= NO_RECENT_ACTIVITY_PENALTY;

  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score)
  };
};

export const calculateRiskScore = (params: RiskAnalysisParams) =>
  params.isStableCoin || params.verifiedOnCoingeckoTerminal ? calculateRiskScoreBalanced(params) : calculateLightRiskScore(params);
