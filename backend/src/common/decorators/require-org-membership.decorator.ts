import { SetMetadata } from '@nestjs/common';

export const ORG_SCOPE_KEY = 'org_scope';

export interface OrgScopeMeta {
  /** Nombre del Param que contiene el orgId. Default: "id". */
  param?: string;
  /** Si true, exige role_in_org === "admin". */
  admin?: boolean;
}

/**
 * Marca un handler para que `OrgMembershipGuard` valide la pertenencia
 * del usuario al `orgId` que viene en la URL.
 */
export const RequireOrgMembership = (meta: OrgScopeMeta = {}) =>
  SetMetadata(ORG_SCOPE_KEY, meta);
