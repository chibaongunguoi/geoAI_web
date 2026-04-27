import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser, TokenIssuer } from "./auth.types";

@Injectable()
export class JwtTokenService implements TokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  signAccessToken(user: AuthenticatedUser): Promise<string> {
    return this.jwt.signAsync(this.payloadFor(user), {
      secret: this.accessSecret,
      expiresIn: "15m"
    });
  }

  signRefreshToken(user: AuthenticatedUser): Promise<string> {
    return this.jwt.signAsync({ sub: user.id }, {
      secret: this.refreshSecret,
      expiresIn: "30d"
    });
  }

  verifyAccessToken(token: string) {
    return this.jwt.verifyAsync(token, { secret: this.accessSecret });
  }

  verifyRefreshToken(token: string): Promise<{ sub: string }> {
    return this.jwt.verifyAsync(token, { secret: this.refreshSecret });
  }

  private payloadFor(user: AuthenticatedUser) {
    return {
      id: user.id,
      sub: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions
    };
  }

  private get accessSecret(): string {
    return this.config.get<string>("JWT_ACCESS_SECRET") || "dev-access-secret";
  }

  private get refreshSecret(): string {
    return this.config.get<string>("JWT_REFRESH_SECRET") || "dev-refresh-secret";
  }
}
