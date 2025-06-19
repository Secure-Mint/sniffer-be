import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isBase58Encoded, Secrets } from "../utils";

export class Solana {
  private static connection: Connection;

  static init = () => {
    Solana.connection = new Connection(Secrets.quickNodeURL);
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

  public static getTokenHolders = async (mintAddress: string) => {
    const connection = Solana.connection;
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 0,
            bytes: mintAddress
          }
        }
      ]
    });

    return accounts.map((account) => {
      const accountData = AccountLayout.decode(account.account.data);
      const owner = new PublicKey(accountData.owner).toBase58();
      const amount = Number(accountData.amount); // This is in raw integer format (not uiAmount)
      return { owner, amount };
    });
  };
}
