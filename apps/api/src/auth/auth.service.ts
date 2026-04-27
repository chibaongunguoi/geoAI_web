import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import {
  AuthTokens,
  AuthUserRepository,
  AuthenticatedUser,
  PasswordVerifier,
  SessionRepository,
  TokenIssuer
} from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    @Inject("AuthUserRepository")
    private readonly users: AuthUserRepository,
    @Inject("PasswordVerifier")
    private readonly passwordVerifier: PasswordVerifier,
    @Inject("TokenIssuer")
    private readonly tokens: TokenIssuer,
    @Inject("SessionRepository")
    private readonly sessions: SessionRepository
  ) {}

  async register(input: {
    username: string;
    email?: string;
    name: string;
    password: string;
  }) {
    const username = input.username.trim().toLowerCase();
    const email = (input.email || `${username}@local.geoai`).trim().toLowerCase();

    if (!username || !input.name.trim() || !input.password) {
      throw new BadRequestException("Username, name, and password are required");
    }

    const existingUser = await this.users.findByIdentifier(username);
    const existingEmail = await this.users.findByEmail(email);

    if (existingUser || existingEmail) {
      throw new ConflictException("Account already exists");
    }

    const passwordHash = await this.passwordVerifier.hash(input.password);
    const user = await this.users.createRegisteredUser({
      username,
      email,
      name: input.name.trim(),
      passwordHash,
      roleCode: "USER"
    });

    return { user };
  }

  async login(identifier: string, password: string) {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    const user = await this.users.findByIdentifier(normalizedIdentifier);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await this.passwordVerifier.verify(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const publicUser = this.publicUser(user);
    const tokens = await this.issueTokens(publicUser);
    await this.sessions.create(publicUser.id, tokens.refreshToken);

    return { user: publicUser, tokens };
  }

  async refresh(refreshToken: string) {
    const session = await this.sessions.findValid(refreshToken);

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(session.userId);

    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.issueTokens(user);
    await this.sessions.create(user.id, tokens.refreshToken);
    await this.sessions.revoke(refreshToken);

    return { user, tokens };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.sessions.revoke(refreshToken);
  }

  private async issueTokens(user: AuthenticatedUser): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken(user),
      this.tokens.signRefreshToken(user)
    ]);

    return { accessToken, refreshToken };
  }

  private publicUser(user: AuthenticatedUser): AuthenticatedUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions
    };
  }
}
