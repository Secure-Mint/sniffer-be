import { Controller, Inject } from "@tsed/di";
import { QueryParams, Context, PathParams } from "@tsed/platform-params";
import { Get, Returns } from "@tsed/schema";
import { Address, TokenListParams, TokenModel } from "../../models";
import { TokenService } from "../../services/TokenService";
import { SuccessResult, PaginationKeyset } from "../../models";

@Controller("/sniffer")
export class SnifferController {
  @Inject() private tokenService: TokenService;
}
