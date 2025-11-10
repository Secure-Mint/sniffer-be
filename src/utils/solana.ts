import { Connection } from "@solana/web3.js";
import { envs } from "../config/envs";

export class Solana {
  public static connection: Connection;

  static init = () => {
    Solana.connection = new Connection(envs.SOLANA_RPC_URL);
    console.log("SOLANA CONNECTION INITIALIZED...");
  };
}
