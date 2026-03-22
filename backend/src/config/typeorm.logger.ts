import { Logger as NestLogger } from '@nestjs/common';
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

export class AppTypeOrmLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('SQL');

  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    const params = parameters?.length ? ` -- ${JSON.stringify(parameters)}` : '';
    this.logger.log(`${this.summarize(query)}${params}`);
  }

  logQueryError(error: string | Error, query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    const params = parameters?.length ? ` -- ${JSON.stringify(parameters)}` : '';
    const message = error instanceof Error ? error.message : error;
    this.logger.error(`FAILED: ${this.summarize(query)}${params}`);
    this.logger.error(`  → ${message}`);
  }

  logQuerySlow(time: number, query: string, _parameters?: any[], _queryRunner?: QueryRunner) {
    this.logger.warn(`SLOW (${time}ms): ${this.summarize(query)}`);
  }

  logSchemaBuild(_message: string) {}

  logMigration(message: string) {
    this.logger.log(`Migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    if (level === 'warn') {
      this.logger.warn(message);
    }
  }

  private summarize(query: string): string {
    const clean = query.replace(/\s+/g, ' ').trim();

    // Schema/metadata queries → ultra short
    if (clean.includes('information_schema') || clean.includes('pg_catalog') || clean.includes('pg_constraint')) {
      return '[schema sync]';
    }

    // Extract table and operation
    const match = clean.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|START|COMMIT|ROLLBACK)\b/i);
    if (!match) return clean.substring(0, 80);

    const op = match[1].toUpperCase();

    if (op === 'START') return 'BEGIN TRANSACTION';
    if (op === 'COMMIT' || op === 'ROLLBACK') return op;

    const tableMatch = clean.match(/(?:FROM|INTO|UPDATE|JOIN)\s+"?(\w+)"?/i);
    const table = tableMatch ? tableMatch[1] : '?';

    const whereMatch = clean.includes('WHERE');
    const limitMatch = clean.match(/LIMIT\s+(\d+)/i);

    let summary = `${op} ${table}`;
    if (whereMatch) summary += ' (filtered)';
    if (limitMatch) summary += ` LIMIT ${limitMatch[1]}`;

    return summary;
  }
}
