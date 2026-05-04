import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUserRepository, AuthenticatedUser, UserWithSecret } from "./auth.types";

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  }
};

type PrismaUser = Awaited<
  ReturnType<PrismaAuthUserRepository["findRawByEmail"]>
>;

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRegisteredUser(input: {
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    roleCode: "USER";
  }): Promise<AuthenticatedUser> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { code: input.roleCode }
    });
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        roles: {
          create: {
            roleId: role.id
          }
        }
      },
      include: userInclude
    });

    return this.toAuthenticatedUser(user);
  }

  async findByIdentifier(identifier: string): Promise<UserWithSecret | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }]
      },
      include: userInclude
    });

    return user ? this.toUserWithSecret(user) : null;
  }

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const user = await this.findRawByEmail(email);
    return user ? this.toUserWithSecret(user) : null;
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude
    });

    return user ? this.toAuthenticatedUser(user) : null;
  }

  findRawByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: userInclude
    });
  }

  private toUserWithSecret(user: NonNullable<PrismaUser>): UserWithSecret {
    return {
      ...this.toAuthenticatedUser(user),
      passwordHash: user.passwordHash
    };
  }

  private toAuthenticatedUser(user: NonNullable<PrismaUser>): AuthenticatedUser {
    const roles = user.roles.map((assignment) => assignment.role.code);
    const permissions = user.roles.flatMap((assignment) =>
      assignment.role.permissions.map((item) => item.permission.key)
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles,
      permissions: [...new Set(permissions)]
    };
  }
}
