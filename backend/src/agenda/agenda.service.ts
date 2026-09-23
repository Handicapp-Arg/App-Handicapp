import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceAppointment } from './service-appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import { NotificationType } from '../notifications/notification.entity';

const TYPE_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  herrador: 'Herrador',
  competencia: 'Competencia',
  desparasitacion: 'Desparasitación',
  vacuna: 'Vacuna',
  entrenamiento: 'Entrenamiento',
  otro: 'Otro',
};

/**
 * Zona del usuario. El proceso corre en UTC (en el VPS y en Render), así que
 * sin fijarla el aviso hablaba en hora del servidor: un turno el martes a las
 * 22:00 se guarda como miércoles 01:00 UTC y la notificación decía "mañana a
 * las 01:00" cuando en realidad era "hoy a las 22:00". El dueño se perdía el
 * turno por un día y tres horas.
 */
const ZONA = 'America/Argentina/Buenos_Aires';

/** El día calendario (YYYY-MM-DD) que esa fecha tiene EN ARGENTINA. */
function diaEnZona(d: Date): string {
  // 'en-CA' da ISO (YYYY-MM-DD), que se compara y se resta como texto.
  return d.toLocaleDateString('en-CA', { timeZone: ZONA });
}

function cuandoEs(fecha: Date, ahora: Date): string {
  const diaFecha = diaEnZona(fecha);
  const diaHoy = diaEnZona(ahora);
  if (diaFecha <= diaHoy) return 'hoy';

  const manana = new Date(ahora.getTime() + 86400000);
  if (diaFecha === diaEnZona(manana)) return 'mañana';

  return `el ${fecha.toLocaleDateString('es-AR', { timeZone: ZONA, day: 'numeric', month: 'long' })}`;
}

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(ServiceAppointment)
    private readonly appointmentRepository: Repository<ServiceAppointment>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  async findByUser(user: User, upcoming?: boolean): Promise<ServiceAppointment[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoin('a.horse', 'horse')
      .addSelect(['horse.id', 'horse.name'])
      .orderBy('a.scheduled_at', 'ASC');

    if (upcoming) {
      qb.andWhere('a.scheduled_at >= :now', { now: new Date() })
        .andWhere('a.completed = false');
    }

    if (user.role === 'propietario') {
      qb.leftJoin('horse.horseUsers', 'hu')
        .andWhere('horse.owner_id = :uid OR (hu.user_id = :uid AND hu.role = :ownerRole)', {
          uid: user.id, ownerRole: 'owner',
        });
    } else if (user.role === 'establecimiento') {
      qb.andWhere('horse.establishment_id = :uid', { uid: user.id });
    } else if (user.role === 'veterinario') {
      qb.innerJoin('horse.horseUsers', 'hu2').andWhere('hu2.user_id = :uid', { uid: user.id });
    }

    return qb.getMany();
  }

  async findByHorse(horseId: string, user: User): Promise<ServiceAppointment[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.appointmentRepository.find({
      where: { horse_id: horseId },
      order: { scheduled_at: 'ASC' },
    });
  }

  async create(dto: CreateAppointmentDto, user: User): Promise<ServiceAppointment> {
    const horse = await this.horseRepository.findOne({ where: { id: dto.horse_id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const appointment = this.appointmentRepository.create({
      ...dto,
      scheduled_at: new Date(dto.scheduled_at),
      notes: dto.notes ?? null,
      professional: dto.professional?.trim() || null,
      // Ojo con `??`: si el usuario eligió "no avisar" manda null, y un
      // `?? 24` se lo pisaría. Solo el campo ausente toma el default.
      remind_hours_before:
        dto.remind_hours_before === undefined ? 24 : dto.remind_hours_before,
      created_by: user.id,
    });
    return this.appointmentRepository.save(appointment);
  }

  async findOne(id: string, user: User): Promise<ServiceAppointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);

    // El caballo se devuelve recortado. La entidad completa incluye
    // `public_token`, que es la llave de `GET /horses/public/:token` — un
    // endpoint SIN autenticación que expone la ficha entera con su historial
    // médico. Quien puede ver un turno no tiene por qué llevarse esa llave, y
    // el token no expira ni se rota.
    if (appointment.horse) {
      const { id: hid, name, image_url } = appointment.horse;
      appointment.horse = { id: hid, name, image_url } as Horse;
    }
    return appointment;
  }

  /**
   * Edición parcial. El control de acceso es el mismo que `complete()` y
   * `remove()` (acceso al caballo del turno) MÁS una validación extra: si el
   * turno se muda a otro caballo hay que tener acceso también al de destino,
   * o alguien podría mover un turno propio al caballo de un tercero.
   */
  async update(id: string, dto: UpdateAppointmentDto, user: User): Promise<ServiceAppointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);

    if (dto.horse_id && dto.horse_id !== appointment.horse_id) {
      const destino = await this.horseRepository.findOne({ where: { id: dto.horse_id } });
      if (!destino) throw new NotFoundException('Caballo no encontrado');
      await this.assertAccess(destino, user);
      appointment.horse_id = destino.id;
      appointment.horse = destino;
    }

    if (dto.type !== undefined) appointment.type = dto.type;
    if (dto.title !== undefined) appointment.title = dto.title;
    if (dto.notes !== undefined) appointment.notes = dto.notes ?? null;
    if (dto.professional !== undefined) {
      appointment.professional = dto.professional?.trim() || null;
    }

    // Si se movió la fecha o cambió la anticipación, el aviso que ya se mandó
    // (o el que no se mandó) dejó de corresponder: se rearma el recordatorio.
    let rearmar = false;
    if (dto.scheduled_at !== undefined) {
      const nueva = new Date(dto.scheduled_at);
      if (nueva.getTime() !== appointment.scheduled_at.getTime()) rearmar = true;
      appointment.scheduled_at = nueva;
    }
    if (dto.remind_hours_before !== undefined
        && dto.remind_hours_before !== appointment.remind_hours_before) {
      appointment.remind_hours_before = dto.remind_hours_before;
      rearmar = true;
    }
    if (rearmar) appointment.reminder_sent = false;

    return this.appointmentRepository.save(appointment);
  }

  async complete(id: string, user: User): Promise<ServiceAppointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);
    appointment.completed = true;
    return this.appointmentRepository.save(appointment);
  }

  async remove(id: string, user: User): Promise<void> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);
    await this.appointmentRepository.remove(appointment);
  }

  /**
   * Cron horario: avisa de cada turno cuando entra en SU propia ventana de
   * anticipación (`remind_hours_before`), no en una de 24 h fija.
   *
   * La ventana se calcula en SQL contra la fila, no en JS, para no traerse
   * todos los turnos futuros y filtrarlos en memoria. `remind_hours_before`
   * nulo o 0 significa "no avisar" y queda fuera de la consulta.
   *
   * Límite conocido: como el cron corre una vez por hora, un aviso de "1 hora
   * antes" puede salir hasta ~1 h antes de lo pedido (nunca después de la
   * hora del turno, porque el filtro exige `scheduled_at >= now`).
   */
  /**
   * Cada 10 minutos, no cada hora. Dos razones, las dos por la anticipación
   * configurable:
   *
   * 1. PRECISIÓN. "Avisame 1 hora antes" con un cron horario podía salir hasta
   *    59 minutos antes de lo pedido.
   * 2. TOLERANCIA A FALLOS. El filtro es una ventana, no un umbral: si el turno
   *    sale de la ventana por arriba sin que el cron lo haya tomado, ya no
   *    vuelve a entrar y el aviso NO SALE NUNCA. Con ventana de 1 hora y cron
   *    horario, una sola corrida perdida (un deploy, un reinicio) bastaba para
   *    perder el aviso. Con 10 minutos hay seis oportunidades por ventana.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendReminders(): Promise<void> {
    const now = new Date();

    const upcoming = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.scheduled_at >= :now', { now })
      .andWhere('a.remind_hours_before IS NOT NULL')
      .andWhere('a.remind_hours_before > 0')
      .andWhere(
        `a.scheduled_at <= CAST(:now AS timestamptz) + make_interval(hours => a.remind_hours_before)`,
      )
      .andWhere('a.completed = false')
      .andWhere('a.reminder_sent = false')
      .leftJoinAndSelect('a.horse', 'horse')
      .getMany();

    for (const appt of upcoming) {
      const horseUsers = await this.horseUserRepository.find({
        where: { horse_id: appt.horse_id },
      });

      const timeStr = appt.scheduled_at.toLocaleTimeString('es-AR', {
        timeZone: ZONA, hour: '2-digit', minute: '2-digit',
      });
      const typeLabel = TYPE_LABELS[appt.type] ?? appt.type;
      // Con la anticipación configurable, "mañana" dejó de ser cierto: el aviso
      // puede salir el mismo día o varios días antes. Se dice cuándo es.
      const cuando = cuandoEs(appt.scheduled_at, now);
      const title = `🗓️ Turno ${cuando} — ${typeLabel}`;
      const quien = appt.professional ? ` con ${appt.professional}` : '';
      const message = `${appt.horse.name}: ${appt.title}${quien} ${cuando} a las ${timeStr}.`;

      // Incluir propietario del caballo, creador del turno y usuarios asignados
      const recipientIds = new Set<string>([
        appt.horse.owner_id,
        appt.created_by,
        ...horseUsers.map((hu) => hu.user_id),
      ].filter(Boolean));

      const notifications = await this.notificationsService.createMany(
        [...recipientIds].map((recipient_id) => ({
          type: NotificationType.HEALTH_REMINDER,
          title,
          message,
          recipient_id,
        })),
      );

      for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);

      appt.reminder_sent = true;
      await this.appointmentRepository.save(appt);
    }
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;
    if (horse.owner_id === user.id) return;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) {
      if (horse.organization_id) await this.assertOrgNotSuspended(horse.organization_id);
      return;
    }

    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;

    if (horse.organization_id) {
      const rows: { role_in_org: string }[] = await this.horseRepository.query(
        `SELECT role_in_org FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
        [horse.organization_id, user.id],
      );
      if (rows.length > 0) {
        // Roles operativos (jinete/peón): NO acceden por ser miembros de la org,
        // solo por estar asignados al caballo (lo de arriba, vía `entry`). Si
        // llegaron hasta acá, no están asignados.
        //
        // Esta guarda existe igual en `HorsesService.assertAccess` y acá
        // faltaba: un peón de la organización podía leer los turnos de un
        // caballo al que el propio endpoint de caballos le daba 403, y desde
        // que existe `PATCH /agenda/:id` también podía EDITARLOS o moverlos a
        // otro caballo. Los dos controles tienen que decir lo mismo.
        if (user.role === 'jinete' || user.role === 'peon') {
          throw new ForbiddenException('No tenés acceso a este caballo');
        }
        if (['admin', 'staff'].includes(rows[0].role_in_org)) {
          await this.assertOrgNotSuspended(horse.organization_id);
        }
        return;
      }
    }

    throw new ForbiddenException('No tenés acceso a este caballo');
  }

  private async assertOrgNotSuspended(orgId: string): Promise<void> {
    const rows: { status: string }[] = await this.horseRepository.query(
      `SELECT status FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId],
    );
    if (rows[0]?.status === 'suspended') {
      throw new ForbiddenException('Esta organización está suspendida.');
    }
  }
}
