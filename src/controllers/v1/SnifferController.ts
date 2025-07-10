import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel } from "../../models";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { NotFound } from "@tsed/exceptions";
import { fixDecimals } from "../../utils";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
  @Inject() private solanaService: SolanaService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound("Token not found");
    const tokenInfo = this.tokenService.parsedInfo(token);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);

    const tokenMetadata = await this.solanaService.fetchAccountInfo(token.address);

    const { top10HoldersPercentage, totalHoldersCount, circulatingSupply, totalSupply } = await this.solanaService.fetchTokenSupply(
      token.address,
      tokenMetadata?.data.decimals || 0
    );

    // const tokenRestrictions = await this.solanaService.checkTokenTransferRestrictions(token.address);
    // console.log(tokenRestrictions);

    return new SuccessResult(
      {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        dailyVolume: fixDecimals(tokenInfo.daily_volume || 0, 2),
        circulatingSupply: circulatingSupply || 0,
        totalSupply: totalSupply || 0,
        totalHolders: totalHoldersCount || 0,
        top10HolderSupplyPercentage: fixDecimals(top10HoldersPercentage, 2),
        tags: token.tags,
        impersonator: Boolean(sameSymbolTokens.length && !tokenInfo.coingecko_verified),
        freezeAuthority: Boolean(tokenMetadata?.data.freezeAuthority),
        mintAuthority: Boolean(tokenMetadata?.data.mintAuthority)
      },
      SnifferModel
    );
  }
}
