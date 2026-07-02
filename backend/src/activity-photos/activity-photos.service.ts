import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPhoto, ActivityPhotoType } from './activity-photo.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { User } from '../auth/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

const ACTIVITY_LABELS: Record<string, string> = {
  alimentacion: 'Alimentación',
  entrenamiento: 'Entrenamiento',
  descanso: 'Descanso',
  veterinario: 'Veterinario',
  otro: 'Actividad',
};

@Injectable()
export class ActivityPhotosService {
  constructor(
    @InjectRepository(ActivityPhoto)
    private readonly photoRepository: Repository<ActivityPhoto>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async findByHorse(horseId: string, user: User): Promise<ActivityPhoto[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.photoRepository.find({
      where: { horse_id: horseId },
      order: { taken_at: 'DESC' },
      take: 50,
    });
  }

  async upload(
    horseId: string,
    file: Express.Multer.File,
    activityType: ActivityPhotoType,
    caption: string | undefined,
    user: User,
  ): Promise<ActivityPhoto> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    // El timestamp lo pone el servidor — no el cliente
    const takenAt = new Date();

    const result = await this.cloudinaryService.upload(file, 'handicapp/activity');

    // Overlay del sello con Sharp/Cloudinary transformations
    // Usamos transformación de Cloudinary para agregar texto sobre la imagen
    const overlayUrl = this.cloudinaryService.addTimestampOverlay(
      result.public_id,
      user.name,
      takenAt,
    );

    const photo = await this.photoRepository.save(
      this.photoRepository.create({
        horse_id: horseId,
        url: overlayUrl,
        public_id: result.public_id,
        activity_type: activityType,
        caption: caption ?? null,
        taken_at: takenAt,
        taken_by: user.id,
      }),
    );

    // Notificar al propietario y a los encargados (capataces) de la organización
    // si quien sube no es el propietario — cerrar el loop de supervisión
    if (user.id !== horse.owner_id) {
      const label = ACTIVITY_LABELS[activityType] ?? 'Actividad';
      const recipientIds = await this.resolveRecipients(horse, user);
      const notifications = await this.notificationsService.createMany(
        recipientIds.map((recipient_id) => ({
          type: NotificationType.HEALTH_REMINDER,
          title: `Nueva foto de ${label} — ${horse.name}`,
          message: `${user.name} subió una foto de ${horse.name} (${label})`,
          recipient_id,
        })),
      );
      for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);
    }

    return photo;
  }

  async remove(id: string, user: User): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    await this.assertAccess(photo.horse, user);
    await this.cloudinaryService.delete(photo.public_id);
    await this.photoRepository.remove(photo);
  }

  /**
   * Resuelve los destinatarios de la notificación: el propietario del caballo
   * más los encargados (capataces) de su organización. Deduplica y excluye a
   * quien hizo la acción. Si el caballo no tiene organización, solo el owner.
   */
  private async resolveRecipients(horse: Horse, user: User): Promise<string[]> {
    const recipients = new Set<string>();
    if (horse.owner_id) recipients.add(horse.owner_id);

    if (horse.organization_id) {
      const encargados: { user_id: string }[] = await this.horseRepository.query(
        `SELECT om.user_id
           FROM organization_members om
          WHERE om.organization_id = $1
            AND om.role_in_org = 'encargado'`,
        [horse.organization_id],
      );
      for (const e of encargados) recipients.add(e.user_id);
    }

    recipients.delete(user.id);
    return [...recipients];
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;
    if (user.role === 'propietario' && horse.owner_id === user.id) return;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) return;
    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;
    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
