import type { Router } from 'vue-router';
import { RemoteSetService } from '@/entities/remote-sets/RemoteSetService';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import { selectedLanguages, selectedSets } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import type { DownloadAndPracticeOptions } from './types';

// Re-export for convenience
export type { DownloadAndPracticeOptions } from './types';

export class DownloadAndPracticeService {
  constructor(
    private remoteSetService: RemoteSetService,
    private localSetRepo: LocalSetRepoContract,
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

      // Set practice filters to only this specific set and language
      const localSets = await this.localSetRepo.getAllLocalSets();
      const targetSet = localSets.find(s => s.name === (metadata?.title || setName));

      if (targetSet) {
        selectedSets.value = [targetSet.id];
        selectedLanguages.value = [language];
      }

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