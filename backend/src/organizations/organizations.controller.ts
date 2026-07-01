import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RequireOrgMembership } from '../common/decorators/require-org-membership.decorator';
import { OrgMembershipGuard } from '../common/guards/org-membership.guard';
import { User } from '../auth/user.entity';
import type { OrgMemberRole } from './organization-member.entity';

class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsIn(['admin', 'staff', 'owner_role', 'vet', 'encargado', 'jinete', 'peon'])
  role_in_org: OrgMemberRole;
}

class ChangeRoleDto {
  @IsIn(['admin', 'staff', 'owner_role', 'vet', 'encargado', 'jinete', 'peon'])
  role_in_org: OrgMemberRole;
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMembershipGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get('mine')
  getMine(@GetUser() user: User) {
    return this.service.getMyOrganizations(user);
  }

  @Get(':id')
  @RequireOrgMembership()
  getById(@Param('id') id: string, @GetUser() user: User) {
    return this.service.getOrgById(id, user);
  }

  // ─── Miembros ───

  @Delete(':id/members/:memberId')
  @RequireOrgMembership({ admin: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @GetUser() user: User) {
    return this.service.removeMember(id, memberId, user);
  }

  @Patch(':id/members/:memberId/role')
  @RequireOrgMembership({ admin: true })
  changeRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(ValidationPipe) dto: ChangeRoleDto,
    @GetUser() user: User,
  ) {
    return this.service.changeMemberRole(id, memberId, dto.role_in_org, user);
  }

  // ─── Invitaciones ───

  @Post(':id/invitations')
  @RequireOrgMembership({ admin: true })
  createInvitation(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: CreateInvitationDto,
    @GetUser() user: User,
  ) {
    return this.service.createInvitation(id, dto, user);
  }

  @Get(':id/invitations')
  @RequireOrgMembership()
  listInvitations(@Param('id') id: string, @GetUser() user: User) {
    return this.service.listInvitations(id, user);
  }

  @Delete(':id/invitations/:invitationId')
  @RequireOrgMembership({ admin: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @GetUser() user: User,
  ) {
    return this.service.cancelInvitation(id, invitationId, user);
  }
}

// Endpoint público (sin guard) para ver invitación por token (solo usuarios autenticados pueden aceptar)
@ApiTags('organizations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get(':token')
  @UseGuards(AuthGuard('jwt'))
  async getByToken(@Param('token') token: string) {
    const { invitation, organization, inviter } = await this.service.getInvitationByToken(token);
    return {
      organization: { id: organization.id, name: organization.name },
      inviter,
      role_in_org: invitation.role_in_org,
      email: invitation.email,
      expires_at: invitation.expires_at,
    };
  }

  @Post(':token/accept')
  @UseGuards(AuthGuard('jwt'))
  async accept(@Param('token') token: string, @GetUser() user: User) {
    return this.service.acceptInvitation(token, user);
  }
}
