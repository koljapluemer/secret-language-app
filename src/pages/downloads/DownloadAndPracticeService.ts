import type { Router } from 'vue-router';
import { UnifiedRemoteSetService, type DownloadProgress } from './UnifiedRemoteSetService';

export interface DownloadAndPracticeOptions {
  language: string;
  setName: string;
  onDownloadStart?: () => void;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  onDownloadComplete?: () => void;
  onError?: (error: string) => void;
}

export class DownloadAndPracticeService {
  constructor(
    private remoteSetService: UnifiedRemoteSetService,
    private router: Router
  ) {}

  /**
   * Downloads a set and immediately starts practice in the preferred mode
   */
  async downloadAndStartPractice(options: DownloadAndPracticeOptions): Promise<void> {
    const { language, setName, onDownloadStart, onDownloadProgress, onDownloadComplete, onError } = options;

    try {
      onDownloadStart?.();

      // Check if already downloaded
      const isAlreadyDownloaded = await this.remoteSetService.isSetDownloaded(setName);

      if (!isAlreadyDownloaded) {
        await this.remoteSetService.downloadSet(language, setName, {
          onProgress: onDownloadProgress
        });
      }

      // Load metadata to get preferred practice mode
      const metadata = await this.remoteSetService.getSetMetadata(language, setName);

      onDownloadComplete?.();

      // Navigate to preferred practice mode or default
      const practiceMode = metadata?.preferredMode || 'practice-mode-sisyphos';
      this.router.push({ name: practiceMode });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download and start practice';
      onError?.(errorMessage);
      throw err;
    }
  }

  /**
   * Downloads a set without starting practice
   */
  async downloadOnly(options: Pick<DownloadAndPracticeOptions, 'language' | 'setName' | 'onDownloadStart' | 'onDownloadProgress' | 'onDownloadComplete' | 'onError'>): Promise<void> {
    const { language, setName, onDownloadStart, onDownloadProgress, onDownloadComplete, onError } = options;
    
    try {
      onDownloadStart?.();
      await this.remoteSetService.downloadSet(language, setName, {
        onProgress: onDownloadProgress
      });
      onDownloadComplete?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download set';
      onError?.(errorMessage);
      throw err;
    }
  }

}