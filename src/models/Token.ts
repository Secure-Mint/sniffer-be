import { CollectionOf, Required } from "@tsed/schema";
import { Token } from "generated/prisma";

export class TokenExtendedInfo {
  @Required() public readonly minted_at: Date | null;
  @Required() public readonly coingecko_id: string | null;
  @Required() public readonly coingecko_verified: boolean;
  @Required() public readonly jupiter_verified: boolean;
  @Required() public readonly token_program: string;
}

export class TokenModel {
  @Required() public readonly id: string;
  @Required() public readonly address: string;
  @Required() public readonly info: TokenExtendedInfo;
  @Required() public readonly metadata: JSON;
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
      info: token.info as unknown as TokenExtendedInfo,
      metadata: token.metadata as unknown as JSON
    };
  }

  public static buildArray(tokens: Token[]): TokenModel[] {
    return tokens.map((token) => TokenModel.build(token));
  }
}

export class Address {
  @Required() public readonly address: string;
}
