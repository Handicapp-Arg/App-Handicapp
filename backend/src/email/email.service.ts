import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordReset(opts: { to: string; name: string; resetLink: string }): Promise<void> {
    if (!this.enabled) return;
    const { to, name, resetLink } = opts;
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Recuperar contraseña — HandicApp',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#0f1f3d;margin:0 0 16px">HandicApp</h2>
            <p style="color:#374151;margin:0 0 8px">Hola <strong>${name}</strong>,</p>
            <p style="color:#374151;margin:0 0 20px">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Hacé clic en el siguiente enlace para continuar:
            </p>
            <a href="${resetLink}"
              style="display:inline-block;background:#0f1f3d;color:#fff;text-decoration:none;
                     border-radius:10px;padding:12px 24px;font-weight:600;font-size:14px">
              Restablecer contraseña
            </a>
            <p style="font-size:12px;color:#9ca3af;margin:20px 0 0">
              Este enlace expira en 1 hora. Si no solicitaste el cambio, ignorá este mensaje.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(`No se pudo enviar email de reset a ${to}: ${(err as Error).message}`);
    }
  }

  async sendEventNotification(opts: {
    to: string;
    recipientName: string;
    actorName: string;
    horseName: string;
    eventType: string;
    description: string;
  }): Promise<void> {
    if (!this.enabled) return;

    const { to, recipientName, actorName, horseName, eventType, description } = opts;

    try {
      await this.mailerService.sendMail({
        to,
        subject: `Nuevo evento en ${horseName} — HandicApp`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#0f1f3d;margin:0 0 16px">HandicApp</h2>
            <p style="color:#374151;margin:0 0 8px">Hola <strong>${recipientName}</strong>,</p>
            <p style="color:#374151;margin:0 0 16px">
              <strong>${actorName}</strong> registró un nuevo evento para <strong>${horseName}</strong>:
            </p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 16px">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">${eventType}</p>
              <p style="margin:0;color:#111827">${description}</p>
            </div>
            <p style="font-size:12px;color:#9ca3af;margin:0">
              Este mensaje fue enviado automáticamente por HandicApp. No respondas a este correo.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(`No se pudo enviar email a ${to}: ${(err as Error).message}`);
    }
  }
}
