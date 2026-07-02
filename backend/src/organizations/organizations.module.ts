import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationInvitation } from './organization-invitation.entity';
import { OrganizationJoinRequest } from './organization-join-request.entity';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationMigrationService } from './organization-migration.service';
import { OrganizationsController, InvitationsController } from './organizations.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, OrganizationInvitation, OrganizationJoinRequest, User, Horse]),
    NotificationsModule,
    CommonModule,
    EmailModule,
  ],
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService, OrganizationMigrationService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
