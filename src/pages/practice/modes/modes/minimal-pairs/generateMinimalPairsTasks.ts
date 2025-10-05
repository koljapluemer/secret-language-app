import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { Task } from '@/pages/practice/Task';
import { generateVocabChooseFromSound } from '@/pages/practice/tasks/task-vocab-choose-from-sound/generate';
import { useUsedVocabTracker } from '@/features/track/useUsedVocabTracker';
import { useToast } from '@/shared/toasts';

export async function generateMinimalPairsTask(
  vocabRepo: VocabRepoContract,
  languageCodes: string[],
  blockList?: string[]
): Promise<Task | null> {
  try {
    const { getLastUsedVocabId, addUsedVocab } = useUsedVocabTracker();
    
    // Only block the last used vocab
    const lastUsed = getLastUsedVocabId();
    const combinedBlockList = lastUsed ? [...(blockList || []), lastUsed] : (blockList || []);
    
    // Get a random vocab that meets minimal pairs criteria and wasn't just used
    const vocab = await vocabRepo.getRandomDueOrUnseenVocabForMinimalPairs(languageCodes, combinedBlockList);
    
    if (!vocab) {
      return null;
    }
    
    // Track this vocab as used (only the main vocab, not the distractor)
    addUsedVocab(vocab.id);
    
    // Generate the vocab-choose-from-sound task 
    return generateVocabChooseFromSound(vocab);
    
  } catch (error) {
    const toast = useToast();
    toast.error(`Error generating Minimal Pairs task: ${String(error)}`);
    return null;
  }
}