import { Controller, Inject } from "@tsed/di";
import { Context, PathParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, TokenModel } from "../../models";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { NotFound } from "@tsed/exceptions";
import { Solana } from "../../utils";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;

  @Get("/:address")
  @(Returns(200, SuccessResult).Of(TokenModel))
  public async getTokenByAddress(@PathParams() { address }: Address, @Context() ctx: Context) {
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound("Address not found");
    await Solana.fetchAccountInfo(address);
    return new SuccessResult(TokenModel.build(token), TokenModel);
  }
}
