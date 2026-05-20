export enum UploadStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum Platform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE_SHORTS = 'youtube_shorts',
}

export enum QualityBand {
  PASS = 'pass',
  WARN = 'warn',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.TWITTER]: 'Twitter / X',
  [Platform.LINKEDIN]: 'LinkedIn',
  [Platform.INSTAGRAM]: 'Instagram',
  [Platform.TIKTOK]: 'TikTok',
  [Platform.YOUTUBE_SHORTS]: 'YouTube Shorts',
};

export const ALL_PLATFORMS: Platform[] = [
  Platform.TWITTER,
  Platform.LINKEDIN,
  Platform.INSTAGRAM,
  Platform.TIKTOK,
  Platform.YOUTUBE_SHORTS,
];

export interface Upload {
  _id: string;
  user_id: string;
  original_name: string;
  s3Key: string;
  hash: string;
  mime_type: string;
  file_size: number;
  platforms: Platform[];
  status: UploadStatus;
  quality_score: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadsPage {
  uploads: Upload[];
  nextCursor: string | null;
}

export interface CreditEstimate {
  transcriptionCost: number;
  storageCost: number;
  generationCost: number;
  total: number;
}

export interface AnalyseResult {
  score: number;
  band: QualityBand;
  reason: string;
  analysisToken: string;
  creditEstimate: CreditEstimate;
}
