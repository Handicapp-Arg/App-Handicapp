import { Injectable, Logger } from '@nestjs/common';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR';
const TEMPLATE_HEALTH = process.env.WHATSAPP_TEMPLATE_HEALTH || 'recordatorio_salud';
const TEMPLATE_MEDICAL = process.env.WHATSAPP_TEMPLATE_MEDICAL || 'recordatorio_medico';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor() {
    if (!this.enabled()) {
      this.logger.warn(
        'WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID no configurados — WhatsApp deshabilitado',
      );
    }
  }

  /** Habilitado sólo si hay token + phone number id. */
  private enabled(): boolean {
    return !!TOKEN && !!PHONE_NUMBER_ID;
  }

  /**
   * Envía un mensaje por template (Meta exige templates para mensajes
   * iniciados por el negocio). Degradación silenciosa: nunca lanza.
   */
  private async send(to: string, templateName: string, params: string[]): Promise<void> {
    if (!this.enabled()) return;
    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'template',
            template: {
              name: templateName,
              language: { code: LANG },
              components: [
                {
                  type: 'body',
                  parameters: params.map((t) => ({ type: 'text', text: t })),
                },
              ],
            },
          }),
        },
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.warn(
          `WhatsApp fallido a ${to} (${res.status}): ${detail}`,
        );
      }
    } catch (err) {
      this.logger.warn(`WhatsApp fallido a ${to}: ${(err as Error).message}`);
    }
  }

  async sendHealthReminder(to: string, horseName: string): Promise<void> {
    await this.send(to, TEMPLATE_HEALTH, [horseName]);
  }

  async sendMedicalReminder(to: string, horseName: string, detail: string): Promise<void> {
    await this.send(to, TEMPLATE_MEDICAL, [horseName, detail]);
  }
}
