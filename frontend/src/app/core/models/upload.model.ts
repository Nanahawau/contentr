export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube_shorts';

export const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
};

export const ALL_PLATFORMS: Platform[] = ['twitter', 'linkedin', 'instagram', 'tiktok', 'youtube_shorts'];

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
  createdAt: string;
  updatedAt: string;
}

export interface UploadsPage {
  uploads: Upload[];
  nextCursor: string | null;
}
