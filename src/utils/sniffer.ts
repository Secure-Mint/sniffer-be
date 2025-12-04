import { RiskAnalysisParams, RiskAnalysisResult } from "types";
import { NUMBERS, RISK_STATUS } from "../utils/constants";
import { fixDecimals, getRiskStatus } from ".";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const COINGECKO_PENALTY = NUMBERS.FIVE;
const JUPITER_PENALTY = NUMBERS.FIVE;
const RADIUM_PENALTY = NUMBERS.FIVE;
const VOLUME_PENALTY_LOW = NUMBERS.EIGHT;
const VOLUME_PENALTY_MID = NUMBERS.FIVE;
const VOLUME_PENALTY_HIGH = NUMBERS.THREE;
const MAX_CONCENTRATION_PENALTY = NUMBERS.TWENTY;
const SOCIALS_MISSING_PENALTY = NUMBERS.FIVE;
const METADATA_NOT_VERIFIED_PENALTY = NUMBERS.FIVE;
const MINT_AUTHORITY_PENALTY = NUMBERS.TEN;
const FREEZE_AUTHORITY_PENALTY = NUMBERS.TEN;
const IMMUTABLE_METADATA_PENALTY = NUMBERS.FIVE;
const IMPERSONATOR_PENALTY = NUMBERS.TWENTY_FIVE;
const HONEY_POT_PENALTY = NUMBERS.TWENTY_FIVE;
const RUG_PUL_PENALTY = NUMBERS.TWENTY_FIVE;
const NO_RECENT_ACTIVITY_PENALTY = NUMBERS.TEN;
const BUYER_SELLER_IMBALANCE = NUMBERS.FOUR;
const SYMBOL_COLLISION_PENALTY = NUMBERS.FIVE;
const DEX_LOW = NUMBERS.FOUR;
const SOCIAL_NONE = NUMBERS.TEN;
const SOCIAL_FEW = NUMBERS.FOUR;
const SUPPLY_PENALTY_HIGH = NUMBERS.EIGHT;
const SUPPLY_PENALTY_MODERATE = NUMBERS.FOUR;
const NETWORKS_LOW_PENALTY = NUMBERS.THREE;
const NETWORKS_HIGH_BONUS = NUMBERS.THREE;
const DEX_HIGH_BONUS = NUMBERS.THREE;
const SOCIAL_STRONG_BONUS = NUMBERS.THREE;
const T10_HOLDERS_THRESHOLD = 15;
const T20_HOLDERS_THRESHOLD = 40;

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

export const ulateTokenAgeDays = (firstOnchainActivity: string): number => {
  const created = new Date(firstOnchainActivity).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
};

const holdersPenalty = (
  result: RiskAnalysisResult,
  { top10HolderSupplyPercentage, top20HolderSupplyPercentage, isStableCoin }: RiskAnalysisParams
) => {
  let penalty = 0;
  if (!top10HolderSupplyPercentage) {
    penalty += NUMBERS.FIFTEEN * NUMBERS.FIFTY_PERCENT;
    result.detailedAnalysis.push({
      detail: "No distribution among the top 10 holders due to missing data, increasing uncertainty and potential risk.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else if (top10HolderSupplyPercentage > T10_HOLDERS_THRESHOLD) {
    penalty +=
      Math.abs(top10HolderSupplyPercentage - T10_HOLDERS_THRESHOLD) * (isStableCoin ? NUMBERS.TWENTY_FIVE_PERCCENT : NUMBERS.FIFTY_PERCENT);
    result.detailedAnalysis.push({
      detail: `High Top 10 holder concentration: ${fixDecimals(top10HolderSupplyPercentage)}% of the supply is held by the top 10 wallets, increased manipulation risk.`,
      risk: isStableCoin ? RISK_STATUS.MODERATE_RISK : RISK_STATUS.HIGH_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Top 10 holder distribution looks healthy: ${fixDecimals(top10HolderSupplyPercentage)}% held by top 10 wallets.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  if (!top20HolderSupplyPercentage) {
    penalty += 40 * NUMBERS.TWENTY_FIVE_PERCCENT;
    result.detailedAnalysis.push({
      detail: "No distribution among the top 20 holders due to missing data, increasing uncertainty and potential risk.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else if (top20HolderSupplyPercentage > T20_HOLDERS_THRESHOLD) {
    penalty +=
      Math.abs(top20HolderSupplyPercentage - T20_HOLDERS_THRESHOLD) * (isStableCoin ? NUMBERS.TWENTY_FIVE_PERCCENT : NUMBERS.FIFTY_PERCENT);
    result.detailedAnalysis.push({
      detail: `High Top 20 holder concentration: ${fixDecimals(
        top20HolderSupplyPercentage
      )}% of the supply is held by the top 20 wallets, centralization risk.`,
      risk: isStableCoin ? RISK_STATUS.MODERATE_RISK : RISK_STATUS.HIGH_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Top 20 holder distribution looks healthy: ${fixDecimals(top20HolderSupplyPercentage)}% held by top 20 wallets.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }

  result.score -= Math.min(penalty, MAX_CONCENTRATION_PENALTY);
};

const whaleScore = (result: RiskAnalysisResult, { whaleAccountsAvailable }: RiskAnalysisParams) => {
  if (whaleAccountsAvailable) {
    result.score += NUMBERS.FIVE;
    result.detailedAnalysis.push({
      detail: "Whale account activity detected, indicating interest from large holders (may imply liquidity or strategic support).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "No whale account activity detected.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }
};

const coingeckoScore = (result: RiskAnalysisResult, { verifiedOnCoingecko }: RiskAnalysisParams) => {
  if (verifiedOnCoingecko) {
    result.score += COINGECKO_PENALTY * NUMBERS.TWENTY_FIVE_PERCCENT;
    result.detailedAnalysis.push({
      detail: "Token is verified on CoinGecko, improving credibility and transparency.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.score -= COINGECKO_PENALTY;
    result.detailedAnalysis.push({
      detail: "Token is not verified on CoinGecko, reducing trust and public visibility.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  }
};

const jupiterScore = (result: RiskAnalysisResult, { verifiedOnJupiter }: RiskAnalysisParams) => {
  if (verifiedOnJupiter) {
    result.score += JUPITER_PENALTY * NUMBERS.TWENTY_FIVE_PERCCENT;
    result.detailedAnalysis.push({
      detail: "Token is verified on Jupiter, improving routing/aggregator visibility.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.score -= JUPITER_PENALTY * NUMBERS.FIFTY_PERCENT;
    result.detailedAnalysis.push({
      detail: "Token is not verified on Jupiter, limiting routing and aggregator trust.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  }
};

const socialsScore = (result: RiskAnalysisResult, { socialsVerified }: RiskAnalysisParams) => {
  if (socialsVerified) {
    result.detailedAnalysis.push({
      detail: "Social accounts and handles have been verified, improving public trust.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.score -= SOCIALS_MISSING_PENALTY;
    result.detailedAnalysis.push({
      detail: "Project social accounts are missing or unverified, reducing credibility and community trust.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  }
};

const metadataScore = (result: RiskAnalysisResult, { metadataVerified }: RiskAnalysisParams) => {
  if (metadataVerified) {
    result.detailedAnalysis.push({
      detail: "Token metadata is verified and consistent with registry information.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.score -= METADATA_NOT_VERIFIED_PENALTY;
    result.detailedAnalysis.push({
      detail: "Token metadata is not verified, increasing risk of misinformation or metadata tampering.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  }
};

const mintAuthorityScore = (result: RiskAnalysisResult, { isStableCoin, mintAuthorityAvailable }: RiskAnalysisParams) => {
  if (!isStableCoin && mintAuthorityAvailable) {
    result.score -= MINT_AUTHORITY_PENALTY;
    result.detailedAnalysis.push({
      detail: "Mint authority is enabled, additional tokens can be minted (dilution / rug risk).",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "Mint authority is disabled or irrelevant for stablecoins, no additional minting risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const freezeAuthorityScore = (result: RiskAnalysisResult, { isStableCoin, freezeAuthorityAvailable }: RiskAnalysisParams) => {
  if (!isStableCoin && freezeAuthorityAvailable) {
    result.score -= FREEZE_AUTHORITY_PENALTY;
    result.detailedAnalysis.push({
      detail: "Freeze authority is active, wallets could be frozen (centralized control risk).",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "Freeze authority is disabled or irrelevant for stablecoins, no wallet-freezing risk.",
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const immutableMetadataScore = (result: RiskAnalysisResult, { immutableMetadata, isStableCoin }: RiskAnalysisParams) => {
  if (immutableMetadata) {
    result.detailedAnalysis.push({
      detail: "Metadata is immutable, token information cannot be changed after deployment.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.score -= IMMUTABLE_METADATA_PENALTY;
    result.detailedAnalysis.push({
      detail: "Metadata is mutable, project can change token information after deployment (misinformation risk).",
      risk: isStableCoin ? RISK_STATUS.MODERATE_RISK : RISK_STATUS.HIGH_RISK
    });
  }
};

const impersonatorScore = (result: RiskAnalysisResult, { impersonator }: RiskAnalysisParams) => {
  if (impersonator) {
    result.score -= IMPERSONATOR_PENALTY;
    result.detailedAnalysis.push({
      detail: "Token appears to impersonate another project, high scam/impersonation risk.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "No impersonation signs detected, identity looks legitimate.",
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const symbolCollisionScore = (result: RiskAnalysisResult, { isStableCoin, symbolCollisionCount }: RiskAnalysisParams) => {
  if (!isStableCoin) {
    if (symbolCollisionCount && symbolCollisionCount > 0) {
      const penalty = Math.min(symbolCollisionCount * SYMBOL_COLLISION_PENALTY, SYMBOL_COLLISION_PENALTY);
      result.score -= penalty;
      result.detailedAnalysis.push({
        detail: `${symbolCollisionCount} symbol collision(s) detected, increases confusion and impersonation risk.`,
        risk: RISK_STATUS.HIGH_RISK
      });
    } else {
      result.detailedAnalysis.push({
        detail: "Token symbol is unique, reduced confusion and impersonation risk.",
        risk: RISK_STATUS.LOW_RISK
      });
    }
  }
};

const honeypotScore = (result: RiskAnalysisResult, { isHoneyPot }: RiskAnalysisParams) => {
  if (isHoneyPot) {
    result.score -= HONEY_POT_PENALTY;
    result.detailedAnalysis.push({
      detail: "Honeypot behavior detected, buyers may not be able to sell. Extremely high scam risk.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "No honeypot behavior detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const rugPullScore = (result: RiskAnalysisResult, { isRugPull }: RiskAnalysisParams) => {
  if (isRugPull) {
    result.score -= RUG_PUL_PENALTY;
    result.detailedAnalysis.push({
      detail: "Rug-pull indicators present, liquidity drain or fraudulent behavior risk is high.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "No rug pull indicators detected.",
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const liquidityScore = (result: RiskAnalysisResult, { liquidityUSD }: RiskAnalysisParams) => {
  if (liquidityUSD < NUMBERS.THOUSAND) {
    result.score -= 21;
    result.detailedAnalysis.push({
      detail: "Liquidity is extremely low (< $1k), making trading unsafe and prone to manipulation.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else if (liquidityUSD < NUMBERS.TEN_THOUSAND) {
    result.score -= 18;
    result.detailedAnalysis.push({
      detail: "Liquidity is very low ($1k–$10k), resulting in poor price stability and high slippage.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIFTY_THOUSAND) {
    result.score -= 15;
    result.detailedAnalysis.push({
      detail: "Liquidity is below recommended levels ($10k–$50k) for safe trading.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (liquidityUSD < NUMBERS.HUNDRED_THOUSAND) {
    result.score -= 12;
    result.detailedAnalysis.push({
      detail: "Liquidity is moderate ($50k–$100k) but may cause volatility for large trades.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (liquidityUSD < NUMBERS.TWO_HUNDRED_THOUSAND) {
    result.score -= 9;
    result.detailedAnalysis.push({
      detail: "Liquidity is acceptable ($100k–$200k).",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIVE_HUNDRED_THOUSAND) {
    result.score -= 6;
    result.detailedAnalysis.push({
      detail: "Liquidity is reasonably healthy ($200k–$500k).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.MILLION) {
    result.score -= 4;
    result.detailedAnalysis.push({
      detail: "Liquidity is good ($500k–$1M).",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.TWO_MILLION) {
    result.score -= 2;
    result.detailedAnalysis.push({
      detail: "Liquidity is strong ($1M–$2M).",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  } else if (liquidityUSD < NUMBERS.FIVE_MILLION) {
    result.score -= 1;
    result.detailedAnalysis.push({
      detail: "Liquidity is very strong ($2M–$5M).",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: "Liquidity is excellent (> $5M), supporting stable trading with minimal slippage.",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  }
};

const marketCapScore = (result: RiskAnalysisResult, { marketCap }: RiskAnalysisParams) => {
  if (marketCap < NUMBERS.TWENTY_FIVE_THOUSAND) {
    result.score -= MARKETCAP_PENALTY.TINY;
    result.detailedAnalysis.push({
      detail: "Market cap is extremely low (< $25k), typical of very early-stage or high-risk tokens.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  } else if (marketCap < NUMBERS.HUNDRED_THOUSAND) {
    result.score -= MARKETCAP_PENALTY.SMALL;
    result.detailedAnalysis.push({
      detail: "Market cap is small ($25k–$100k), indicating early stage and increased volatility.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  } else if (marketCap < NUMBERS.FIVE_HUNDRED_THOUSAND) {
    result.score -= MARKETCAP_PENALTY.MID;
    result.detailedAnalysis.push({
      detail: "Market cap is moderate ($100k–$500k) with typical early-stage volatility.",
      risk: RISK_STATUS.HIGH_RISK
    });
  }
};

const marketCapBonusScore = (result: RiskAnalysisResult, { marketCap }: RiskAnalysisParams) => {
  if (marketCap > NUMBERS.FIFTY_MILLION) {
    result.score += MARKETCAP_BONUS.VERY_HIGH;
    result.detailedAnalysis.push({
      detail: "Market cap is huge, improving credibility.",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  } else if (marketCap > NUMBERS.TWENTY_MILLION) {
    result.score += MARKETCAP_BONUS.HIGH;
    result.detailedAnalysis.push({
      detail: "Market cap is strong, showing solid investor confidence.",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  } else if (marketCap > NUMBERS.TEN_MILLION) {
    result.score += MARKETCAP_BONUS.LARGE;
    result.detailedAnalysis.push({
      detail: "Market cap is healthy, indicating steady growth and activity.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (marketCap > NUMBERS.FIVE_MILLION) {
    result.score += MARKETCAP_BONUS.SMALL;
    result.detailedAnalysis.push({
      detail: "Market cap is decent, suggesting an emerging but stable project.",
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (marketCap > NUMBERS.MILLION) {
    result.score += MARKETCAP_BONUS.TINY;
    result.detailedAnalysis.push({
      detail: "Market cap is modest, showing early-stage traction.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (marketCap > NUMBERS.FIVE_HUNDRED_THOUSAND) {
    result.score += MARKETCAP_BONUS.TINY;
    result.detailedAnalysis.push({
      detail: "Market cap is modest, showing early-stage traction.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  }
};

const dailyVolumeScore = (result: RiskAnalysisResult, { isStableCoin, dailyVolume }: RiskAnalysisParams) => {
  if (!isStableCoin) {
    if (!dailyVolume) {
      result.score -= VOLUME_PENALTY_LOW;
      result.detailedAnalysis.push({
        detail: "Trading volume is extremely low ($0), indicating low interest or an abandoned project.",
        risk: RISK_STATUS.VERY_HIGH_RISK
      });
    } else if (dailyVolume < NUMBERS.TWO_THOUSAND) {
      result.score -= VOLUME_PENALTY_LOW;
      result.detailedAnalysis.push({
        detail: "Trading volume is extremely low (< $2k), indicating low interest or an abandoned project.",
        risk: RISK_STATUS.HIGH_RISK
      });
    } else if (dailyVolume < NUMBERS.TEN_THOUSAND) {
      result.score -= VOLUME_PENALTY_MID;
      result.detailedAnalysis.push({
        detail: "Trading volume is low ($2k–$10k), which may cause volatility.",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (dailyVolume < NUMBERS.FIFTY_THOUSAND) {
      result.score -= VOLUME_PENALTY_HIGH;
      result.detailedAnalysis.push({
        detail: "Trading volume is moderate ($10k–$50k).",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (dailyVolume > NUMBERS.FIVE_HUNDRED_THOUSAND) {
      result.score += VOLUME_BONUS.HIGH;
      result.detailedAnalysis.push({
        detail: "Trading volume is very high (> $500k), indicating strong market interest.",
        risk: RISK_STATUS.LOW_RISK
      });
    } else if (dailyVolume > NUMBERS.TWO_FIFTY_THOUSAND) {
      result.score += VOLUME_BONUS.STRONG;
      result.detailedAnalysis.push({
        detail: "Trading volume is strong ($250k–$500k), indicating active market participation.",
        risk: RISK_STATUS.LOW_RISK
      });
    } else if (dailyVolume > NUMBERS.HUNDRED_THOUSAND) {
      result.score += VOLUME_BONUS.NORMAL;
      result.detailedAnalysis.push({
        detail: "Trading volume is healthy ($100k–$250k).",
        risk: RISK_STATUS.LOW_RISK
      });
    } else {
      // fallback / neutral note
      result.detailedAnalysis.push({
        detail: `24h trading volume: $${dailyVolume}.`,
        risk: RISK_STATUS.INFO
      });
    }
  }
};

const recentActivityScore = (
  result: RiskAnalysisResult,
  { isStableCoin, recentActivity, txCount24h, uniqueBuyers24h, uniqueSellers24h }: RiskAnalysisParams
) => {
  if (!isStableCoin) {
    if (!recentActivity || txCount24h === 0) {
      result.score -= NO_RECENT_ACTIVITY_PENALTY;
      result.detailedAnalysis.push({
        detail: "No recent on-chain activity or zero transactions in the last 24h, project may be inactive or abandoned.",
        risk: RISK_STATUS.VERY_HIGH_RISK
      });
    } else {
      result.detailedAnalysis.push({
        detail: `Recent activity detected: ${txCount24h} transfers in the last 24h.`,
        risk: RISK_STATUS.LOW_RISK
      });
    }

    if (uniqueBuyers24h < uniqueSellers24h) {
      result.score -= BUYER_SELLER_IMBALANCE;
      result.detailedAnalysis.push({
        detail: "More sellers than buyers in the last 24h, downward pressure or loss of confidence.",
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else {
      result.detailedAnalysis.push({
        detail: "Buyer/seller balance in the last 24h looks healthy.",
        risk: RISK_STATUS.LOW_RISK
      });
    }
  }
};

const totalHoldersScore = (result: RiskAnalysisResult, { totalHolders }: RiskAnalysisParams) => {
  if (totalHolders < NUMBERS.TWO_THOUSAND) {
    result.score -= HOLDERS_PENALTY.EXTREME;
    result.detailedAnalysis.push({
      detail: `Very low number of holders (${totalHolders}), typical of new or highly speculative tokens.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (totalHolders < NUMBERS.FIVE_THOUSAND) {
    result.score -= HOLDERS_PENALTY.VERY_HIGH;
    result.detailedAnalysis.push({
      detail: `Low number of holders (${totalHolders}) suggesting early-stage adoption.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (totalHolders < NUMBERS.TEN_THOUSAND) {
    result.score -= HOLDERS_PENALTY.HIGH;
    result.detailedAnalysis.push({
      detail: `Moderate number of holders (${totalHolders}) indicating growing adoption.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (totalHolders < NUMBERS.TWENTY_FIVE_THOUSAND) {
    result.score -= HOLDERS_PENALTY.MODERATE;
    result.detailedAnalysis.push({
      detail: `Healthy holder distribution (${totalHolders}) showing steady growth.`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else if (totalHolders < NUMBERS.FIFTY_THOUSAND) {
    result.score -= HOLDERS_PENALTY.LOW;
    result.detailedAnalysis.push({
      detail: `Good holder base (${totalHolders}).`,
      risk: RISK_STATUS.LOW_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Large and diverse holder base (${totalHolders}) indicating maturity and reduced risk.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const tokenAgeScore = (result: RiskAnalysisResult, { firstOnchainActivity }: RiskAnalysisParams) => {
  const ageDays = firstOnchainActivity ? (Date.now() - new Date(firstOnchainActivity).getTime()) / 86400000 : Infinity;

  if (!firstOnchainActivity) {
    result.detailedAnalysis.push({
      detail: "First on-chain activity date missing, cannot assess token age.",
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (ageDays < 3) {
    result.score -= AGE_PENALTY.NEW;
    result.detailedAnalysis.push({
      detail: `Token is extremely new (<3 days). Age: ${Math.floor(ageDays)} days, high volatility/scam risk.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (ageDays < 7) {
    result.score -= AGE_PENALTY.WEEK;
    result.detailedAnalysis.push({
      detail: `Token is newly launched (${Math.floor(ageDays)} days) and may still be stabilizing.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else if (ageDays < 30) {
    result.score -= AGE_PENALTY.MONTH;
    result.detailedAnalysis.push({
      detail: `Token has short track record (${Math.floor(ageDays)} days).`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Token age (${Math.floor(ageDays)} days) indicates more established history and lower risk.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const supplyRatioScore = (result: RiskAnalysisResult, { totalSupply, circulatingSupply }: RiskAnalysisParams) => {
  if (circulatingSupply > 0) {
    const supplyRatio = totalSupply / circulatingSupply;

    if (supplyRatio > 1.5) {
      result.score -= SUPPLY_PENALTY_HIGH;
      result.detailedAnalysis.push({
        detail: `Total supply (${totalSupply}) significantly exceeds circulating supply (${circulatingSupply}), supply ratio ${supplyRatio.toFixed(
          2
        )} indicates high inflation/dilution risk.`,
        risk: RISK_STATUS.HIGH_RISK
      });
    } else if (supplyRatio > 1.2) {
      result.score -= SUPPLY_PENALTY_MODERATE;
      result.detailedAnalysis.push({
        detail: `Moderate difference between total and circulating supply, supply ratio ${supplyRatio.toFixed(
          2
        )} may indicate future unlocking or inflation.`,
        risk: RISK_STATUS.HIGH_RISK
      });
    } else {
      result.detailedAnalysis.push({
        detail: "Supply distribution between total and circulating appears healthy (low inflation risk).",
        risk: RISK_STATUS.LOW_RISK
      });
    }
  } else {
    result.score -= SUPPLY_PENALTY_HIGH;
    result.detailedAnalysis.push({
      detail: "No circulating supply reported, extremely high risk.",
      risk: RISK_STATUS.EXTREME_RISK
    });
  }
};

const networksScore = (result: RiskAnalysisResult, { isStableCoin, networksCount }: RiskAnalysisParams) => {
  if (!isStableCoin) {
    if (networksCount <= 1) {
      result.score -= NETWORKS_LOW_PENALTY;
      result.detailedAnalysis.push({
        detail: `Token is available on only ${networksCount} network(s), limited exposure and higher isolation risk.`,
        risk: RISK_STATUS.MODERATE_RISK
      });
    } else if (networksCount >= 3) {
      result.score += NETWORKS_HIGH_BONUS;
      result.detailedAnalysis.push({
        detail: `Token operates across ${networksCount} networks, improved distribution and reliability.`,
        risk: RISK_STATUS.LOW_RISK
      });
    } else {
      result.detailedAnalysis.push({
        detail: `Token is available on ${networksCount} networks.`,
        risk: RISK_STATUS.INFO
      });
    }
  }
};

const dexScore = (result: RiskAnalysisResult, { dexCount }: RiskAnalysisParams) => {
  if (dexCount < 1) {
    result.score -= DEX_LOW;
    result.detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEX(s), limited liquidity access.`,
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  } else if (dexCount === 1) {
    result.score -= DEX_LOW;
    result.detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEX(s), limited liquidity access.`,
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (dexCount >= 5) {
    result.score += DEX_HIGH_BONUS;
    result.detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEXs, broad access and improved liquidity depth.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Token is listed on ${dexCount} DEX(s).`,
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  }
};

const socialPresenceScore = (result: RiskAnalysisResult, { twitter, telegram, discord, websites }: RiskAnalysisParams) => {
  const socialCount = [twitter, telegram, discord, ...(websites || [])].filter(Boolean).length;

  if (socialCount === 0) {
    result.score -= SOCIAL_NONE;
    result.detailedAnalysis.push({
      detail: "No social channels found, severely harming credibility and communication.",
      risk: RISK_STATUS.VERY_HIGH_RISK
    });
  } else if (socialCount === 1) {
    result.score -= SOCIAL_FEW;
    result.detailedAnalysis.push({
      detail: "Minimal social presence detected, project visibility is limited.",
      risk: RISK_STATUS.HIGH_RISK
    });
  } else if (socialCount >= 3) {
    result.score += SOCIAL_STRONG_BONUS;
    result.detailedAnalysis.push({
      detail: `Strong social presence across ${socialCount} platforms, boosts trust and engagement.`,
      risk: RISK_STATUS.MODERATE_RISK
    });
  } else {
    result.detailedAnalysis.push({
      detail: `Moderate social presence across ${socialCount} platforms.`,
      risk: RISK_STATUS.LOW_RISK
    });
  }
};

const stableCoinBonus = (result: RiskAnalysisResult, { isStableCoin, marketCap }: RiskAnalysisParams) => {
  if (isStableCoin && marketCap > 0) {
    if (result.score <= 60) result.score += NUMBERS.TEN;
    else if (result.score <= 65) result.score += NUMBERS.EIGHT;
    else if (result.score <= 70) result.score += NUMBERS.SIX;
    else if (result.score <= 75) result.score += NUMBERS.FIVE;

    result.detailedAnalysis.push({
      detail: "Token identified as a stablecoin; baseline risk reduced due to expected price stability.",
      risk: RISK_STATUS.VERY_LOW_RISK
    });
  }
};

export const calcRiskScoreBalanced = (params: RiskAnalysisParams): RiskAnalysisResult => {
  const result: RiskAnalysisResult = {
    score: MAX_SCORE,
    totalScore: MAX_SCORE,
    risk: RISK_STATUS.EXTREME_RISK,
    detailedAnalysis: []
  };

  // === 1. Holder Concentration ========================================
  holdersPenalty(result, params);
  whaleScore(result, params);

  // === 2. Verification ========================================
  coingeckoScore(result, params);
  jupiterScore(result, params);
  socialsScore(result, params);
  metadataScore(result, params);

  // === 3. Authorities & Metadata ========================================
  mintAuthorityScore(result, params);
  freezeAuthorityScore(result, params);
  immutableMetadataScore(result, params);

  // === 4. Identity / Impersonation ========================================
  impersonatorScore(result, params);

  // === 5. Symbol Collisions ========================================
  symbolCollisionScore(result, params);

  // === 6. Honey Pot / Rug Pull ========================================
  honeypotScore(result, params);
  rugPullScore(result, params);

  // === 7. Liquidity ========================================
  liquidityScore(result, params);

  // === 8. Market Cap Bonuses / Penalties (scaled) ========================================
  marketCapScore(result, params);
  marketCapBonusScore(result, params);

  // === 9. Volume Bonuses / Penalties (scaled) ========================================
  dailyVolumeScore(result, params);

  // === 10. Activity ========================================
  recentActivityScore(result, params);

  // === 11. Total Holders ========================================
  totalHoldersScore(result, params);

  // === 12. Token Age ========================================
  tokenAgeScore(result, params);

  // === 13. Supply Inflation ========================================
  supplyRatioScore(result, params);

  // === 14. Networks & DEX ========================================
  networksScore(result, params);
  dexScore(result, params);

  // === 15. Social Presence ========================================
  socialPresenceScore(result, params);

  // === 16. Stable coin bonus ========================================
  stableCoinBonus(result, params);

  // === 17. Final clamp and return ========================================
  result.score = clamp(Math.round(result.score), MIN_SCORE, MAX_SCORE);
  result.risk = getRiskStatus(result.score);
  return result;
};

export const calcLightRiskScore = (params: RiskAnalysisParams): RiskAnalysisResult => {
  const result: RiskAnalysisResult = {
    score: MAX_SCORE,
    totalScore: MAX_SCORE,
    risk: RISK_STATUS.EXTREME_RISK,
    detailedAnalysis: []
  };

  // === 1. Holder Concentration ========================================
  holdersPenalty(result, params);
  whaleScore(result, params);

  // === 3. Authorities & Metadata ========================================
  mintAuthorityScore(result, params);
  freezeAuthorityScore(result, params);
  immutableMetadataScore(result, params);

  // === 4. Identity / Impersonation ========================================
  impersonatorScore(result, params);

  // === 2. Verification ========================================
  coingeckoScore(result, params);
  jupiterScore(result, params);
  socialsScore(result, params);
  metadataScore(result, params);

  // === 6. Honey Pot / Rug Pull ========================================
  honeypotScore(result, params);
  rugPullScore(result, params);

  // === 5. Symbol Collisions ========================================
  symbolCollisionScore(result, params);

  // === 15. Social Presence ========================================
  socialPresenceScore(result, params);

  // === 14. Networks & DEX ========================================
  networksScore(result, params);

  // === 13. Supply Inflation ========================================
  supplyRatioScore(result, params);

  // === 12. Token Age ========================================
  tokenAgeScore(result, params);

  // === 10. Activity ========================================
  recentActivityScore(result, params);

  // === 17. Final clamp and return ========================================
  result.score = clamp(Math.round(result.score), MIN_SCORE, MAX_SCORE);
  result.risk = getRiskStatus(result.score);
  return result;
};

export const calculateRiskScore = (params: RiskAnalysisParams) =>
  params.isStableCoin || params.verifiedOnCoingeckoTerminal ? calcRiskScoreBalanced(params) : calcLightRiskScore(params);
