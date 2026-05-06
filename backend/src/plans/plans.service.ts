import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';

export const PLAN_LIMITS = {
  free: { horses: 3, label: 'Gratis' },
  pro: { horses: Infinity, label: 'Pro' },
};

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
  ) {}

  async getPlanStatus(user: User) {
    const limit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
    const horseCount = await this.horseRepo.count({ where: { owner_id: user.id } });
    const isExpired = user.plan !== 'free' && user.plan_expires_at && user.plan_expires_at < new Date();
    return {
      plan: isExpired ? 'free' : user.plan,
      plan_expires_at: user.plan_expires_at,
      horse_count: horseCount,
      horse_limit: limit.horses === Infinity ? null : limit.horses,
      is_limited: limit.horses !== Infinity && horseCount >= limit.horses,
      label: isExpired ? 'Gratis' : limit.label,
    };
  }

  async activatePro(userId: string, months = 1): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado');
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    user.plan = 'pro';
    user.plan_expires_at = expiry;
    return this.userRepo.save(user);
  }

  async assertCanAddHorse(user: User): Promise<void> {
    const status = await this.getPlanStatus(user);
    if (status.is_limited) {
      throw new ForbiddenException(
        `Tu plan gratuito permite hasta ${status.horse_limit} caballos. Actualizá a Pro para agregar más.`,
      );
    }
  }
}
