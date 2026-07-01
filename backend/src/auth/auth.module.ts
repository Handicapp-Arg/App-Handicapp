import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevSeedService } from './dev-seed.service';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { OrganizationInvitation } from '../organizations/organization-invitation.entity';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { Organization } from '../organizations/organization.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, OrganizationInvitation, OrganizationMember, Organization, Horse, HorseUser]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET no configurado');
        }
        const expiresIn = (process.env.JWT_EXPIRES_IN ?? '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, DevSeedService, CloudinaryService],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
