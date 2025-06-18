import { Injectable } from "@tsed/di";
import { prisma } from "./PrismaService";
import { TokenModel } from "../models";
import { Prisma } from "generated/prisma";
import { PlatformModel } from "src/models/Platform";

@Injectable()
export class PlatformService {
  public async create(platform: PlatformModel) {
    return prisma.platform.create({
      data: { ...platform, images: platform.images as unknown as Prisma.JsonObject }
    });
  }

  public async findById<T extends Prisma.PlatformInclude | undefined>(id: string, include?: T) {
    return prisma.platform.findUnique({
      where: { id },
      include: include as T
    });
  }
}
