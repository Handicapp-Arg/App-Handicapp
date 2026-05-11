import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgScopeService } from '../services/org-scope.service';
import {
  ORG_SCOPE_KEY,
  OrgScopeMeta,
} from '../decorators/require-org-membership.decorator';

/**
 * Lee el orgId del param de la ruta (o body como fallback) y valida la pertenencia
 * del usuario. Si el handler declara `{ admin: true }`, también valida que sea admin.
 *
 * Hidrata `req.orgMember` con `{ organization_id, role_in_org }` para los services.
 */
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scope: OrgScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<OrgScopeMeta>(ORG_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException();

    const paramName = meta.param ?? 'id';
    const orgId: string | undefined =
      req.params?.[paramName] ?? req.body?.[paramName] ?? req.body?.organization_id;
    if (!orgId) {
      throw new BadRequestException(`Falta el parámetro "${paramName}" para validar tenant`);
    }

    const member = meta.admin
      ? await this.scope.assertAdmin(user.id, orgId)
      : await this.scope.assertMember(user.id, orgId);

    req.orgMember = member;
    return true;
  }
}
