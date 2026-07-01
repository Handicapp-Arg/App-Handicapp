import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';
import { PlansService } from '../plans/plans.service';
import {
  SANITARY_DISEASES,
  healthStatusFromNextDue,
  type HealthStatus,
} from '../medical/medical.service';

export interface ReportSummary {
  horses: { total: number };
  health: { total: number; rojo: number; amarillo: number };
  expenses: {
    month_total: number;
    year_total: number;
    by_category: { category: string; total: number }[];
    monthly: { month: string; total: number }[];
  };
  upcoming: {
    appointments: {
      id: string;
      horse_id: string;
      horse_name: string;
      type: string;
      title: string;
      scheduled_at: string;
    }[];
    medical: {
      id: string;
      horse_id: string;
      horse_name: string;
      name: string;
      type: string;
      next_due: string;
    }[];
  };
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    private readonly plansService: PlansService,
  ) {}

  async getSummary(user: User): Promise<ReportSummary> {
    // 1. Resolver la organización del usuario (mismo patrón que horses.service).
    const orgRow: { id: string }[] = await this.horseRepo.query(
      `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
      [user.id],
    );
    const orgId = orgRow[0]?.id ?? null;

    // 2. Gating por feature del plan (org o individual).
    const ok = orgId
      ? await this.plansService.hasFeature('reportes', { orgId })
      : await this.plansService.hasFeature('reportes', { user });
    if (!ok) throw new ForbiddenException('Tu plan no incluye reportes');

    // 3. Caballos gestionados por el usuario u organización.
    const horseRows: { id: string }[] = await this.horseRepo.query(
      `SELECT id FROM horses
        WHERE (owner_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2))
          AND deleted_at IS NULL`,
      [user.id, orgId],
    );
    const horseIds = horseRows.map((r) => r.id);

    const [health, expenses, upcoming] = await Promise.all([
      this.buildHealth(horseIds),
      this.buildExpenses(horseIds),
      this.buildUpcoming(horseIds),
    ]);

    return {
      horses: { total: horseIds.length },
      health,
      expenses,
      upcoming,
    };
  }

  /**
   * Semáforo sanitario agregado: sobre los caballos del user/org, cuántos tienen
   * alguna enfermedad oficial en ROJO (vencido / sin registro) y en AMARILLO (<15d).
   * Reusa SANITARY_DISEASES y healthStatusFromNextDue del módulo médico.
   */
  private async buildHealth(horseIds: string[]): Promise<ReportSummary['health']> {
    if (horseIds.length === 0) return { total: 0, rojo: 0, amarillo: 0 };

    const records: { horse_id: string; name: string; next_due: string | null }[] =
      await this.horseRepo.query(
        `SELECT horse_id, name, next_due
           FROM medical_records
          WHERE horse_id = ANY($1::uuid[]) AND type = 'sanidad'
          ORDER BY date DESC`,
        [horseIds],
      );

    // Agrupamos los registros sanitarios por caballo (ya vienen ordenados por fecha DESC).
    const byHorse = new Map<string, { name: string; next_due: string | null }[]>();
    for (const r of records) {
      const list = byHorse.get(r.horse_id) ?? [];
      list.push({ name: r.name, next_due: r.next_due });
      byHorse.set(r.horse_id, list);
    }

    let rojo = 0;
    let amarillo = 0;
    for (const horseId of horseIds) {
      const horseRecords = byHorse.get(horseId) ?? [];
      let hasRojo = false;
      let hasAmarillo = false;
      for (const disease of SANITARY_DISEASES) {
        // Último (más reciente) registro que matchea la enfermedad.
        const last = horseRecords.find((r) => disease.match.test(r.name));
        const status: HealthStatus = healthStatusFromNextDue(last?.next_due ?? null);
        if (status === 'rojo') hasRojo = true;
        else if (status === 'amarillo') hasAmarillo = true;
      }
      if (hasRojo) rojo += 1;
      if (hasAmarillo) amarillo += 1;
    }

    return { total: horseIds.length, rojo, amarillo };
  }

  /**
   * Gastos: total del mes actual, total de los últimos 12 meses, desglose por
   * categoría y serie mensual. Generaliza el SQL de horses.service getFinancialSummary
   * a todos los caballos del user/org.
   */
  private async buildExpenses(horseIds: string[]): Promise<ReportSummary['expenses']> {
    if (horseIds.length === 0) {
      return { month_total: 0, year_total: 0, by_category: [], monthly: [] };
    }

    const monthlyRows: { month: string; total: string }[] = await this.horseRepo.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount)::text AS total
         FROM events
        WHERE horse_id = ANY($1::uuid[])
          AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
          AND date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY month
        ORDER BY month DESC`,
      [horseIds],
    );

    const monthRow: { total: string }[] = await this.horseRepo.query(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM events
        WHERE horse_id = ANY($1::uuid[])
          AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
          AND date >= date_trunc('month', CURRENT_DATE)`,
      [horseIds],
    );

    const byCategory: { category: string; total: string }[] = await this.horseRepo.query(
      `SELECT COALESCE(expense_category, 'otros') AS category, SUM(amount)::text AS total
         FROM events
        WHERE horse_id = ANY($1::uuid[])
          AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
          AND date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY category
        ORDER BY total DESC`,
      [horseIds],
    );

    const monthly = monthlyRows.map((r) => ({ month: r.month, total: parseFloat(r.total) }));
    const year_total = monthly.reduce((acc, m) => acc + m.total, 0);
    const month_total = parseFloat(monthRow[0]?.total ?? '0');

    return {
      month_total: parseFloat(month_total.toFixed(2)),
      year_total: parseFloat(year_total.toFixed(2)),
      by_category: byCategory.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
      monthly,
    };
  }

  /**
   * Próximos vencimientos: turnos futuros no completados y registros médicos con
   * next_due dentro de los próximos 30 días.
   */
  private async buildUpcoming(horseIds: string[]): Promise<ReportSummary['upcoming']> {
    if (horseIds.length === 0) return { appointments: [], medical: [] };

    const appointments: ReportSummary['upcoming']['appointments'] = await this.horseRepo.query(
      `SELECT a.id, a.horse_id, h.name AS horse_name, a.type, a.title, a.scheduled_at
         FROM service_appointments a
         JOIN horses h ON h.id = a.horse_id
        WHERE a.horse_id = ANY($1::uuid[])
          AND a.scheduled_at >= NOW() AND a.completed = false
        ORDER BY a.scheduled_at ASC
        LIMIT 10`,
      [horseIds],
    );

    const medical: ReportSummary['upcoming']['medical'] = await this.horseRepo.query(
      `SELECT m.id, m.horse_id, h.name AS horse_name, m.name, m.type, m.next_due
         FROM medical_records m
         JOIN horses h ON h.id = m.horse_id
        WHERE m.horse_id = ANY($1::uuid[])
          AND m.next_due IS NOT NULL
          AND m.next_due >= CURRENT_DATE
          AND m.next_due <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY m.next_due ASC
        LIMIT 20`,
      [horseIds],
    );

    return { appointments, medical };
  }
}
