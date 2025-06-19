import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { isBase58Encoded } from "../utils";

export class Solana {
  private static connection: Connection;

  static init = () => {
    Solana.connection = new Connection(clusterApiUrl("mainnet-beta"));
    console.log("SOLANA INITIALIZED...");
  };

  public static fetchAccountInfo = async (mintAddress: string) => {
    try {
      if (!isBase58Encoded(mintAddress)) throw new Error("invalid address");
      const publicKey = new PublicKey(mintAddress);
      const accountInfo = await Solana.connection.getAccountInfo(publicKey);
      if (!accountInfo) {
        console.log("Account not found");
      }
      return accountInfo;
    } catch (error) {
      console.error("Error fetching account info:", error);
    }
  };

  public static getMintAndFreezeAuthority = async (mintAddress: string) => {
    const mintInfo = await getMint(Solana.connection, new PublicKey(mintAddress));

    return {
      address: mintAddress,
      mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null
    };
  };
}
