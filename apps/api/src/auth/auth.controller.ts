import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

type LoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
};

type RegisterBody = {
  username?: string;
  email?: string;
  name?: string;
  password?: string;
};

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(
      body.identifier || body.email || "",
      body.password || ""
    );
    this.setAuthCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post("register")
  async register(@Body() body: RegisterBody) {
    const result = await this.auth.register({
      username: body.username || "",
      email: body.email,
      name: body.name || "",
      password: body.password || ""
    });
    return { user: result.user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(req.cookies?.refresh_token || "");
    this.setAuthCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refresh_token);
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return { user: (req as Request & { user: unknown }).user };
  }

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie("access_token", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refresh_token", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
}
