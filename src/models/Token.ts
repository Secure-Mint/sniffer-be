import { CollectionOf, Description, Integer, Max, Min, Nullable, Property, Required } from "@tsed/schema";
import { Token } from "generated/prisma";

export class TokenModel {
  @Required() public readonly id: string;
  @Required() public readonly address: string;
  @Required() public readonly daily_volume: number | null;
  @Required() public readonly decimals: number;
  @Required() public readonly extensions: JSON;
  @Required() public readonly freeze_authority: string | null;
  @Required() public readonly logo_uri: string | null;
  @Required() public readonly mint_authority: string | null;
  @Required() public readonly minted_at: Date | null;
  @Required() public readonly name: string;
  @Required() public readonly permanent_delegate: string | null;
  @Required() public readonly symbol: string;
  @Required() public readonly network: string;
  @Required() @CollectionOf(String) public readonly tags: string[];
  @Required() public readonly created_at: Date;
  @Required() public readonly updated_at: Date | null;
  @Required() public readonly deleted_at: Date | null;

  public static build(token: Token): TokenModel {
    return {
      ...token,
      extensions: token.extensions as unknown as JSON
    };
  }

  public static buildArray(tokens: Token[]): TokenModel[] {
    return tokens.map((token) => TokenModel.build(token));
  }
}

export class PaginationParams {
  @Required() @Max(50) @Min(1) @Integer() public readonly limit: number;
  @Property() public readonly next_index: string;

  constructor({ limit, next_index }: { limit: number; next_index: string }) {
    this.limit = Math.min(Math.max(limit, 1), 50); // auto-correct
    this.next_index = next_index;
  }
}

export class Address {
  @Required() public readonly address: string;
}

export class TokenListParams extends PaginationParams {
  @Property(String)
  @Description("A list of one or more tags, comma separated. The list is the union of tokens with these tags.")
  public tags: string | null;

  @Property(Number)
  @Description(
    `Tokens added after this timestamp. Pass this value as milliseconds timestamp number
     or remove this property from your query if you don't want this filter`
  )
  public created_at: number | null;

  @Property(Number)
  @Description(
    `Tokens updated after this timestamp. Pass this value as milliseconds timestamp number
     or remove this property from your query if you don't want this filter`
  )
  public updated_at: number | null;
}
