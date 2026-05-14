import { JwtTokenService } from "./jwt-token.service";

describe("JwtTokenService", () => {
  it("adds a unique JWT id to refresh tokens so rapid logins do not reuse the same token", async () => {
    const signAsync = jest.fn().mockResolvedValue("token");
    const service = new JwtTokenService(
      { signAsync, verifyAsync: jest.fn() } as any,
      { get: jest.fn() } as any
    );

    await service.signRefreshToken({
      id: "user-1",
      username: "admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
      permissions: []
    });
    await service.signRefreshToken({
      id: "user-1",
      username: "admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
      permissions: []
    });

    expect(signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: "user-1", jti: expect.any(String) }),
      expect.objectContaining({ expiresIn: "30d" })
    );
    expect(signAsync.mock.calls[0][0].jti).not.toBe(signAsync.mock.calls[1][0].jti);
  });
});
