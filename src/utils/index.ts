export * from "./constants";
export * from "./fetchRequest";
export * from "./uuid";
export * from "./encoding";
export * from "./solana";

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fixDecimals = (num: number, decimals: number): number => {
  const [int, frac = ""] = num.toFixed(decimals + 5).split(".");
  if (decimals <= 0) return Number(int);

  let f = frac.slice(0, decimals).padEnd(decimals, "0");
  return Number(`${int}.${f}`);
};
