import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMember,
  OrgMemberRole,
} from '../../organizations/organization-member.entity';

export interface MembershipInfo {
  organization_id: string;
  role_in_org: OrgMemberRole;
}

/**
 * Resolución centralizada de pertenencia a organizaciones.
 * Provee aserciones reutilizables para guards y services que filtran por tenant.
 */
@Injectable()
export class OrgScopeService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
  ) {}

  async getMemberships(userId: string): Promise<MembershipInfo[]> {
    const rows = await this.memberRepo.find({
      where: { user_id: userId },
      select: ['organization_id', 'role_in_org'],
    });
    return rows.map((r) => ({
      organization_id: r.organization_id,
      role_in_org: r.role_in_org,
    }));
  }

  async getOrgIds(userId: string): Promise<string[]> {
    const ms = await this.getMemberships(userId);
    return ms.map((m) => m.organization_id);
  }

  async assertMember(userId: string, orgId: string): Promise<MembershipInfo> {
    const member = await this.memberRepo.findOne({
      where: { organization_id: orgId, user_id: userId },
      select: ['organization_id', 'role_in_org'],
    });
    if (!member) {
      throw new ForbiddenException('No sos miembro de esta organización');
    }
    return { organization_id: member.organization_id, role_in_org: member.role_in_org };
  }

  async assertAdmin(userId: string, orgId: string): Promise<MembershipInfo> {
    const m = await this.assertMember(userId, orgId);
    if (m.role_in_org !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden hacer esta acción');
    }
    return m;
  }
}
