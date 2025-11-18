import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, SnifferModel } from "../../models";
import { SolanaService } from "../../services/SolanaService";
import { TokenService } from "../../services/TokenService";
import { SuccessResult } from "../../models";
import { NotFound } from "@tsed/exceptions";
import { calculateRiskScore, fixDecimals, HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD, RISK_STATUS, STABLE_COIN } from "../../utils";
import { JupiterService } from "../../services/JupiterService";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
  @Inject() private solanaService: SolanaService;
  @Inject() private jupiterService: JupiterService;

  @Get("")
  @(Returns(200, SuccessResult).Of(SnifferModel))
  public async getTokenByAddress(@QueryParams() { address }: Address, @Context() ctx: Context) {
    const token = await this.tokenService.findByAddress(address);
    if (!token) throw new NotFound("Token not found");
    const tokenInfo = this.tokenService.parsedInfo(token);
    const sameSymbolTokens = await this.tokenService.findManyBySymbol(token.symbol);

    const tokenMetadata = await this.solanaService.fetchAccountInfo(token.address);

    const {
      circulatingSupply,
      totalSupply,
      totalHoldersCount,
      top10HoldersPercentage,
      top20HoldersPercentage,
      top30HoldersPercentage,
      top40HoldersPercentage,
      top50HoldersPercentage
    } = await this.solanaService.fetchTokenSupply(token.address);

    const tokenPrice = await this.jupiterService.fetchTokenPrice(token.address);

    const snifferData = {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      dailyVolume: fixDecimals(tokenInfo.daily_volume || 0, 2),
      circulatingSupply: circulatingSupply || 0,
      marketCap: fixDecimals((circulatingSupply || 1) * Number(tokenPrice), 2),
      totalSupply: totalSupply || 0,
      totalHolders: totalHoldersCount || 0,
      top10HolderSupplyPercentage: fixDecimals(top10HoldersPercentage, 2),
      top20HolderSupplyPercentage: fixDecimals(top20HoldersPercentage, 2),
      top30HolderSupplyPercentage: fixDecimals(top30HoldersPercentage, 2),
      top40HolderSupplyPercentage: fixDecimals(top40HoldersPercentage, 2),
      top50HolderSupplyPercentage: fixDecimals(top50HoldersPercentage, 2),
      tags: token.tags,
      impersonator: Boolean(sameSymbolTokens.length && !tokenInfo.coingecko_verified),
      freezeAuthority: tokenMetadata?.data?.freezeAuthority || null,
      freezeAuthorityAvailable: Boolean(tokenMetadata?.data.freezeAuthority),
      mintAuthority: tokenMetadata?.data?.mintAuthority || null,
      mintAuthorityAvailable: Boolean(tokenMetadata?.data.mintAuthority),
      immutableMetadata: Boolean(tokenMetadata?.data.immutableMetadata),
      firstOnchainActivity: token.created_at
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
      totalSupply,
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
