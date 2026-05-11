import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { OrgScopeService } from './services/org-scope.service';
import { OrgMembershipGuard } from './guards/org-membership.guard';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [OrgScopeService, OrgMembershipGuard],
  exports: [OrgScopeService, OrgMembershipGuard],
})
export class CommonModule {}
