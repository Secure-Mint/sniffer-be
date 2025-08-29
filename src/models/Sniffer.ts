import { CollectionOf, Enum, Required } from "@tsed/schema";
import { RISK_STATUS } from "../utils";

export class SnifferModel {
  @Required() public readonly symbol: string;
  @Required() public readonly name: string;
  @Required() public readonly address: string;
  @Required() public readonly dailyVolume: string;
  @Required() public readonly totalSupply: number;
  @Required() public readonly circulatingSupply: number;
  @Required() public readonly marketCap: string;
  @Required() public readonly totalHolders: number;
  @Required() public readonly top10HolderSupplyPercentage: string;
  @Required() public readonly impersonator: boolean;
  @Required() public readonly freezeAuthority: boolean;
  @Required() public readonly mintAuthority: boolean;
  @Required() public readonly firstOnchainActivity: Date | null;
  @Required() @Enum(RISK_STATUS) public readonly evalutation: RISK_STATUS;
  @Required() @CollectionOf(String) public readonly tags: string[];
}
