import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import { useToast } from '@/shared/toasts';
import type { Task } from '@/pages/practice/Task';
import { generateAddImageToVocab } from '@/pages/practice/tasks/task-add-image-to-vocab/generate';

export async function generateInsertImagesTask(
  vocabRepo: VocabRepoContract,
  languageCodes: string[],
  blockList?: string[],
  setsToAvoid?: string[]
): Promise<Task | null> {
  const toast = useToast();
  try {
    // Get vocab that needs images
    const vocabList = await vocabRepo.getVocabNeedingImages(languageCodes, blockList, setsToAvoid);
    
    if (vocabList.length === 0) {
      return null;
    }
    
    // Pick the first vocab that needs images
    const vocab = vocabList[0];
    
    // Generate add-image task
    return generateAddImageToVocab(vocab);
    
  } catch (error) {
    toast.error(`Error generating insert images task: ${String(error)}`);
    return null;
  }
}