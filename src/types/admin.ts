export interface AdminSettings {
  id: string;
  key: string;
  value: string | boolean | number;
  updated_at: string;
}

export interface OverlayContent {
  id: string;
  position: 'board-cover' | 'top-banner' | 'bottom-banner' | 'corner-badge';
  content_type: 'image' | 'video';
  url: string;
  is_active: boolean;
  display_start: string | null;
  display_end: string | null;
  created_at: string;
  updated_at: string;
  title?: string;
}

export type AdPlacement =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'left-column' | 'right-column' | 'top-row' | 'bottom-row'
  | 'whole-board';

export const AD_PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'left-column', label: 'Left Column' },
  { value: 'right-column', label: 'Right Column' },
  { value: 'top-row', label: 'Top Row' },
  { value: 'bottom-row', label: 'Bottom Row' },
  { value: 'whole-board', label: 'Whole Board Area' },
];

export type CropRatio = 'full-square' | 'horizontal-half' | 'vertical-half';

export function placementToRatio(p: AdPlacement): CropRatio {
  if (p === 'top-row' || p === 'bottom-row') return 'horizontal-half';
  if (p === 'left-column' || p === 'right-column') return 'vertical-half';
  return 'full-square';
}

export type AdPaymentMethod = 'paypal' | 'skrill' | 'volet' | 'paypeer' | 'crypto';
export type CryptoCurrency = 'btc' | 'eth' | 'usdt' | 'usdc' | 'sol';

export interface AdCampaign {
  id: string;
  overlay_id: string;
  title: string;
  placement: AdPlacement;
  crop_ratio: CropRatio;
  crop_data: { x: number; y: number; w: number; h: number } | null;
  age_target: 'above_12' | 'above_16' | 'above_18' | 'all';
  country_targets: string[];
  contest_targets: string[];
  runtime_minutes: number;
  served_seconds?: number;
  reserved_slot_ids?: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'pending_payment' | 'pending_approval' | 'live' | 'expired';
  payment_method: AdPaymentMethod | 'load' | 'reserved_time' | null;
  crypto_currency: CryptoCurrency | null;
  from_address: string | null;
  amount: number;
  link_url?: string | null;
  payment_status: 'pending' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  expires_at: string | null;
  targets: string[];
  created_at: string;
}

export interface ContestWithApproval {
  id: string;
  name: string;
  description: string | null;
  passcode_hash: string;
  duration_minutes: number;
  participant_limit: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'expired';
  approval_status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  participant_count?: number;
}

export interface GameAnalytics {
  totalGames: number;
  todayGames: number;
  weekGames: number;
  activeContests: number;
  uniquePlayers: number;
  averageScore: number;
  hourlyDistribution: { hour: number; count: number }[];
}

export type AnalyticsMetric =
  | 'participants'
  | 'match'
  | 'rounds'
  | 'runtime'
  | 'contests'
  | 'ads'
  | 'country';

export const ANALYTICS_METRICS: { value: AnalyticsMetric; label: string }[] = [
  { value: 'participants', label: 'Participants' },
  { value: 'match', label: 'Match' },
  { value: 'rounds', label: 'Rounds' },
  { value: 'runtime', label: 'Amount of Runtime' },
  { value: 'contests', label: 'Contests' },
  { value: 'ads', label: 'Ads' },
  { value: 'country', label: 'Country' },
];

export type ChartType = 'bar' | 'line';

export interface AnalyticsFilters {
  contests: string[];
  countries: string[];
  ageGroups: string[];
  ads: string[];
}

export const AGE_GROUP_OPTIONS = [
  { value: 'above_12', label: 'Above 12' },
  { value: 'above_16', label: 'Above 16' },
  { value: 'above_18', label: 'Above 18' },
];

export type AnnouncementTarget = 
  | 'all'
  | 'main-menu'
  | 'single-player-setup'
  | 'single-player-game'
  | 'multiplayer-game';

export const ANNOUNCEMENT_TARGETS: { value: AnnouncementTarget; label: string }[] = [
  { value: 'all', label: 'All Screens' },
  { value: 'main-menu', label: 'Main Menu' },
  { value: 'single-player-setup', label: 'Single Player Setup' },
  { value: 'single-player-game', label: 'Single Player Game' },
  { value: 'multiplayer-game', label: 'Multiplayer Game' },
];
