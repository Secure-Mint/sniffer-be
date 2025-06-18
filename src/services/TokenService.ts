import { Injectable } from "@tsed/di";
import { prisma } from "./PrismaService";
import { TokenMetadata, TokenModel } from "../models";
import { Prisma, Token } from "generated/prisma";
import { isValidUUID } from "../utils";

@Injectable()
export class TokenService {
  public async create(token: TokenModel) {
    return prisma.token.create({
      data: { ...token, metadata: token.metadata as unknown as Prisma.JsonObject, updated_at: new Date() }
    });
  }

  public async update(token: TokenModel) {
    return prisma.token.update({
      where: { address: token.address },
      data: {
        ...token,
        metadata: token.metadata as unknown as Prisma.JsonObject,
        updated_at: token.updated_at ? new Date(token.updated_at) : new Date()
      }
    });
  }

  public async findByAddress<T extends Prisma.TokenInclude | undefined>(address: string, include?: T) {
    return prisma.token.findUnique({
      where: { address },
      include: include as T
    });
  }

  public async findManyBySymbol<T extends Prisma.TokenInclude | undefined>(symbol: string, include?: T) {
    return prisma.token.findMany({
      where: { symbol },
      include: include as T
    });
  }

  public parseMetadata(token: Token) {
    return token.metadata as unknown as TokenMetadata;
  }
}
