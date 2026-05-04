import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtTokenService } from "./jwt-token.service";
import { PasswordHasher } from "./password-hasher";
import { PrismaAuthUserRepository } from "./prisma-auth-user.repository";
import { PrismaSessionRepository } from "./prisma-session.repository";

@Module({
  imports: [ConfigModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    JwtTokenService,
    PasswordHasher,
    PrismaAuthUserRepository,
    PrismaSessionRepository,
    {
      provide: "AuthUserRepository",
      useExisting: PrismaAuthUserRepository
    },
    {
      provide: "PasswordVerifier",
      useExisting: PasswordHasher
    },
    {
      provide: "TokenIssuer",
      useExisting: JwtTokenService
    },
    {
      provide: "SessionRepository",
      useExisting: PrismaSessionRepository
    }
  ],
  exports: [JwtAuthGuard, JwtTokenService, PasswordHasher]
})
export class AuthModule {}
