import { RISK_STATUS } from "../utils/constants";
import { RiskAnalysisParams } from "types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const MAX_SCORE = 100;
const MIN_SCORE = 35;
const STABLE_COIN_SCORE = 90;
const MAX_CONCENTRATION_PENALTY = 50;
const IMPERSONATOR_PENALTY = 50;

const getRiskStatus = (score: number): RISK_STATUS => {
  if (score <= 35) return RISK_STATUS.EXTREME_RISK;
  if (score <= 45) return RISK_STATUS.VERY_HIGH_RISK;
  if (score <= 55) return RISK_STATUS.HIGH_RISK;
  if (score <= 75) return RISK_STATUS.MODERATE_RISK;
  if (score <= 85) return RISK_STATUS.LOW_RISK;
  return RISK_STATUS.VERY_LOW_RISK;
};

/**
 * ==========================================
 *        TOKEN RISK SCORE CALCULATION
 * ==========================================
 * Score Range: 0 (extreme risk) → 100 (low risk)
 * Starting Score: 100 — points are deducted based on risk factors.
 *
 *
 * ==========================================
 * 1. SUPPLY CONCENTRATION RISK (Max –40)
 * ==========================================
 * High whale concentration dramatically increases rug-pull risk.
 *
 * Penalties (stricter multipliers):
 *  - top10HolderSupplyPercentage > 40%:
 *        (value - 40) * 0.6
 *  - top20HolderSupplyPercentage > 50%:
 *        (value - 50) * 0.35
 *  - top30HolderSupplyPercentage > 60%:
 *        (value - 60) * 0.25
 *  - top50HolderSupplyPercentage > 75%:
 *        (value - 75) * 0.15
 *
 * Total concentration penalty is capped at 40.
 *
 *
 * ==========================================
 * 2. AUTHORITY RISKS (Max –35)
 * ==========================================
 * Tokens with mutable or privileged authorities are riskier.
 *
 * Penalties:
 *  - mintAuthorityAvailable === true        → –20
 *  - freezeAuthorityAvailable === true      → –10
 *  - immutableMetadata === false            → –5
 *
 *
 * ==========================================
 * 3. IMPERSONATION RISK (Max –50)
 * ==========================================
 * A token impersonating another project/name is one of the most
 * severe scam indicators.
 *
 * Penalty:
 *  - impersonator === true → –50
 *
 *
 * ==========================================
 * 4. LIQUIDITY / VOLUME RISK (Max –15)
 * ==========================================
 * Low daily trading volume indicates poor liquidity and higher risk.
 *
 * Penalties (stricter):
 *  - dailyVolume < 1,000        → –15
 *  - dailyVolume < 10,000       → –10
 *  - dailyVolume < 50,000       → –6
 *  - dailyVolume < 100,000      → –3
 *
 * Optional bonuses:
 *  - marketCap > 10M            → +2
 *  - marketCap > 100M           → +4
 *
 *
 * ==========================================
 * 5. HOLDER COUNT RISK (Max –15)
 * ==========================================
 * Fewer holders = higher rug/scam probability.
 *
 * IMPORTANT:
 *  - If totalHolders <= 1, distribution is meaningless.
 *    → No penalties or bonuses should be applied.
 *
 * Penalties:
 *  - totalHolders < 500         → –15
 *  - totalHolders < 1,000       → –12
 *  - totalHolders < 3,000       → –7
 *  - totalHolders < 10,000      → –3
 *
 *
 * ==========================================
 * 6. TOKEN AGE RISK (Max –15)
 * ==========================================
 * Very young tokens are significantly riskier.
 *
 * Penalties:
 *  - ageDays < 3                → –15
 *  - ageDays < 7                → –10
 *  - ageDays < 30               → –6
 *  - ageDays < 90               → –3
 *
 *
 * ==========================================
 * 7. SUPPLY INFLATION RISK (Max –10)
 * ==========================================
 * If total supply is much larger than circulating supply,
 * project may inflate supply or dump unlocked tokens.
 *
 * Penalties:
 *  - totalSupply > circulatingSupply * 1.5  → –10
 *  - totalSupply > circulatingSupply * 1.2  → –5
 *
 *
 * ==========================================
 * FINAL SCORE
 * ==========================================
 * score = clamp(roundedScore, 0, 100)
 *
 *
 * ==========================================
 * RISK STATUS MAPPING
 * ==========================================
 * Based on final clamped score:
 *
 *   0–20    → EXTREME_RISK
 *   21–40   → HIGH_RISK
 *   41–70   → MODERATE_RISK
 *   71–100  → LOW_RISK
 *
 */
export const calculateRiskScore = (
  token: RiskAnalysisParams
): {
  totalScore: number;
  score: number;
  risk: RISK_STATUS;
} => {
  let score = MAX_SCORE;

  if (token.isStableCoin) {
    score = STABLE_COIN_SCORE;
    return {
      totalScore: MAX_SCORE,
      score,
      risk: getRiskStatus(score)
    };
  }

  // --- 1. Concentration ---
  const t10 = token.top10HolderSupplyPercentage;
  const t20 = token.top20HolderSupplyPercentage;
  const t30 = token.top30HolderSupplyPercentage;
  const t50 = token.top50HolderSupplyPercentage;

  let concentrationPenalty = 0;
  if (t10 > 40) concentrationPenalty += (t10 - 40) * 0.6;
  if (t20 > 50) concentrationPenalty += (t20 - 50) * 0.35;
  if (t30 > 60) concentrationPenalty += (t30 - 60) * 0.25;
  if (t50 > 75) concentrationPenalty += (t50 - 75) * 0.15;

  concentrationPenalty = Math.min(MAX_CONCENTRATION_PENALTY, concentrationPenalty);
  score -= concentrationPenalty;

  // --- 2. Authority Risks ---
  if (token.mintAuthorityAvailable) score -= 20;
  if (token.freezeAuthorityAvailable) score -= 10;
  if (!token.immutableMetadata) score -= 5;

  // --- 3. Impersonation ---
  if (token.impersonator) score -= IMPERSONATOR_PENALTY;

  // --- 4. Volume / Liquidity ---
  const v = token.dailyVolume;
  if (v < 1_000) score -= 15;
  else if (v < 10_000) score -= 10;
  else if (v < 50_000) score -= 6;
  else if (v < 100_000) score -= 3;

  // Market cap bonus
  if (token.marketCap > 100_000_000) score += 4;
  else if (token.marketCap > 10_000_000) score += 2;

  // --- 5. Holder Count ---
  const h = token.totalHolders;

  if (h > 1) {
    if (h < 500) score -= 15;
    else if (h < 1_000) score -= 12;
    else if (h < 3_000) score -= 7;
    else if (h < 10_000) score -= 3;
  }

  // --- 6. Age ---
  const ageDays = (Date.now() - new Date(token.firstOnchainActivity).getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays < 3) score -= 15;
  else if (ageDays < 7) score -= 10;
  else if (ageDays < 30) score -= 6;
  else if (ageDays < 90) score -= 3;

  // --- 7. Supply inflation ---
  if (token.totalSupply > token.circulatingSupply * 1.5) score -= 10;
  else if (token.totalSupply > token.circulatingSupply * 1.2) score -= 5;

  // -- Final Score
  score = clamp(Math.round(score), MIN_SCORE, MAX_SCORE);

  return {
    totalScore: MAX_SCORE,
    score,
    risk: getRiskStatus(score)
  };
};
