import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel } from "../../models";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { CoingeckoService } from "../../services/CoingeckoService";
import { SuccessResult } from "../../models";
import { NotFound } from "@tsed/exceptions";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
  @Inject() private solanaService: SolanaService;
  @Inject() private coingeckoService: CoingeckoService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound("Token not found");
    const tokenMetadata = this.tokenService.parseMetadata(token);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);

    // const tokenHolders = await this.solanaService.getTokenHolders(token.address);
    // console.log(tokenHolders);

    const tokenData = await this.coingeckoService.fetchTokenByAddress(token.address);
    console.log("coingecko token", tokenData);

    if (!tokenMetadata?.mint_info_updated_at) {
      const mintData = await this.solanaService.getMintAndFreezeAuthority(token.address);
      await this.tokenService.update({
        ...token,
        metadata: {
          ...tokenMetadata,
          mint_authority: mintData.mintAuthority,
          freeze_authority: mintData.freezeAuthority,
          mint_info_updated_at: new Date().getTime()
        }
      });
      tokenMetadata.mint_authority = mintData.mintAuthority;
      tokenMetadata.freeze_authority = mintData.freezeAuthority;
    }

    return new SuccessResult(
      {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        dailyVolume: tokenMetadata.daily_volume || 0,
        tags: token.tags,
        impersonator: sameSymbolTokens.length && !tokenMetadata.coingecko_verified,
        freezeAuthority: Boolean(tokenMetadata.freeze_authority),
        mintAuthority: Boolean(tokenMetadata.mint_authority)
      },
      SnifferModel
    );
  }
}
