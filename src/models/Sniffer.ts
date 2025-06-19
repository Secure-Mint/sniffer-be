import { CollectionOf, Required } from "@tsed/schema";

export class SnifferModel {
  @Required() public readonly symbol: string;
  @Required() public readonly name: string;
  @Required() public readonly address: string;
  @Required() public readonly dailyVolume: number;
  @Required() public readonly impersonator: boolean;
  @Required() public readonly freezeAuthority: boolean;
  @Required() public readonly mintAuthority: boolean;
  @Required() @CollectionOf(String) public readonly tags: string[];
}
