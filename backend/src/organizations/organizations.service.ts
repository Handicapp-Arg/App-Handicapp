import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Organization } from './organization.entity';
import { OrganizationMember, OrgMemberRole } from './organization-member.entity';
import { OrganizationInvitation } from './organization-invitation.entity';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private readonly inviteRepo: Repository<OrganizationInvitation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // ─── Resolver organización del usuario actual ───
  async getMyOrganizations(user: User): Promise<Organization[]> {
    const memberships = await this.memberRepo.find({
      where: { user_id: user.id },
      relations: ['organization'],
    });
    return memberships.map((m) => m.organization).filter(Boolean);
  }

  async getOrgById(id: string, user: User): Promise<Organization & { members: OrganizationMember[]; horse_count: number }> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    await this.assertMembership(id, user.id);

    const members = await this.memberRepo.find({
      where: { organization_id: id },
      relations: ['user'],
      order: { joined_at: 'ASC' },
    });

    const horse_count = await this.horseRepo.count({ where: { organization_id: id } });

    return { ...org, members, horse_count };
  }

  // ─── Miembros ───
  async assertMembership(orgId: string, userId: string): Promise<OrganizationMember> {
    const member = await this.memberRepo.findOne({
      where: { organization_id: orgId, user_id: userId },
    });
    if (!member) throw new ForbiddenException('No sos miembro de esta organización');
    return member;
  }

  async assertAdmin(orgId: string, userId: string): Promise<void> {
    const member = await this.assertMembership(orgId, userId);
    if (member.role_in_org !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden hacer esta acción');
    }
  }

  async removeMember(orgId: string, memberId: string, user: User): Promise<void> {
    await this.assertAdmin(orgId, user.id);
    const target = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!target) throw new NotFoundException('Miembro no encontrado');
    if (target.organization_id !== orgId) throw new BadRequestException('Miembro no pertenece a esta organización');

    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (org && target.user_id === org.owner_id) {
      throw new ForbiddenException('No se puede expulsar al dueño de la organización');
    }

    await this.memberRepo.remove(target);
  }

  async changeMemberRole(
    orgId: string, memberId: string, newRole: OrgMemberRole, user: User,
  ): Promise<OrganizationMember> {
    await this.assertAdmin(orgId, user.id);
    const target = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!target) throw new NotFoundException('Miembro no encontrado');
    target.role_in_org = newRole;
    return this.memberRepo.save(target);
  }

  // ─── Invitaciones ───
  async createInvitation(
    orgId: string,
    dto: { email: string; role_in_org: OrgMemberRole },
    user: User,
  ): Promise<OrganizationInvitation> {
    await this.assertAdmin(orgId, user.id);
    const email = dto.email.toLowerCase().trim();

    // Si ya existe un user con ese email y ya es miembro, error
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      const isMember = await this.memberRepo.findOne({
        where: { organization_id: orgId, user_id: existingUser.id },
      });
      if (isMember) throw new BadRequestException('Este usuario ya es miembro de la organización');
    }

    // Si ya existe invitación pendiente, devolverla en lugar de crear duplicada
    const existing = await this.inviteRepo.findOne({
      where: { organization_id: orgId, email, status: 'pending' },
    });
    if (existing) return existing;

    const token = randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    return this.inviteRepo.save(
      this.inviteRepo.create({
        organization_id: orgId,
        email,
        role_in_org: dto.role_in_org,
        token,
        status: 'pending',
        expires_at: expires,
        invited_by: user.id,
      }),
    );
  }

  async getInvitationByToken(token: string): Promise<{
    invitation: OrganizationInvitation;
    organization: Organization;
    inviter: { name: string };
  }> {
    const inv = await this.inviteRepo.findOne({
      where: { token },
      relations: ['organization', 'inviter'],
    });
    if (!inv) throw new NotFoundException('Invitación no encontrada');
    if (inv.status !== 'pending') throw new BadRequestException(`La invitación ya fue ${inv.status === 'accepted' ? 'aceptada' : 'cancelada'}`);
    if (inv.expires_at < new Date()) {
      await this.inviteRepo.update(inv.id, { status: 'expired' });
      throw new BadRequestException('La invitación expiró');
    }
    return {
      invitation: inv,
      organization: inv.organization,
      inviter: { name: inv.inviter?.name ?? 'Alguien' },
    };
  }

  async acceptInvitation(token: string, user: User): Promise<OrganizationMember> {
    const { invitation } = await this.getInvitationByToken(token);

    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException('Esta invitación es para otra cuenta');
    }

    // Si ya es miembro (race condition), devolver el existente
    const existing = await this.memberRepo.findOne({
      where: { organization_id: invitation.organization_id, user_id: user.id },
    });
    if (existing) {
      await this.inviteRepo.update(invitation.id, { status: 'accepted', accepted_at: new Date() });
      return existing;
    }

    const member = await this.memberRepo.save(
      this.memberRepo.create({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role_in_org: invitation.role_in_org,
      }),
    );

    await this.inviteRepo.update(invitation.id, { status: 'accepted', accepted_at: new Date() });

    // Notificar al admin que invitó
    if (invitation.invited_by) {
      const notif = await this.notificationsService.create({
        type: NotificationType.EVENT_CREATED,
        title: '✅ Invitación aceptada',
        message: `${user.name} se unió a tu organización.`,
        recipient_id: invitation.invited_by,
      });
      await this.gateway.sendToUser(invitation.invited_by, notif);
    }

    return member;
  }

  async cancelInvitation(orgId: string, invitationId: string, user: User): Promise<void> {
    await this.assertAdmin(orgId, user.id);
    const inv = await this.inviteRepo.findOne({ where: { id: invitationId } });
    if (!inv) throw new NotFoundException('Invitación no encontrada');
    if (inv.organization_id !== orgId) throw new BadRequestException('Invitación no pertenece a esta organización');
    await this.inviteRepo.update(invitationId, { status: 'rejected' });
  }

  async listInvitations(orgId: string, user: User): Promise<OrganizationInvitation[]> {
    await this.assertMembership(orgId, user.id);
    return this.inviteRepo.find({
      where: { organization_id: orgId, status: 'pending' },
      order: { created_at: 'DESC' },
    });
  }
}
