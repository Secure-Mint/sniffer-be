import { Injectable } from "@tsed/di";
import { prisma } from "./PrismaService";
import { TokenExtendedInfo, TokenModel } from "../models";
import { Prisma, Token } from "generated/prisma";
import { UseCache } from "@tsed/platform-cache";

@Injectable()
export class TokenService {
  public async create(token: TokenModel) {
    return prisma.token.create({
      data: {
        ...token,
        info: token.info as unknown as Prisma.JsonObject,
        metadata: token.metadata as unknown as Prisma.JsonObject,
        updated_at: new Date()
      }
    });
  }

  public async update(token: TokenModel) {
    return prisma.token.update({
      where: { address: token.address },
      data: {
        ...token,
        info: token.info as unknown as Prisma.JsonObject,
        metadata: token.metadata as unknown as Prisma.JsonObject,
        updated_at: token.updated_at ? new Date(token.updated_at) : new Date()
      }
    });
  }

  @UseCache()
  public async findByAddress(address: string) {
    return prisma.token.findUnique({
      where: { address }
    });
  }

  public async findManyBySymbol(symbol: string) {
    return prisma.token.findMany({
      where: { symbol }
    });
  }

  public parsedInfo(token: Token) {
    return token.info as unknown as TokenExtendedInfo;
  }
}
