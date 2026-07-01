import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/organization.entity';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { SenasaModule } from '../senasa/senasa.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationMember, User, Horse]), SenasaModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
