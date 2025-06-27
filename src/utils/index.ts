export * from "./constants";
export * from "./fetchRequest";
export * from "./uuid";
export * from "./encoding";
export * from "./solana";

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fixDecimals = (num: number, decimals: number) => {
  const v = num.toString().split(".");
  if (decimals <= 0) return parseFloat(v[0]);
  let f = v[1] || "";
  if (f.length > decimals) return parseFloat(`${v[0]}.${f.substr(0, decimals)}`);
  while (f.length < decimals) f += "0";
  return parseFloat(`${v[0]}.${f}`);
};
