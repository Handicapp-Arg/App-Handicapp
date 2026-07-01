import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Inicia la suscripción a un plan pago → devuelve el link de MercadoPago.
  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  subscribe(@GetUser() user: User, @Body('plan_id') planId: string) {
    return this.paymentsService.createSubscription(user, planId);
  }

  // Webhook de MercadoPago (PÚBLICO, sin auth). MP lo llama con las notificaciones.
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: any) {
    await this.paymentsService.handleWebhook(body);
    return { received: true };
  }

  @Get('subscriptions')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  mySubs(@GetUser() user: User) {
    return this.paymentsService.mySubscriptions(user.id);
  }
}
