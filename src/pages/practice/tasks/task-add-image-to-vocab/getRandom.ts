import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateAddImageToVocab } from '@/pages/practice/tasks/task-add-image-to-vocab/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomAddImageToVocabTask({
  vocabRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!vocabRepo) return null;

  try {
    // Get vocab that needs images
    const vocabWithoutImages = await vocabRepo.getVocabNeedingImages(languageCodes);
    
    if (vocabWithoutImages.length === 0) return null;
    
    // Return task for first vocab item
    return generateAddImageToVocab(vocabWithoutImages[0]);
  } catch (error) {
    toast.error(`Error generating add image to vocab task: ${String(error)}`);
    return null;
  }
}