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

    const { totalSupply, decimals } = await this.solanaService.getTokenMetadata(token.address);

    const { circulatingSupply, top50HoldersAmount, top10HoldersAmount, totalHolders } = await this.solanaService.getTokenHolders(
      token.address,
      decimals
    );

    // const tokenRestrictions = await this.solanaService.checkTokenTransferRestrictions(token.address);
    // console.log(tokenRestrictions);

    const top50HolderSupplyPercentage = fixDecimals((top50HoldersAmount / circulatingSupply) * 100, 2);
    const top10HolderSupplyPercentage = fixDecimals((top10HoldersAmount / circulatingSupply) * 100, 2);

    if (!tokenInfo?.mint_info_updated_at) {
      const mintData = await this.solanaService.getMintAndFreezeAuthority(token.address);
      await this.tokenService.update({
        ...token,
        metadata: token.metadata as unknown as JSON,
        info: {
          ...tokenInfo,
          mint_authority: mintData.mintAuthority,
          freeze_authority: mintData.freezeAuthority,
          mint_info_updated_at: new Date().getTime()
        }
      });
      tokenInfo.mint_authority = mintData.mintAuthority;
      tokenInfo.freeze_authority = mintData.freezeAuthority;
    }

    return new SuccessResult(
      {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        dailyVolume: fixDecimals(tokenInfo.daily_volume || 0, 2),
        totalSupply,
        circulatingSupply,
        totalHolders: totalHolders || 0,
        top10HolderSupplyPercentage,
        top50HolderSupplyPercentage,
        tags: token.tags,
        impersonator: sameSymbolTokens.length && !tokenInfo.coingecko_verified,
        freezeAuthority: Boolean(tokenInfo.freeze_authority),
        mintAuthority: Boolean(tokenInfo.mint_authority)
      },
      SnifferModel
    );
  }
}
