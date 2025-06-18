import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel, TokenModel } from "../../models";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { NotFound } from "@tsed/exceptions";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    const token = await this.tokenService.findByAddress(address, { platform: true });
    if (!token) throw new NotFound("Address not found");
    const tokenMetadata = this.tokenService.parseMetadata(token);
    return new SuccessResult({ impersonated: tokenMetadata.impersonated || !tokenMetadata.coin_gecko_verified }, SnifferModel);
  }
}
