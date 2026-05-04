import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionRepository } from "./auth.types";

const REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt
      }
    });
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshToken },
      data: { revokedAt: new Date() }
    });
  }

  async findValid(refreshToken: string): Promise<{ userId: string } | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    return session ? { userId: session.userId } : null;
  }
}
