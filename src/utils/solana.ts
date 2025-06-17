import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { isBase58Encoded } from "../utils";

export class Solana {
  private static connection: Connection;

  static init = () => {
    this.connection = new Connection(clusterApiUrl("mainnet-beta"));
    console.log("SOLANA INITIALIZED...");
  };

  static fetchAccountInfo = async (address: string) => {
    try {
      if (!isBase58Encoded(address)) throw new Error("invalid address");
      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      if (!accountInfo) {
        console.log("Account not found");
      }
      console.log(accountInfo?.owner.toBase58());
      console.log(accountInfo?.data.toJSON());
      console.log(accountInfo?.lamports);
      console.log(accountInfo?.executable);
    } catch (error) {
      console.error("Error fetching account info:", error);
    }
  };
}
