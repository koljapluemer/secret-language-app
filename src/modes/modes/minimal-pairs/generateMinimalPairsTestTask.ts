import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { Task } from '@/tasks/Task';
import { generateVocabChooseFromSound } from '@/tasks/task-vocab-choose-from-sound/generate';
import { useToast } from '@/shared/toasts';

export async function generateMinimalPairsTestTask(
  vocabRepo: VocabRepoContract,
  setId: string,
  testType: 'seen' | 'all',
  blockList?: string[]
): Promise<Task | null> {
  try {
    const includeOnlySeen = testType === 'seen';

    // Get a random vocab that meets minimal pairs criteria from the specified set
    const vocab = await vocabRepo.getRandomVocabForMinimalPairsFromSet(setId, includeOnlySeen, blockList);

    if (!vocab) {
      return null;
    }

    // Generate the vocab-choose-from-sound task
    return generateVocabChooseFromSound(vocab);

  } catch (error) {
    const toast = useToast();
    toast.error(`Error generating Minimal Pairs test task: ${String(error)}`);
    return null;
  }
}
