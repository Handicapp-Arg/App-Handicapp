import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { Event } from '../events/event.entity';
import { EventPhoto } from '../events/event-photo.entity';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationSetting } from '../notifications/notification-setting.entity';
import { CatalogItem } from '../catalog-items/catalog-item.entity';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'handicapp',
  entities: [User, Horse, HorseUser, Event, EventPhoto, Permission, Role, Notification, NotificationSetting, CatalogItem],
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
  dropSchema: false,

  // 👇🔥 ESTO ES LO QUE TE FALTABA
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});