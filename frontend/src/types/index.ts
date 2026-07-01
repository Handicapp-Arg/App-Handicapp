export interface Role {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: string;
  plan?: string;
  phone?: string | null;
  whatsapp_opt_in?: boolean;
  avatar_url?: string | null;
  avatar_color?: string | null;
  cover_url?: string | null;
  vet_license_number?: string | null;
  vet_province?: string | null;
  vet_license_url?: string | null;
  vet_license_status?: string;
}

export interface CatalogItem {
  id: string;
  type: string;
  name: string;
  created_at: string;
}

export interface HorseOwnership {
  id: string;
  user_id: string;
  percentage: number | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export type PedigreeStatus = 'unverified' | 'pending' | 'partial' | 'verified' | 'disputed';

export interface Horse {
  id: string;
  name: string;
  birth_date: string | null;
  image_url: string | null;
  owner_id: string;
  establishment_id: string | null;
  microchip: string | null;
  breed_id: string | null;
  activity_id: string | null;
  registration_number: string | null;
  registration_source: 'studbook_ar' | 'sra' | 'accc' | 'aqha' | 'other' | null;
  pedigree_status: PedigreeStatus;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  height_cm: number | null;
  horse_record_id: string | null;
  horse_record?: HorseRecord | null;
  owner?: User;
  establishment?: User;
  breed?: CatalogItem;
  activity?: CatalogItem;
  events?: Event[];
  co_owners?: HorseOwnership[];
  public_token: string | null;
  created_at: string;
}

// ─── Global Horse Records ──────────────────────────────────────────────────

export type ScrapeStatus = 'pending' | 'scraping' | 'done' | 'failed' | 'skipped';
export type OwnershipStatus = 'unverified' | 'pending_claim' | 'verified' | 'disputed';
export type ClaimStatus = 'pending' | 'auto_approved' | 'approved' | 'rejected';

export interface HorseRecord {
  id: string;
  name: string;
  birth_year: number | null;
  birth_date: string | null;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  breed: string | null;
  country_code: string | null;
  registration_number: string | null;
  registration_source: string | null;
  source_url: string | null;
  sire_id: string | null;
  sire?: HorseRecord | null;
  sire_name: string | null;
  dam_id: string | null;
  dam?: HorseRecord | null;
  dam_name: string | null;
  verified_owner_id: string | null;
  verified_owner?: Pick<User, 'id' | 'name' | 'email'> | null;
  verified_at: string | null;
  ownership_status: OwnershipStatus;
  scrape_status: ScrapeStatus;
  data_confidence: 'high' | 'medium' | 'low' | null;
  created_at: string;
  updated_at: string;
}

export interface HorseRecordNode {
  id: string | null;
  name: string;
  birth_year: number | null;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  country_code: string | null;
  ownership_status: OwnershipStatus;
  verified_owner: Pick<User, 'id' | 'name'> | null;
  sire: HorseRecordNode | null;
  dam: HorseRecordNode | null;
}

export interface HorseOwnershipClaim {
  id: string;
  horse_record_id: string;
  horse_record?: HorseRecord;
  claimant_id: string;
  claimant?: Pick<User, 'id' | 'name' | 'email'>;
  registration_number: string | null;
  microchip: string | null;
  claimed_birth_date: string | null;
  document_url: string | null;
  match_score: number | null;
  matched_fields: string[] | null;
  status: ClaimStatus;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ValidationSource = 'studbook_ar' | 'sra' | 'pedigreequery' | 'manual_admin';
export type ValidationStatus = 'pending' | 'validated' | 'failed' | 'partial' | 'disputed';
export type DocumentType = 'official_certificate' | 'dna_certificate' | 'transfer_document' | 'other';

export interface PedigreeValidation {
  id: string;
  pedigree_id: string;
  source: ValidationSource;
  status: ValidationStatus;
  validated_fields: Record<string, boolean>;
  discrepancies: Record<string, { expected: string; found: string }> | null;
  validated_by: string | null;
  validated_at: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface PedigreeDocument {
  id: string;
  pedigree_id: string;
  type: DocumentType;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

export interface PedigreeNode {
  id?: string;
  name: string;
  in_system: boolean;
  pedigree_status?: PedigreeStatus;
  registration_number?: string | null;
  sire?: PedigreeNode | null;
  dam?: PedigreeNode | null;
}

export interface Pedigree {
  id: string;
  horse_id: string;
  sire_id: string | null;
  dam_id: string | null;
  sire_name: string | null;
  dam_name: string | null;
  sire_registration_number: string | null;
  dam_registration_number: string | null;
  paternal_grandsire_name: string | null;
  paternal_granddam_name: string | null;
  maternal_grandsire_name: string | null;
  maternal_granddam_name: string | null;
  sire?: Horse | null;
  dam?: Horse | null;
  validations?: PedigreeValidation[];
  documents?: PedigreeDocument[];
  created_at: string;
  updated_at: string;
}

export enum EventType {
  SALUD = 'salud',
  ENTRENAMIENTO = 'entrenamiento',
  TAREA = 'tarea',
  GASTO = 'gasto',
  NOTA = 'nota',
}

export interface EventPhoto {
  id: string;
  url: string;
  public_id: string;
  file_type: 'image' | 'pdf' | 'video';
  caption: string | null;
  event_id: string;
  created_at: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Event {
  id: string;
  type: EventType;
  description: string;
  amount: number | null;
  currency: 'ARS' | 'USD';
  date: string;
  event_time: string | null;
  author_id: string | null;
  is_public: boolean;
  feed_post_id: string | null;
  recurrence_type: RecurrenceType;
  recurrence_end: string | null;
  recurrence_parent_id: string | null;
  horse_id: string;
  horse?: Horse;
  photos?: EventPhoto[];
  created_at: string;
}

export type AuctionType = 'venta_directa' | 'remate';
export type AuctionStatus = 'draft' | 'active' | 'paused' | 'closed' | 'sold' | 'cancelled';
export type AuctionCurrency = 'ARS' | 'USD';
export type BidStatus = 'active' | 'outbid' | 'won' | 'cancelled';

export interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder?: Pick<User, 'id' | 'name' | 'email' | 'avatar_color'>;
  amount: number;
  currency: AuctionCurrency;
  status: BidStatus;
  notes: string | null;
  created_at: string;
}

export interface Auction {
  id: string;
  horse_id: string;
  horse?: Horse;
  seller_id: string;
  seller?: Pick<User, 'id' | 'name' | 'email' | 'avatar_color'>;
  type: AuctionType;
  title: string;
  description: string | null;
  asking_price: number | null;
  starting_bid: number | null;
  reserve_price: number | null;
  bid_increment: number | null;
  currency: AuctionCurrency;
  auction_start: string | null;
  auction_end: string | null;
  status: AuctionStatus;
  winner_id: string | null;
  winner?: Pick<User, 'id' | 'name' | 'email'> | null;
  winning_price: number | null;
  closed_at: string | null;
  has_health_cert: boolean;
  has_ownership_docs: boolean;
  health_cert_url: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  location: string | null;
  platform_fee_pct: number;
  bids?: AuctionBid[];
  bid_count?: number;
  top_bid?: number | null;
  watching?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  recipient_id: string;
  event_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export type PostType = 'general' | 'horse_update' | 'announcement';

export interface FeedPost {
  id: string;
  author_id: string;
  author?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'vet_license_status' | 'avatar_color' | 'avatar_url'>;
  horse_id: string | null;
  horse?: { id: string; name: string } | null;
  content: string;
  type: PostType;
  image_urls: string[] | null;
  video_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  liked_by_me?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'vet_license_status' | 'avatar_color' | 'avatar_url'>;
  content: string;
  created_at: string;
}
