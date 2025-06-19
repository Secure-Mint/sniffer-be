export class Secrets {
  public static quickNodeURL: string;
  public static coingeckoApiKey: string;

  public static init = () => {
    Secrets.coingeckoApiKey = process.env.COIN_GECKO_API_KEY || "";
    Secrets.quickNodeURL = process.env.QUICK_NODE_RPC_URL || "";
  };
}
