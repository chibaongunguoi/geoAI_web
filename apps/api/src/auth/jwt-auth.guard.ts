import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtTokenService } from "./jwt-token.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: JwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.access_token || this.bearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    request.user = await this.tokens.verifyAccessToken(token);
    return true;
  }

  private bearerToken(request: { headers?: Record<string, string> }) {
    const header = request.headers?.authorization;

    if (!header?.startsWith("Bearer ")) {
      return null;
    }

    return header.slice("Bearer ".length);
  }
}
