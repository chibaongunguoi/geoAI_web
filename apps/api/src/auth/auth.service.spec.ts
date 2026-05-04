import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

const user = {
  id: "user-1",
  username: "admin123",
  email: "admin@geoai.local",
  name: "GeoAI Admin",
  passwordHash: "hash",
  roles: ["ADMIN"],
  permissions: ["map.view", "admin.users.manage"]
};

describe("AuthService", () => {
  it("when credentials are valid, returns a user session payload", async () => {
    const service = new AuthService(
      {
        createRegisteredUser: jest.fn(),
        findByIdentifier: jest.fn().mockResolvedValue(user),
        findByEmail: jest.fn().mockResolvedValue(user),
        findById: jest.fn()
      },
      {
        hash: jest.fn(),
        verify: jest.fn().mockResolvedValue(true)
      },
      {
        signAccessToken: jest.fn().mockResolvedValue("access"),
        signRefreshToken: jest.fn().mockResolvedValue("refresh"),
        verifyRefreshToken: jest.fn()
      },
      {
        create: jest.fn().mockResolvedValue(undefined),
        revoke: jest.fn().mockResolvedValue(undefined),
        findValid: jest.fn()
      }
    );

    const result = await service.login("admin123", "Password123!");

    expect(result.user.username).toBe("admin123");
    expect(result.user.email).toBe("admin@geoai.local");
    expect(result.tokens.accessToken).toBe("access");
    expect(result.user.permissions).toContain("admin.users.manage");
  });

  it("when credentials are invalid, throws UnauthorizedException", async () => {
    const service = new AuthService(
      {
        createRegisteredUser: jest.fn(),
        findByIdentifier: jest.fn().mockResolvedValue(user),
        findByEmail: jest.fn().mockResolvedValue(user),
        findById: jest.fn()
      },
      {
        hash: jest.fn(),
        verify: jest.fn().mockResolvedValue(false)
      },
      {
        signAccessToken: jest.fn(),
        signRefreshToken: jest.fn(),
        verifyRefreshToken: jest.fn()
      },
      {
        create: jest.fn(),
        revoke: jest.fn(),
        findValid: jest.fn()
      }
    );

    await expect(
      service.login("admin@geoai.local", "bad-password")
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("when registration is valid, creates a user with the USER role", async () => {
    const createRegisteredUser = jest.fn().mockResolvedValue({
      id: "user-2",
      username: "field-user",
      email: "field@example.com",
      name: "Field User",
      roles: ["USER"],
      permissions: ["map.view"]
    });
    const service = new AuthService(
      {
        createRegisteredUser,
        findByIdentifier: jest.fn(),
        findByEmail: jest.fn().mockResolvedValue(null),
        findById: jest.fn()
      },
      {
        hash: jest.fn().mockResolvedValue("hashed-password"),
        verify: jest.fn()
      },
      {
        signAccessToken: jest.fn().mockResolvedValue("access"),
        signRefreshToken: jest.fn().mockResolvedValue("refresh"),
        verifyRefreshToken: jest.fn()
      },
      {
        create: jest.fn().mockResolvedValue(undefined),
        revoke: jest.fn(),
        findValid: jest.fn()
      }
    );

    const result = await service.register({
      username: "field-user",
      email: "field@example.com",
      name: "Field User",
      password: "user123"
    });

    expect(createRegisteredUser).toHaveBeenCalledWith({
      username: "field-user",
      email: "field@example.com",
      name: "Field User",
      passwordHash: "hashed-password",
      roleCode: "USER"
    });
    expect(result.user.roles).toEqual(["USER"]);
  });

  it("when registration conflicts with an existing account, throws ConflictException", async () => {
    const service = new AuthService(
      {
        createRegisteredUser: jest.fn(),
        findByIdentifier: jest.fn().mockResolvedValue(user),
        findByEmail: jest.fn(),
        findById: jest.fn()
      },
      {
        hash: jest.fn(),
        verify: jest.fn()
      },
      {
        signAccessToken: jest.fn(),
        signRefreshToken: jest.fn(),
        verifyRefreshToken: jest.fn()
      },
      {
        create: jest.fn(),
        revoke: jest.fn(),
        findValid: jest.fn()
      }
    );

    await expect(
      service.register({
        username: "admin123",
        email: "admin@geoai.local",
        name: "Duplicate",
        password: "user123"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
