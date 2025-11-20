import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel } from "../../models";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { calculateRiskScore, fixDecimals, STABLE_COIN } from "../../utils";
import { JupiterService } from "../../services/JupiterService";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
  @Inject() private solanaService: SolanaService;
  @Inject() private jupiterService: JupiterService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    if (!this.solanaService.isValidAddress(address)) throw new BadRequest("Invalid address");
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound("Token not found");
    const tokenInfo = this.tokenService.parsedInfo(token);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);

    const tokenAccount = await this.solanaService.fetchAccountInfo(token.address);

    const tokenSupply = await this.solanaService.fetchTokenSupply(token.address);

    const tokenPrice = await this.jupiterService.fetchTokenPrice(token.address);

    const snifferData = {
      symbol: token.symbol,
      imageUrl: token.logo_uri,
      name: token.name,
      decimals: tokenAccount?.data.decimals || 0,
      address: token.address,
      dailyVolume: fixDecimals(tokenInfo.daily_volume || 0, 2),
      circulatingSupply: tokenSupply?.circulatingSupply || 0,
      marketCap: fixDecimals((tokenSupply?.circulatingSupply || 1) * Number(tokenPrice), 2),
      totalSupply: tokenSupply?.totalSupply || 0,
      totalHolders: tokenSupply?.totalHoldersCount || 0,
      top10HolderSupplyPercentage: fixDecimals(tokenSupply?.top10HoldersPercentage || 0, 2),
      top20HolderSupplyPercentage: fixDecimals(tokenSupply?.top20HoldersPercentage || 0, 2),
      top30HolderSupplyPercentage: fixDecimals(tokenSupply?.top30HoldersPercentage || 0, 2),
      top40HolderSupplyPercentage: fixDecimals(tokenSupply?.top40HoldersPercentage || 0, 2),
      top50HolderSupplyPercentage: fixDecimals(tokenSupply?.top50HoldersPercentage || 0, 2),
      tags: token.tags,
      impersonator: Boolean(sameSymbolTokens.length && !tokenInfo.coingecko_verified),
      freezeAuthority: tokenAccount?.data?.freezeAuthority || null,
      freezeAuthorityAvailable: Boolean(tokenAccount?.data.freezeAuthority),
      mintAuthority: tokenAccount?.data?.mintAuthority || null,
      mintAuthorityAvailable: Boolean(tokenAccount?.data.mintAuthority),
      immutableMetadata: Boolean(tokenAccount?.data.immutableMetadata),
      firstOnchainActivity: tokenInfo.minted_at || token.created_at
    };

    const { score, totalScore, risk } = calculateRiskScore({
      dailyVolume: snifferData.dailyVolume,
      marketCap: snifferData.marketCap,
      totalHolders: snifferData.totalHolders,
      top10HolderSupplyPercentage: snifferData.top10HolderSupplyPercentage,
      top20HolderSupplyPercentage: snifferData.top20HolderSupplyPercentage,
      top30HolderSupplyPercentage: snifferData.top30HolderSupplyPercentage,
      top40HolderSupplyPercentage: snifferData.top40HolderSupplyPercentage,
      top50HolderSupplyPercentage: snifferData.top50HolderSupplyPercentage,
      totalSupply: tokenSupply?.totalSupply || 0,
      frozenSupply: 0,
      circulatingSupply: snifferData.circulatingSupply,
      freezeAuthorityAvailable: snifferData.freezeAuthorityAvailable,
      mintAuthorityAvailable: snifferData.mintAuthorityAvailable,
      immutableMetadata: snifferData.immutableMetadata,
      firstOnchainActivity: new Date(snifferData.firstOnchainActivity).getTime(),
      impersonator: snifferData.impersonator,
      isStableCoin: token.tags.includes(STABLE_COIN)
    });

    return new SuccessResult(
      {
        ...snifferData,
        score,
        totalScore,
        risk
      },
      SnifferModel
    );
  }
}
