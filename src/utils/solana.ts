import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isBase58Encoded, Secrets } from "../utils";

export class Solana {
  public static connection: Connection;

  static init = () => {
    Solana.connection = new Connection(Secrets.quickNodeURL);
    console.log("SOLANA INITIALIZED...");
  };
}
