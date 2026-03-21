import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';
import {
  PERMISSION_KEY,
  PermissionMeta,
} from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<PermissionMeta>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException();

    const allowed = this.permissionsService.hasPermission(
      user.role,
      meta.resource,
      meta.action,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `No tenés permiso para ${meta.action} en ${meta.resource}`,
      );
    }

    return true;
  }
}
