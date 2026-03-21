import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Event } from '../events/event.entity';
import { Permission } from '../permissions/permission.entity';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'handicapp',
  entities: [User, Horse, Event, Permission],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
});
