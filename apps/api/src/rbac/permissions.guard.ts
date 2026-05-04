import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionSet } from "./permission-set";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const permissions = new PermissionSet(request.user?.permissions || []);
    const allowed = required.every((permission) => permissions.allows(permission));

    if (allowed) {
      return true;
    }

    throw new ForbiddenException("Missing required permission");
  }
}
