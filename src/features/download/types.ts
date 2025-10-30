export interface DownloadAndPracticeOptions {
  language: string;
  setName: string;
  onDownloadStart?: () => void;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  onDownloadComplete?: () => void;
  onError?: (error: string) => void;
}


export interface RemoteSetInfo {
  name: string;
  title?: string;
}

export interface DownloadProgress {
  phase: string;
  current: number;
  total: number;
  percentage: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
}
