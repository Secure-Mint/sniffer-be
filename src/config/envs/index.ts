import dotenv from "dotenv-flow";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

export const config = dotenv.config();
export const isProduction = process.env.NODE_ENV === "production";
export const envs = {
  ...process.env,
  COIN_GECKO_API_KEY: process.env.COIN_GECKO_API_KEY || "",
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  REDIS_TTL: Number(process.env.REDIS_TTL) || 3600,
  NODE_ENV: process.env.NODE_ENV
};
