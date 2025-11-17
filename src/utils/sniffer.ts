import { RISK_STATUS } from "../utils/constants";
import { TokenAnalysisData } from "types";

export const calculateTokenRiskScore = (data: TokenAnalysisData): { score: number; totalScore: number; risk: RISK_STATUS } => {
  // --- Risk Weighting (Total 100 Points) ---
  const MAX_SUPPLY_CONTROL_SCORE = 40;
  const MAX_CENTRALIZATION_SCORE = 30;
  const MAX_TRUST_AND_AGE_SCORE = 30;
  const DAYS_FOR_ZERO_AGE_RISK = 365;

  // --- Helper to calculate age in days ---
  const getAgeInDays = (creationTimestamp: number): number => {
    const now = Date.now();
    const ageInMilliseconds = now - creationTimestamp;
    const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
    return Math.max(0, ageInDays);
  };

  const totalScore = 100;
  let rawRiskScore = 0;
  let supplyControlScore = 0;
  let centralizationScore = 0;
  let trustAndAgeScore = 0;
  let frozenPercent = 0;
  const ageInDays = getAgeInDays(data.firstOnchainActivity);

  // ==========================================================
  // 1. SUPPLY CONTROL & MUTABILITY SCORE (MAX 40 POINTS)
  // ==========================================================

  // 1a. Mint Authority (Max 15 points)
  // If Mint Authority is available, a single entity can create infinite supply.
  if (data.mintAuthorityAvailable) {
    supplyControlScore += 15;
  }

  // 1b. Freeze Authority (Max 15 points)
  // If Freeze Authority is available, a single entity can lock users' funds.
  if (data.freezeAuthorityAvailable) {
    supplyControlScore += 15;
  }

  // 1c. Frozen Supply (Max 10 points)
  if (data.totalSupply > 0) {
    frozenPercent = (data.frozenSupply / data.totalSupply) * 100;
    // Linear scaling: 100% frozen = 10 points
    supplyControlScore += (frozenPercent / 100) * 10;
  }

  // Cap the supply control score at its max weight
  supplyControlScore = Math.min(supplyControlScore, MAX_SUPPLY_CONTROL_SCORE);

  // ==========================================================
  // 2. HOLDER CENTRALIZATION SCORE (MAX 30 POINTS)
  // ==========================================================

  // 2a. Top 50 Concentration (Max 20 points)
  // High concentration = high price manipulation risk.
  // Linear scaling: 100% concentration = 20 points
  centralizationScore += (data.top50HolderSupplyPercentage / 100) * 20;

  // 2b. Total Holders Count (Max 10 points)
  // Extremely low holder count (low adoption) is high risk.
  const holderPenaltyThreshold = 1000;
  if (data.totalHolders < holderPenaltyThreshold) {
    // Penalty is 10 points for 0 holders, decreasing to 0 points at 1000 holders.
    const penalty = ((holderPenaltyThreshold - data.totalHolders) / holderPenaltyThreshold) * 10;
    centralizationScore += penalty;
  }

  // Cap the centralization score at its max weight
  centralizationScore = Math.min(centralizationScore, MAX_CENTRALIZATION_SCORE);

  // ==========================================================
  // 3. TRUST AND AGE SCORE (MAX 30 POINTS)
  // ==========================================================

  // 3a. Impersonator Flag (Max 15 points)
  // If flagged as an unverified copycat, this is a major trust failure.
  if (data.impersonator) {
    trustAndAgeScore += 15;
  }

  // 3b. Liquidity/Volume Risk (Max 5 points)
  // Very low volume/market cap suggests low utility or high difficulty selling.
  if (data.dailyVolume < 1000 && data.marketCap < 10000) {
    trustAndAgeScore += 5;
  }

  // 3c. Age Score (Max 10 points)
  if (ageInDays < DAYS_FOR_ZERO_AGE_RISK) {
    // Linear decay: score drops to 0 after 365 days
    const decayFactor = (DAYS_FOR_ZERO_AGE_RISK - ageInDays) / DAYS_FOR_ZERO_AGE_RISK;
    trustAndAgeScore += decayFactor * 10;
  }

  // Cap the trust score at its max weight
  trustAndAgeScore = Math.min(trustAndAgeScore, MAX_TRUST_AND_AGE_SCORE);

  // ==========================================================
  // 4. FINAL CALCULATION AND SCORE INVERSION
  // ==========================================================

  // Calculate raw risk score (0=safe, 100=risky)
  rawRiskScore = Math.round(supplyControlScore + centralizationScore + trustAndAgeScore);
  rawRiskScore = Math.min(100, Math.max(0, rawRiskScore));

  // Invert the score as requested (0=risky, 100=safe)
  const finalScore = totalScore - rawRiskScore;

  // Map score to custom RISK_STATUS enum using the INVERTED score
  const getRiskStatus = (score: number): RISK_STATUS => {
    // 0-20 (Highest Risk, equivalent to 80-100 raw risk)
    if (score <= 40) return RISK_STATUS.EXTREME_RISK;
    // 21-49
    if (score < 60) return RISK_STATUS.HIGH_RISK;
    // 50-79
    if (score < 80) return RISK_STATUS.MODERATE_RISK;
    // 80-100 (Lowest Risk, equivalent to 0-20 raw risk)
    return RISK_STATUS.LOW_RISK;
  };

  return {
    totalScore,
    score: finalScore,
    risk: getRiskStatus(finalScore)
  };
};
