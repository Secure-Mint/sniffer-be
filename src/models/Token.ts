import { CollectionOf, Required } from "@tsed/schema";
import { Token } from "generated/prisma";

export class TokenMetadata {
  @Required() public readonly decimals: number;
  @Required() public readonly daily_volume: number | null;
  @Required() public freeze_authority: string | null;
  @Required() public mint_authority: string | null;
  @Required() public readonly minted_at: Date | null;
  @Required() public readonly permanent_delegate: string | null;
  @Required() public readonly coingecko_id: string | null;
  @Required() public readonly coingecko_verified: boolean;
  @Required() public readonly mint_info_updated_at: number | null;
}

export class TokenModel {
  @Required() public readonly id: string;
  @Required() public readonly address: string;
  @Required() public readonly metadata: TokenMetadata;
  @Required() public readonly logo_uri: string | null;
  @Required() public readonly name: string;
  @Required() public readonly symbol: string;
  @Required() public readonly platform_id: string;
  @Required() @CollectionOf(String) public readonly tags: string[];
  @Required() public readonly created_at: Date;
  @Required() public readonly updated_at: Date | null;
  @Required() public readonly deleted_at: Date | null;

  public static build(token: Token): TokenModel {
    return {
      ...token,
      metadata: token.metadata as unknown as TokenMetadata
    };
  }

  public static buildArray(tokens: Token[]): TokenModel[] {
    return tokens.map((token) => TokenModel.build(token));
  }
}

export class Address {
  @Required() public readonly address: string;
}
