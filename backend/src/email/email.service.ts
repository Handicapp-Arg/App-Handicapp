import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM || 'HandicApp <noreply@handicapp.com>';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor() {
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no configurada — emails deshabilitados');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({ from: FROM, to, subject, html });
    } catch (err) {
      this.logger.warn(`Email fallido a ${to}: ${(err as Error).message}`);
    }
  }

  private baseHtml(content: string): string {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="display:inline-block;background:#0f1f3d;color:#fff;font-weight:700;font-size:14px;
                       padding:6px 14px;border-radius:8px;letter-spacing:0.3px">HandicApp</span>
        </div>
        ${content}
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
          <p style="font-size:11px;color:#9ca3af;margin:0">
            Este mensaje fue enviado automáticamente. No respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }

  async sendPasswordReset(opts: { to: string; name: string; resetLink: string }): Promise<void> {
    const { to, name, resetLink } = opts;
    const html = this.baseHtml(`
      <p style="color:#374151;margin:0 0 8px;font-size:15px">Hola <strong>${name}</strong>,</p>
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta HandicApp.
      </p>
      <a href="${resetLink}"
        style="display:inline-block;background:#0f1f3d;color:#fff;text-decoration:none;
               border-radius:10px;padding:13px 28px;font-weight:700;font-size:14px">
        Restablecer contraseña
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0">
        Este enlace expira en 1 hora. Si no solicitaste el cambio, ignorá este mensaje.
      </p>
    `);
    await this.send(to, 'Recuperar contraseña — HandicApp', html);
  }

  async sendOrganizationInvitation(opts: {
    to: string;
    orgName: string;
    inviterName: string;
    link: string;
    role: string;
  }): Promise<void> {
    const { to, orgName, inviterName, link, role } = opts;
    const html = this.baseHtml(`
      <p style="color:#374151;margin:0 0 8px;font-size:15px">Hola,</p>
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px">
        <strong>${inviterName}</strong> te invitó a unirte a <strong>${orgName}</strong> en HandicApp
        con el rol de <strong>${role}</strong>.
      </p>
      <a href="${link}"
        style="display:inline-block;background:#0f1f3d;color:#fff;text-decoration:none;
               border-radius:10px;padding:13px 28px;font-weight:700;font-size:14px">
        Unirme a ${orgName}
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0">
        Esta invitación expira en 7 días. Si no esperabas este mensaje, ignoralo.
      </p>
    `);
    await this.send(to, `Invitación a ${orgName} — HandicApp`, html);
  }

  async sendEventNotification(opts: {
    to: string;
    recipientName: string;
    actorName: string;
    horseName: string;
    eventType: string;
    description: string;
  }): Promise<void> {
    const { to, recipientName, actorName, horseName, eventType, description } = opts;
    const html = this.baseHtml(`
      <p style="color:#374151;margin:0 0 8px;font-size:15px">Hola <strong>${recipientName}</strong>,</p>
      <p style="color:#6b7280;margin:0 0 16px;font-size:14px">
        <strong>${actorName}</strong> registró un nuevo evento para <strong>${horseName}</strong>:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.05em">${eventType}</p>
        <p style="margin:0;color:#111827;font-size:14px">${description}</p>
      </div>
    `);
    await this.send(to, `Nuevo evento en ${horseName} — HandicApp`, html);
  }

  async sendContractNotification(opts: {
    to: string;
    recipientName: string;
    contractTitle: string;
    establishmentName: string;
    action: 'created' | 'signed' | 'rejected';
  }): Promise<void> {
    const { to, recipientName, contractTitle, establishmentName, action } = opts;
    const messages = {
      created: { subject: `Nuevo contrato pendiente — HandicApp`, body: `<strong>${establishmentName}</strong> te envió el contrato <em>${contractTitle}</em> para que lo revises y firmes en HandicApp.` },
      signed: { subject: `Contrato firmado — HandicApp`, body: `El propietario firmó el contrato <em>${contractTitle}</em>.` },
      rejected: { subject: `Contrato rechazado — HandicApp`, body: `El propietario rechazó el contrato <em>${contractTitle}</em>. Revisá el motivo en HandicApp.` },
    };
    const { subject, body } = messages[action];
    const html = this.baseHtml(`
      <p style="color:#374151;margin:0 0 8px;font-size:15px">Hola <strong>${recipientName}</strong>,</p>
      <p style="color:#6b7280;margin:0;font-size:14px">${body}</p>
    `);
    await this.send(to, subject, html);
  }

  async sendMedicalReminder(opts: {
    to: string;
    recipientName: string;
    horseName: string;
    recordName: string;
    dueDate: string;
    daysUntilDue: number;
  }): Promise<void> {
    const { to, recipientName, horseName, recordName, dueDate, daysUntilDue } = opts;
    const urgency = daysUntilDue <= 1 ? '🚨 Hoy' : daysUntilDue <= 3 ? '⚠️ Próximo' : '📋 Recordatorio';
    const html = this.baseHtml(`
      <p style="color:#374151;margin:0 0 8px;font-size:15px">Hola <strong>${recipientName}</strong>,</p>
      <p style="color:#6b7280;margin:0 0 16px;font-size:14px">
        ${urgency}: <strong>${horseName}</strong> tiene programado <em>${recordName}</em> para el <strong>${dueDate}</strong>
        ${daysUntilDue > 0 ? `(en ${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'})` : '(hoy)'}.
      </p>
      <p style="color:#9ca3af;font-size:13px;margin:0">
        Registrá el resultado en HandicApp una vez completado.
      </p>
    `);
    await this.send(to, `${urgency} — ${recordName} para ${horseName}`, html);
  }
}
