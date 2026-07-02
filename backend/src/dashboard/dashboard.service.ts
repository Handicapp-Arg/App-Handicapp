import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { DailyRoutine } from '../routines/daily-routine.entity';
import { ActivityPhoto } from '../activity-photos/activity-photo.entity';
import { TrainingMetrics } from '../events/training-metrics.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRepository: Repository<MedicalRecord>,
    @InjectRepository(DailyRoutine)
    private readonly routineRepository: Repository<DailyRoutine>,
    @InjectRepository(ActivityPhoto)
    private readonly photoRepository: Repository<ActivityPhoto>,
    @InjectRepository(TrainingMetrics)
    private readonly metricsRepository: Repository<TrainingMetrics>,
  ) {}

  async getForUser(user: User) {
    if (user.role === 'admin') return this.getAdminDashboard();
    if (user.role === 'propietario') return this.getPropietarioDashboard(user.id);
    if (user.role === 'establecimiento') return this.getEstablecimientoDashboard(user.id);
    if (user.role === 'veterinario') return this.getVeterinarioDashboard(user.id);
    if (user.role === 'encargado') return this.getEncargadoDashboard(user.id);
    return {};
  }

  private async getAdminDashboard() {
    const [propietarios, establecimientos, caballos, recentEvents] = await Promise.all([
      this.userRepository.count({ where: { role: 'propietario' } }),
      this.userRepository.count({ where: { role: 'establecimiento' } }),
      this.horseRepository.count(),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .orderBy('e.created_at', 'DESC')
        .limit(5)
        .getMany(),
    ]);

    return {
      role: 'admin',
      stats: { propietarios, establecimientos, caballos },
      recent_events: recentEvents,
    };
  }

  private async getPropietarioDashboard(userId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [horses, recentEvents, monthlySpend, spendByHorse, spendByCategory, recentExpenses] = await Promise.all([
      this.horseRepository.find({
        where: { owner_id: userId },
        relations: ['breed', 'activity', 'establishment'],
        order: { created_at: 'DESC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .where('horse.owner_id = :uid', { uid: userId })
        .orderBy('e.date', 'DESC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .select('SUM(e.amount)', 'total')
        .leftJoin('e.horse', 'horse')
        .where('horse.owner_id = :uid', { uid: userId })
        .andWhere('e.type = :type', { type: 'gasto' })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .andWhere('e.amount IS NOT NULL')
        .getRawOne<{ total: string | null }>(),
      this.eventRepository
        .createQueryBuilder('e')
        .select('horse.id', 'horse_id')
        .addSelect('horse.name', 'horse_name')
        .addSelect('SUM(e.amount)', 'total')
        .leftJoin('e.horse', 'horse')
        .where('horse.owner_id = :uid', { uid: userId })
        .andWhere('e.type = :type', { type: 'gasto' })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .andWhere('e.amount IS NOT NULL')
        .groupBy('horse.id')
        .addGroupBy('horse.name')
        .orderBy('SUM(e.amount)', 'DESC')
        .getRawMany<{ horse_id: string; horse_name: string; total: string }>(),
      this.eventRepository
        .createQueryBuilder('e')
        .select('e.expense_category', 'category')
        .addSelect('SUM(e.amount)', 'total')
        .leftJoin('e.horse', 'horse')
        .where('horse.owner_id = :uid', { uid: userId })
        .andWhere('e.type = :type', { type: 'gasto' })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .andWhere('e.amount IS NOT NULL')
        .groupBy('e.expense_category')
        .orderBy('SUM(e.amount)', 'DESC')
        .getRawMany<{ category: string | null; total: string }>(),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .where('horse.owner_id = :uid', { uid: userId })
        .andWhere('e.type = :type', { type: 'gasto' })
        .andWhere('e.amount IS NOT NULL')
        .orderBy('e.date', 'DESC')
        .limit(6)
        .getMany(),
    ]);

    return {
      role: 'propietario',
      horses,
      recent_events: recentEvents,
      monthly_spend: parseFloat(monthlySpend?.total ?? '0') || 0,
      spend_by_horse: spendByHorse.map((r) => ({
        horse_id: r.horse_id,
        horse_name: r.horse_name,
        total: parseFloat(r.total) || 0,
      })),
      spend_by_category: spendByCategory.map((r) => ({
        category: r.category ?? 'otros',
        total: parseFloat(r.total) || 0,
      })),
      recent_expenses: recentExpenses,
    };
  }

  private async getEstablecimientoDashboard(userId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [horses, recentEvents, monthlyEvents] = await Promise.all([
      this.horseRepository.find({
        where: { establishment_id: userId },
        relations: ['owner', 'breed', 'activity'],
        order: { created_at: 'DESC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .where('horse.establishment_id = :uid', { uid: userId })
        .orderBy('e.date', 'DESC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .where('horse.establishment_id = :uid', { uid: userId })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .getCount(),
    ]);

    return {
      role: 'establecimiento',
      horses,
      recent_events: recentEvents,
      monthly_events_count: monthlyEvents,
    };
  }

  private async getVeterinarioDashboard(userId: string) {
    const assignments: { horse_id: string }[] = await this.userRepository.query(
      `SELECT horse_id FROM horse_users WHERE user_id = $1 AND role = 'vet'`,
      [userId],
    );
    const horseIds = assignments.map((a) => a.horse_id);

    if (!horseIds.length) {
      return {
        role: 'veterinario', horses: [], recent_health_events: [],
        upcoming_medical: [], total_horses: 0, total_salud_events: 0,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysISO = in30Days.toISOString().split('T')[0];

    const [horses, recentHealthEvents, upcomingMedical, totalSalud] = await Promise.all([
      this.horseRepository.find({
        where: horseIds.map((id) => ({ id })),
        relations: ['owner', 'breed', 'activity'],
        order: { name: 'ASC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .where('e.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere("e.type = 'salud'")
        .andWhere('e.deleted_at IS NULL')
        .orderBy('e.date', 'DESC')
        .limit(8)
        .getMany(),
      this.medicalRepository
        .createQueryBuilder('m')
        .where('m.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere('m.next_due IS NOT NULL')
        .andWhere('m.next_due >= :today', { today })
        .andWhere('m.next_due <= :in30Days', { in30Days: in30DaysISO })
        .orderBy('m.next_due', 'ASC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .where('e.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere("e.type = 'salud'")
        .andWhere('e.deleted_at IS NULL')
        .getCount(),
    ]);

    return {
      role: 'veterinario',
      total_horses: horseIds.length,
      total_salud_events: totalSalud,
      horses,
      recent_health_events: recentHealthEvents,
      upcoming_medical: upcomingMedical,
    };
  }

  // Dashboard del encargado (capataz): feed consolidado de la actividad
  // reciente de TODOS los caballos de su(s) organización(es). Solo lectura.
  private async getEncargadoDashboard(userId: string) {
    type FeedItem = {
      kind: 'rutina' | 'foto' | 'entrenamiento' | 'aviso';
      horse_id: string;
      horse_name: string;
      author_name: string | null;
      at: string;
      title: string;
      detail: string | null;
      photo_url: string | null;
      is_alert: boolean;
    };

    const emptyResult = {
      role: 'encargado' as const,
      horses_total: 0,
      activity_today: 0,
      alerts_count: 0,
      feed: [] as FeedItem[],
    };

    // 1) Orgs del encargado
    const orgRows: { organization_id: string }[] = await this.userRepository.query(
      `SELECT organization_id FROM organization_members WHERE user_id = $1`,
      [userId],
    );
    const orgIds = orgRows.map((r) => r.organization_id).filter((id) => id != null);
    if (!orgIds.length) return emptyResult;

    // 2) Caballos de esas orgs
    const horses = await this.horseRepository
      .createQueryBuilder('h')
      .select(['h.id AS id', 'h.name AS name'])
      .where('h.organization_id IN (:...orgIds)', { orgIds })
      .andWhere('h.deleted_at IS NULL')
      .getRawMany<{ id: string; name: string }>();

    const horseIds = horses.map((h) => h.id);
    const horseNameById = new Map(horses.map((h) => [h.id, h.name]));
    if (!horseIds.length) {
      return { ...emptyResult, horses_total: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    // 3) Las 4 fuentes de actividad, en paralelo
    const [routines, photos, trainings, alerts] = await Promise.all([
      // Rutinas diarias
      this.routineRepository
        .createQueryBuilder('r')
        .where('r.horse_id IN (:...horseIds)', { horseIds })
        .orderBy('r.created_at', 'DESC')
        .limit(15)
        .getMany(),
      // Fotos de actividad
      this.photoRepository
        .createQueryBuilder('p')
        .where('p.horse_id IN (:...horseIds)', { horseIds })
        .orderBy('p.taken_at', 'DESC')
        .limit(15)
        .getMany(),
      // Entrenamientos (evento + métricas), patrón de getTrainingHistory
      this.eventRepository
        .createQueryBuilder('event')
        .leftJoin(TrainingMetrics, 'tm', 'tm.event_id = event.id')
        .leftJoin('event.author', 'author')
        .select('event.id', 'id')
        .addSelect('event.horse_id', 'horse_id')
        .addSelect('event.date', 'date')
        .addSelect('event.event_time', 'event_time')
        .addSelect('event.description', 'description')
        .addSelect('author.name', 'author_name')
        .addSelect('tm.distance_km', 'distance_km')
        .addSelect('tm.duration_min', 'duration_min')
        .addSelect('tm.discipline', 'discipline')
        .where('event.horse_id IN (:...horseIds)', { horseIds })
        .andWhere('event.type = :type', { type: 'entrenamiento' })
        .andWhere('event.deleted_at IS NULL')
        .orderBy('event.date', 'DESC')
        .addOrderBy('event.event_time', 'DESC')
        .limit(15)
        .getRawMany<{
          id: string;
          horse_id: string;
          date: string;
          event_time: string | null;
          description: string;
          author_name: string | null;
          distance_km: string | null;
          duration_min: number | null;
          discipline: string | null;
        }>(),
      // Avisos (tarea con ⚠️)
      this.eventRepository
        .createQueryBuilder('event')
        .leftJoin('event.author', 'author')
        .select('event.id', 'id')
        .addSelect('event.horse_id', 'horse_id')
        .addSelect('event.date', 'date')
        .addSelect('event.event_time', 'event_time')
        .addSelect('event.description', 'description')
        .addSelect('author.name', 'author_name')
        .where('event.horse_id IN (:...horseIds)', { horseIds })
        .andWhere('event.type = :type', { type: 'tarea' })
        .andWhere("event.description LIKE '⚠️%'")
        .andWhere('event.deleted_at IS NULL')
        .orderBy('event.date', 'DESC')
        .addOrderBy('event.event_time', 'DESC')
        .limit(15)
        .getRawMany<{
          id: string;
          horse_id: string;
          date: string;
          event_time: string | null;
          description: string;
          author_name: string | null;
        }>(),
    ]);

    // Helper: combinar date (YYYY-MM-DD) + event_time (HH:MM) en ISO
    const eventAt = (date: string, time: string | null): string =>
      new Date(`${date}T${time ?? '00:00'}:00`).toISOString();

    const feed: FeedItem[] = [];

    // Rutinas → FeedItem
    for (const r of routines) {
      const done: string[] = [];
      if (r.morning_feed || r.afternoon_feed || r.evening_feed) done.push('Comida');
      if (r.water_ok) done.push('Agua');
      if (r.box_cleaned) done.push('Box limpio');
      if (r.paddock) done.push('Paddock');
      if (r.groomed) done.push('Cepillado');
      feed.push({
        kind: 'rutina',
        horse_id: r.horse_id,
        horse_name: horseNameById.get(r.horse_id) ?? '',
        author_name: r.filler?.name ?? null,
        at: r.created_at.toISOString(),
        title: done.length ? done.join(', ') : 'Rutina',
        detail: r.observations ?? null,
        photo_url: null,
        is_alert: false,
      });
    }

    // Fotos → FeedItem
    for (const p of photos) {
      feed.push({
        kind: 'foto',
        horse_id: p.horse_id,
        horse_name: horseNameById.get(p.horse_id) ?? '',
        author_name: p.photographer?.name ?? null,
        at: p.taken_at.toISOString(),
        title: `Foto · ${p.activity_type}`,
        detail: p.caption ?? null,
        photo_url: p.url,
        is_alert: false,
      });
    }

    // Entrenamientos → FeedItem
    for (const t of trainings) {
      const dist = t.distance_km != null ? Number(t.distance_km) : null;
      const disc = t.discipline ?? 'Entrenamiento';
      const title = dist != null ? `${disc} · ${dist} km` : disc;
      feed.push({
        kind: 'entrenamiento',
        horse_id: t.horse_id,
        horse_name: horseNameById.get(t.horse_id) ?? '',
        author_name: t.author_name ?? null,
        at: eventAt(t.date, t.event_time),
        title,
        detail: t.description ?? null,
        photo_url: null,
        is_alert: false,
      });
    }

    // Avisos → FeedItem
    for (const a of alerts) {
      const reason = a.description.replace(/^⚠️\s*/, '');
      feed.push({
        kind: 'aviso',
        horse_id: a.horse_id,
        horse_name: horseNameById.get(a.horse_id) ?? '',
        author_name: a.author_name ?? null,
        at: eventAt(a.date, a.event_time),
        title: reason,
        detail: null,
        photo_url: null,
        is_alert: true,
      });
    }

    // Merge cronológico DESC + límite
    feed.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    const merged = feed.slice(0, 40);

    // Contadores (sobre el feed completo, no solo el recorte de 40)
    const activityToday = feed.filter((f) => f.at.split('T')[0] === today).length;
    const alertsToday = feed.filter(
      (f) => f.is_alert && f.at.split('T')[0] === today,
    ).length;

    return {
      role: 'encargado' as const,
      horses_total: horseIds.length,
      activity_today: activityToday,
      alerts_count: alertsToday,
      feed: merged,
    };
  }
}
