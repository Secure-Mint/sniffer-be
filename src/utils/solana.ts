import { Connection } from "@solana/web3.js";
import { envs } from "../config/envs";

export class Solana {
  public static connection: Connection;

  static init = () => {
    Solana.connection = new Connection(envs.QUICK_NODE_RPC_URL);
    console.log("SOLANA INITIALIZED...");
  };
}
