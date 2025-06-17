import bs58 from "bs58";

export const isBase58Encoded = (str: string) => {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(str)) return false;

  try {
    bs58.decode(str);
    return true;
  } catch {
    return false;
  }
};
