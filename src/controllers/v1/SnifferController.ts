import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel } from "../../models";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { calculateRiskScore, fixDecimals, RISK_STATUS, STABLE_COIN } from "../../utils";
import { ERROR_MESSAGE } from "../../utils";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
  @Inject() private solanaService: SolanaService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    if (!this.solanaService.isValidAddress(address)) throw new BadRequest(ERROR_MESSAGE.INVALID_ADDRESS);
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound(ERROR_MESSAGE.TOKEN_NOT_FOUND);
    const tokenInfo = this.tokenService.parsedInfo(token);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);
    const impersonator = Boolean(sameSymbolTokens.length > 1 && !tokenInfo.coingecko_verified);

    const isStableCoin = token.tags.includes(STABLE_COIN);

    const analysisParams = await this.solanaService.fetchTokenAnalysisParams(token);
    const score = calculateRiskScore(analysisParams);

    console.log(analysisParams);
    console.log(score);

    const snifferData: SnifferModel = {
      symbol: token.symbol,
      imageUrl: analysisParams.imageUrl,
      name: token.name,
      decimals: analysisParams.decimals || 0,
      address: token.address,
      volume24h: fixDecimals(analysisParams.dailyVolume || 0, 2),
      circulatingSupply: analysisParams.circulatingSupply || 0,
      marketCap: analysisParams.marketCap,
      totalSupply: analysisParams?.totalSupply || 0,
      totalHolders: analysisParams?.totalHolders || 0,
      top10HolderSupplyPercentage: fixDecimals(analysisParams?.top10HolderSupplyPercentage || 0, 2),
      top20HolderSupplyPercentage: fixDecimals(analysisParams?.top20HolderSupplyPercentage || 0, 2),
      tags: token.tags,
      impersonator,
      isStableCoin,
      freezeAuthority: analysisParams?.freezeAuthority || null,
      freezeAuthorityAvailable: Boolean(analysisParams?.freezeAuthority),
      mintAuthority: analysisParams.mintAuthority || null,
      mintAuthorityAvailable: Boolean(analysisParams?.mintAuthority),
      immutableMetadata: Boolean(analysisParams.immutableMetadata),
      firstOnchainActivity: tokenInfo.minted_at || token.created_at,
      totalSupplyUnlocked: analysisParams.totalSupply === analysisParams.circulatingSupply,
      totalScore: 0,
      score: 0,
      risk: RISK_STATUS.EXTREME_RISK
    };

    // const { score, totalScore, risk } = calculateRiskScore(snifferData);

    return new SuccessResult(
      {
        ...snifferData,
        score: score.score,
        totalScore: score.totalScore,
        risk: score.risk
      },
      SnifferModel
    );
  }
}
