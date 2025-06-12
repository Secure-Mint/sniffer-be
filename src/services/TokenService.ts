import { Injectable } from "@tsed/di";
import { prisma } from "./PrismaService";
import { TokenListParams, TokenModel } from "../models";
import { Prisma, Token } from "generated/prisma";
import { isValidUUID } from "../utils";

@Injectable()
export class TokenService {
  public async create(token: TokenModel) {
    return prisma.token.create({
      data: { ...token, extensions: token.extensions as unknown as Prisma.JsonObject, updated_at: new Date() }
    });
  }

  public async update(token: TokenModel) {
    return prisma.token.update({
      where: { address: token.address },
      data: {
        ...token,
        extensions: token.extensions as unknown as Prisma.JsonObject,
        updated_at: token.updated_at ? new Date(token.updated_at) : new Date()
      }
    });
  }

  public async findByAddress(address: string) {
    return prisma.token.findUnique({
      where: { address }
    });
  }
}
