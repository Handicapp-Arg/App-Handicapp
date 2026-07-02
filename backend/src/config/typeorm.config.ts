import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { HorseDocument } from '../horses/horse-document.entity';
import { WeightRecord } from '../horses/weight-record.entity';
import { ServiceAppointment } from '../agenda/service-appointment.entity';
import { DailyRoutine } from '../routines/daily-routine.entity';
import { ActivityPhoto } from '../activity-photos/activity-photo.entity';
import { Bill } from '../billing/bill.entity';
import { TrainingMetrics } from '../events/training-metrics.entity';
import { EventComment } from '../events/event-comment.entity';
import { HorseMovement } from '../horses/horse-movement.entity';
import { Contract } from '../contracts/contract.entity';
import { ShareToken } from '../horses/share-token.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { Event } from '../events/event.entity';
import { EventPhoto } from '../events/event-photo.entity';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationSetting } from '../notifications/notification-setting.entity';
import { CatalogItem } from '../catalog-items/catalog-item.entity';
import { BoardingRequest } from '../boarding-requests/boarding-request.entity';
import { Organization } from '../organizations/organization.entity';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { OrganizationInvitation } from '../organizations/organization-invitation.entity';
import { OrganizationJoinRequest } from '../organizations/organization-join-request.entity';
import { Pedigree, PedigreeValidation, PedigreeDocument } from '../pedigree/entities/pedigree.entity';
import { HorseRecord } from '../horse-records/horse-record.entity';
import { HorseOwnershipClaim } from '../horse-records/horse-ownership-claim.entity';
import { Auction } from '../auctions/auction.entity';
import { AuctionBid } from '../auctions/auction-bid.entity';
import { AuctionWatch } from '../auctions/auction-watch.entity';
import { FeedPost } from '../feed/feed-post.entity';
import { FeedLike } from '../feed/feed-like.entity';
import { FeedComment } from '../feed/feed-comment.entity';
import { Plan } from '../plans/plan.entity';
import { Subscription } from '../payments/subscription.entity';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'handicapp',
  entities: [User, RefreshToken, Horse, HorseUser, HorseDocument, HorseMovement, WeightRecord, ServiceAppointment, DailyRoutine, ActivityPhoto, Bill, TrainingMetrics, EventComment, Contract, ShareToken, MedicalRecord, Event, EventPhoto, Permission, Role, Notification, NotificationSetting, CatalogItem, BoardingRequest, Organization, OrganizationMember, OrganizationInvitation, OrganizationJoinRequest, Pedigree, PedigreeValidation, PedigreeDocument, HorseRecord, HorseOwnershipClaim, Auction, AuctionBid, AuctionWatch, FeedPost, FeedLike, FeedComment, Plan, Subscription],
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
  dropSchema: false,

  // 👇🔥 ESTO ES LO QUE TE FALTABA
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});