import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { Subscription } from './subscription.entity';
import { Plan } from '../plans/plan.entity';
import { User } from '../auth/user.entity';
import { Organization } from '../organizations/organization.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  private client(): MercadoPagoConfig {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new BadRequestException(
        'MercadoPago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN).',
      );
    }
    return new MercadoPagoConfig({ accessToken });
  }

  /**
   * Inicia una suscripción a un plan pago. Devuelve el init_point de MercadoPago
   * (URL donde el usuario autoriza el cobro recurrente).
   */
  async createSubscription(user: User, planId: string): Promise<{ init_point: string; preapproval_id: string }> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.active) throw new BadRequestException('Este plan no está disponible');
    if (plan.price_ars <= 0) throw new BadRequestException('Este plan es gratuito, no requiere pago');

    const backUrl = process.env.MP_BACK_URL || 'https://app.handicapp.com/perfil';

    const preapproval = new PreApproval(this.client());
    const result = await preapproval.create({
      body: {
        reason: `HandicApp — ${plan.name}`,
        external_reference: JSON.stringify({ userId: user.id, planId: plan.id }),
        payer_email: user.email,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.price_ars,
          currency_id: 'ARS',
        },
        status: 'pending',
      },
    });

    await this.subRepo.save(
      this.subRepo.create({
        user_id: user.id,
        role_target: plan.role_target,
        tier_key: plan.tier_key,
        amount_ars: plan.price_ars,
        mp_preapproval_id: result.id ?? null,
        status: 'pending',
      }),
    );

    const initPoint = result.init_point;
    if (!initPoint) throw new BadRequestException('MercadoPago no devolvió un link de pago');
    return { init_point: initPoint, preapproval_id: result.id ?? '' };
  }

  /**
   * Webhook de MercadoPago. No confía en el body: re-consulta el preapproval por id
   * y activa el plan solo si MP lo reporta 'authorized'.
   */
  async handleWebhook(body: any): Promise<void> {
    try {
      const type = body?.type ?? body?.topic;
      const id = body?.data?.id ?? body?.id;
      if (!id) return;

      // Solo nos interesan los eventos de preapproval (suscripción).
      if (type && !String(type).includes('preapproval') && !String(type).includes('subscription')) {
        return;
      }

      const preapproval = new PreApproval(this.client());
      const info = await preapproval.get({ id: String(id) });

      const sub = await this.subRepo.findOne({ where: { mp_preapproval_id: String(id) } });
      if (!sub) {
        this.logger.warn(`Webhook: preapproval ${id} sin suscripción local`);
        return;
      }

      if (info.status === 'authorized') {
        await this.activatePlan(sub);
        sub.status = 'authorized';
      } else if (info.status === 'paused') {
        sub.status = 'paused';
      } else if (info.status === 'cancelled') {
        sub.status = 'cancelled';
      }
      await this.subRepo.save(sub);
    } catch (err) {
      this.logger.error(`Error procesando webhook MP: ${(err as Error)?.message}`);
    }
  }

  /** Activa el plan comprado en el user (propietario/vet) o en su organización (estab/haras). */
  private async activatePlan(sub: Subscription): Promise<void> {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    if (['propietario', 'veterinario'].includes(sub.role_target)) {
      const user = await this.userRepo.findOne({ where: { id: sub.user_id } });
      if (user) {
        user.plan = sub.tier_key;
        user.plan_expires_at = expiry;
        await this.userRepo.save(user);
      }
    } else {
      // Plan de organización (establecimiento/haras): la org que el usuario posee.
      const org = await this.orgRepo.findOne({ where: { owner_id: sub.user_id } });
      if (org) {
        org.plan = sub.tier_key as Organization['plan'];
        org.plan_expires_at = expiry;
        org.status = 'active';
        await this.orgRepo.save(org);
      }
    }
  }

  async mySubscriptions(userId: string): Promise<Subscription[]> {
    return this.subRepo.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }
}
