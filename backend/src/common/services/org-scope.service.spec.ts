import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { OrgScopeService } from './org-scope.service';
import type { OrganizationMember } from '../../organizations/organization-member.entity';

type MemberRepo = Pick<Repository<OrganizationMember>, 'find' | 'findOne'>;

const buildRepo = (overrides: Partial<MemberRepo> = {}): MemberRepo => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe('OrgScopeService', () => {
  describe('getMemberships', () => {
    it('mapea los rows del repo a MembershipInfo', async () => {
      const repo = buildRepo({
        find: jest.fn().mockResolvedValue([
          { organization_id: 'a', role_in_org: 'admin' },
          { organization_id: 'b', role_in_org: 'staff' },
        ]),
      });
      const svc = new OrgScopeService(repo as Repository<OrganizationMember>);

      const out = await svc.getMemberships('u1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { user_id: 'u1' },
        select: ['organization_id', 'role_in_org'],
      });
      expect(out).toEqual([
        { organization_id: 'a', role_in_org: 'admin' },
        { organization_id: 'b', role_in_org: 'staff' },
      ]);
    });
  });

  describe('assertMember', () => {
    it('devuelve la membership si existe', async () => {
      const repo = buildRepo({
        findOne: jest.fn().mockResolvedValue({ organization_id: 'org-1', role_in_org: 'staff' }),
      });
      const svc = new OrgScopeService(repo as Repository<OrganizationMember>);

      await expect(svc.assertMember('u1', 'org-1')).resolves.toEqual({
        organization_id: 'org-1',
        role_in_org: 'staff',
      });
    });

    it('arroja Forbidden si el usuario no es miembro', async () => {
      const repo = buildRepo({ findOne: jest.fn().mockResolvedValue(null) });
      const svc = new OrgScopeService(repo as Repository<OrganizationMember>);

      await expect(svc.assertMember('u1', 'org-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertAdmin', () => {
    it('admite admin', async () => {
      const repo = buildRepo({
        findOne: jest.fn().mockResolvedValue({ organization_id: 'org-1', role_in_org: 'admin' }),
      });
      const svc = new OrgScopeService(repo as Repository<OrganizationMember>);
      await expect(svc.assertAdmin('u1', 'org-1')).resolves.toEqual({
        organization_id: 'org-1',
        role_in_org: 'admin',
      });
    });

    it('arroja Forbidden si el miembro existe pero no es admin', async () => {
      const repo = buildRepo({
        findOne: jest.fn().mockResolvedValue({ organization_id: 'org-1', role_in_org: 'staff' }),
      });
      const svc = new OrgScopeService(repo as Repository<OrganizationMember>);

      await expect(svc.assertAdmin('u1', 'org-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
