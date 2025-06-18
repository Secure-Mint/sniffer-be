import { Required } from "@tsed/schema";
import { Platform } from "generated/prisma";

export class PlatformModel {
  @Required() public readonly id: string;
  @Required() public readonly chain_identifier: number | null;
  @Required() public readonly name: string;
  @Required() public readonly shortname: string | null;
  @Required() public readonly native_coin_id: string;
  @Required() public readonly images: JSON;
  @Required() public readonly created_at: Date;
  @Required() public readonly updated_at: Date | null;
  @Required() public readonly deleted_at: Date | null;

  public static build(platform: Platform): PlatformModel {
    return {
      ...platform,
      images: platform.images as unknown as JSON
    };
  }

  public static buildArray(tokens: Platform[]): PlatformModel[] {
    return tokens.map((token) => PlatformModel.build(token));
  }
}
