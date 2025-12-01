import { CollectionOf, Enum, Nullable, Required } from "@tsed/schema";
import { RISK_STATUS } from "../utils";

export class SnifferModel {
  @Required() public readonly symbol: string;
  @Required() public readonly imageUrl: string | null;
  @Required() public readonly name: string;
  @Required() public readonly decimals: number;
  @Required() public readonly address: string;
  @Required() public readonly volume24h: number;
  @Required() public readonly totalSupply: number;
  @Required() public readonly circulatingSupply: number;
  @Required() public readonly marketCap: number;
  @Required() public readonly totalHolders: number;
  @Required() public readonly top10HolderSupplyPercentage: number;
  @Required() public readonly top20HolderSupplyPercentage: number;
  @Required() public readonly impersonator: boolean;
  @Required() public readonly isStableCoin: boolean;
  @Nullable(String) public readonly freezeAuthority: string | null;
  @Required() public readonly freezeAuthorityAvailable: boolean;
  @Nullable(String) public readonly mintAuthority: string | null;
  @Required() public readonly mintAuthorityAvailable: boolean;
  @Required() public readonly immutableMetadata: boolean;
  @Required() public readonly totalSupplyUnlocked: boolean;
  @Required() public readonly firstOnchainActivity: Date | null;
  @Required() public readonly score: number;
  @Required() public readonly totalScore: number;
  @Required() @Enum(RISK_STATUS) public readonly risk: RISK_STATUS;
  @Required() @CollectionOf(String) public readonly tags: string[];
}
