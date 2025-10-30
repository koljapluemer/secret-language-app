import type { DownloadProgress } from '@/entities/remote-sets/types';

export interface DownloadAndPracticeOptions {
  language: string;
  setName: string;
  onDownloadStart?: () => void;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  onDownloadComplete?: () => void;
  onError?: (error: string) => void;
}
