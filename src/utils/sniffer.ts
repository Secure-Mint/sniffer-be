import { RISK_STATUS } from "../utils/constants";
import { RiskAnalysisParams } from "types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const MAX_SCORE = 100;
const MIN_SCORE = 35;
const STABLE_COIN_SCORE = 90;
const MAX_CONCENTRATION_PENALTY = 30;
const IMPERSONATOR_PENALTY = 50;
const MINT_AUTHORITY_PENALTY = 20;
const FREEZE_AUTHORITY_PENALTY = 10;
const NON_IMMUTABLE_METADATA_PENALTY = 5;
const MILLION_100 = 100_000_000;
const MILLION_50 = 50_000_000;
const MILLION_10 = 10_000_000;
const MILLION_5 = 5_000_000;
const MILLION = 1_000_000;
const FIVE_HUNDRED_THOUSAND = 500_000;
const HUNDRED_THOUSAND = 100_000;
const FIFTY_THOUSAND = 50_000;
const TEN_THOUSAND = 10_000;
const THOUSAND = 1_000;

const enum DAILY_VOLUME_PENALTY {
  VOLUME_1000 = 15,
  VOLUME_10_000 = 10,
  VOLUME_50_000 = 6,
  VOLUME_100_000 = 3
}

const enum MARKETCAP_PENALTY {
  MILLION_100 = 2,
  MILLION_50 = 3,
  MILLION_10 = 4,
  MILLION_5 = 5,
  MILLION = 6,
  FIVE_HUNDRED_THOUSAND = 7,
  HUNDRED_THOUSAND = 8,
  FIFTY_THOUSAND = 10
}

const enum HOLDERS_PENALTY {
  HOLDERS_500 = 15,
  HOLDERS_1000 = 12,
  HOLDERS_3000 = 7,
  HOLDERS_10_000 = 3
}

const enum AGE_PENALTY {
  AGE_3 = 15,
  AGE_7 = 10,
  AGE_30 = 6,
  AGE_90 = 3
}

export const getRiskStatus = (score: number): RISK_STATUS => {
  if (score <= 35) return RISK_STATUS.EXTREME_RISK;
  if (score <= 45) return RISK_STATUS.VERY_HIGH_RISK;
  if (score <= 55) return RISK_STATUS.HIGH_RISK;
  if (score <= 75) return RISK_STATUS.MODERATE_RISK;
  if (score <= 85) return RISK_STATUS.LOW_RISK;
  return RISK_STATUS.VERY_LOW_RISK;
};

export const calculateRiskScore = (
  token: RiskAnalysisParams
): {
  totalScore: number;
  score: number;
  risk: RISK_STATUS;
} => {
  let score = MAX_SCORE;

  const {
    totalHolders,
    totalSupply,
    top10HolderSupplyPercentage: t10,
    top20HolderSupplyPercentage: t20,
    top30HolderSupplyPercentage: t30,
    top40HolderSupplyPercentage: t40,
    top50HolderSupplyPercentage: t50,
    frozenSupply,
    circulatingSupply,
    firstOnchainActivity,
    dailyVolume,
    marketCap,
    impersonator,
    freezeAuthorityAvailable,
    mintAuthorityAvailable,
    immutableMetadata,
    isStableCoin
  } = token;

  if (isStableCoin) {
    score = STABLE_COIN_SCORE;
    return {
      totalScore: MAX_SCORE,
      score,
      risk: getRiskStatus(score)
    };
  }

  const equalPercentagePerHolder = 100 / totalHolders;
  let concentrationPenalty = 0;
  if (t10 > equalPercentagePerHolder * 10) concentrationPenalty += (t10 - equalPercentagePerHolder * 10) * 0.6;
  if (t20 > equalPercentagePerHolder * 20) concentrationPenalty += (t20 - equalPercentagePerHolder * 20) * 0.35;
  if (t30 > equalPercentagePerHolder * 30) concentrationPenalty += (t30 - equalPercentagePerHolder * 30) * 0.25;
  if (t40 > equalPercentagePerHolder * 40) concentrationPenalty += (t30 - equalPercentagePerHolder * 40) * 0.25;
  if (t50 > equalPercentagePerHolder * 50) concentrationPenalty += (t50 - equalPercentagePerHolder * 50) * 0.15;

  concentrationPenalty = Math.min(MAX_CONCENTRATION_PENALTY, concentrationPenalty);
  score -= concentrationPenalty;

  // --- 2. Authority Risks ---
  if (mintAuthorityAvailable) score -= MINT_AUTHORITY_PENALTY;
  if (freezeAuthorityAvailable) score -= FREEZE_AUTHORITY_PENALTY;
  if (!immutableMetadata) score -= NON_IMMUTABLE_METADATA_PENALTY;

  // --- 3. Impersonation ---
  if (impersonator) score -= IMPERSONATOR_PENALTY;

  // --- 4. Volume / Liquidity ---
  if (dailyVolume < THOUSAND) score -= DAILY_VOLUME_PENALTY.VOLUME_1000;
  else if (dailyVolume < TEN_THOUSAND) score -= DAILY_VOLUME_PENALTY.VOLUME_10_000;
  else if (dailyVolume < FIFTY_THOUSAND) score -= DAILY_VOLUME_PENALTY.VOLUME_50_000;
  else if (dailyVolume < HUNDRED_THOUSAND) score -= DAILY_VOLUME_PENALTY.VOLUME_100_000;

  // Market cap
  if (marketCap < FIFTY_THOUSAND) score -= MARKETCAP_PENALTY.FIFTY_THOUSAND;
  else if (marketCap < HUNDRED_THOUSAND) score -= MARKETCAP_PENALTY.HUNDRED_THOUSAND;
  else if (marketCap < FIVE_HUNDRED_THOUSAND) score -= MARKETCAP_PENALTY.FIVE_HUNDRED_THOUSAND;
  else if (marketCap < MILLION) score -= MARKETCAP_PENALTY.MILLION;
  else if (marketCap < MILLION_5) score -= MARKETCAP_PENALTY.MILLION_5;
  else if (marketCap < MILLION_10) score -= MARKETCAP_PENALTY.MILLION_10;
  else if (marketCap < MILLION_50) score -= MARKETCAP_PENALTY.MILLION_50;
  else if (marketCap < MILLION_100) score -= MARKETCAP_PENALTY.MILLION_100;

  // --- 5. Holder Count ---
  if (totalHolders > 1) {
    if (totalHolders < 500) score -= HOLDERS_PENALTY.HOLDERS_500;
    else if (totalHolders < 1_000) score -= HOLDERS_PENALTY.HOLDERS_1000;
    else if (totalHolders < 3_000) score -= HOLDERS_PENALTY.HOLDERS_3000;
    else if (totalHolders < 10_000) score -= HOLDERS_PENALTY.HOLDERS_10_000;
  }

  // --- 6. Age ---
  const ageDays = (Date.now() - new Date(firstOnchainActivity).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 3) score -= AGE_PENALTY.AGE_3;
  else if (ageDays < 7) score -= AGE_PENALTY.AGE_7;
  else if (ageDays < 30) score -= AGE_PENALTY.AGE_30;
  else if (ageDays < 90) score -= AGE_PENALTY.AGE_90;

  // --- 7. Supply inflation ---
  const circulating = Number(circulatingSupply ?? 0);
  const supply = Number(totalSupply ?? 0);
  if (circulating <= 0 && supply > 0) {
    score -= 10;
  } else {
    const ratio = supply / circulating;
    if (ratio > 1.5) {
      score -= 10;
    } else if (ratio > 1.2) {
      score -= 5;
    }
  }

  // -- Final Score
  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score)
  };
};
