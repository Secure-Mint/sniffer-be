import { DetailedAnalysis } from "src/models";
import { RISK_STATUS } from "./constants";
import { GeckoTerminalTradeData } from "types";

export * from "./constants";
export * from "./fetchRequest";
export * from "./uuid";
export * from "./encoding";
export * from "./solana";
export * from "./sniffer";
export * from "./errors";

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fixDecimals = (num: number, decimals = 2): number => {
  const [int, frac = ""] = num.toFixed(decimals + 5).split(".");
  if (decimals <= 0) return Number(int);

  let f = frac.slice(0, decimals).padEnd(decimals, "0");
  return Number(`${int}.${f}`);
};

export const getRiskStatus = (score: number): RISK_STATUS => {
  if (score <= 35) return RISK_STATUS.EXTREME_RISK;
  if (score <= 45) return RISK_STATUS.VERY_HIGH_RISK;
  if (score <= 55) return RISK_STATUS.HIGH_RISK;
  if (score <= 75) return RISK_STATUS.MODERATE_RISK;
  if (score <= 85) return RISK_STATUS.LOW_RISK;
  return RISK_STATUS.VERY_LOW_RISK;
};

export const calculateDexCount = (data: GeckoTerminalTradeData) =>
  new Set(data.included.map((pool) => pool.relationships.dex.data.id)).size;

export const calculateLiquidityUSD = (data: GeckoTerminalTradeData) =>
  data.included.reduce((sum, pool) => sum + +pool.attributes.reserve_in_usd, 0);

export const calculateLiquidityTokenAmount = (data: GeckoTerminalTradeData) => {
  const baseToken = data.data.attributes.symbol;
  let liquidityTokenAmount = 0;
  for (const pool of data.included) {
    const name = pool.attributes.name.split("/");
    const liquidityBaseToken = name[0].trim();
    const liquidityQuoteToken = name[1].trim();
    if (liquidityBaseToken === baseToken) {
      liquidityTokenAmount += +pool.attributes.base_token_balance;
    }
    if (liquidityQuoteToken === baseToken) {
      liquidityTokenAmount += +pool.attributes.quote_token_balance;
    }
  }
  return liquidityTokenAmount;
};

export const calculateTransactions24h = (data: GeckoTerminalTradeData) => {
  const buys = data.included.reduce((sum, pool) => sum + +pool.attributes.transactions.h24.buys, 0);
  const sells = data.included.reduce((sum, pool) => sum + +pool.attributes.transactions.h24.sells, 0);
  return buys + sells;
};

export const calculateBuyers24h = (data: GeckoTerminalTradeData) =>
  data.included.reduce((sum, pool) => sum + +pool.attributes.transactions.h24.buyers, 0);

export const calculateSellers24h = (data: GeckoTerminalTradeData) =>
  data.included.reduce((sum, pool) => sum + +pool.attributes.transactions.h24.sellers, 0);

export function calculateDailyVolume(data: GeckoTerminalTradeData): number {
  let dailyVolume = 0;

  for (const item of data.included) {
    if (item.type !== "pool") continue;

    const vol = item.attributes?.volume_usd?.h24;
    if (!vol) continue;

    const volNum = Number(vol);
    if (!isNaN(volNum)) {
      dailyVolume += volNum;
    }
  }

  return Number(dailyVolume.toFixed(2));
}

export const sortAnalysisByRisk = (items: DetailedAnalysis[]) => {
  const riskOrder: Record<RISK_STATUS, number> = {
    [RISK_STATUS.EXTREME_RISK]: 6,
    [RISK_STATUS.VERY_HIGH_RISK]: 5,
    [RISK_STATUS.HIGH_RISK]: 4,
    [RISK_STATUS.MODERATE_RISK]: 3,
    [RISK_STATUS.LOW_RISK]: 2,
    [RISK_STATUS.VERY_LOW_RISK]: 1,
    [RISK_STATUS.INFO]: 0
  };

  return items.sort((a, b) => riskOrder[b.risk] - riskOrder[a.risk]);
};
