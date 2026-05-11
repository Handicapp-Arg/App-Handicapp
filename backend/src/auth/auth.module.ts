import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevSeedService } from './dev-seed.service';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
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
  providers: [AuthService, JwtStrategy, DevSeedService],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
