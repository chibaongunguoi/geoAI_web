export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export type UserWithSecret = AuthenticatedUser & {
  passwordHash: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export interface AuthUserRepository {
  createRegisteredUser(input: {
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    roleCode: "USER";
  }): Promise<AuthenticatedUser>;
  findByIdentifier(identifier: string): Promise<UserWithSecret | null>;
  findByEmail(email: string): Promise<UserWithSecret | null>;
  findById(id: string): Promise<AuthenticatedUser | null>;
}

export interface PasswordVerifier {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenIssuer {
  signAccessToken(user: AuthenticatedUser): Promise<string>;
  signRefreshToken(user: AuthenticatedUser): Promise<string>;
  verifyRefreshToken(token: string): Promise<{ sub: string }>;
}

export interface SessionRepository {
  create(userId: string, refreshToken: string): Promise<void>;
  revoke(refreshToken: string): Promise<void>;
  findValid(refreshToken: string): Promise<{ userId: string } | null>;
}
