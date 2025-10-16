import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateVocabTryToRemember } from '@/tasks/task-vocab-try-to-remember/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomVocabTryToRememberTask({
  vocabRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!vocabRepo) return null;

  try {
    // Get unseen vocab that has both content and translations (excluding sentences for try-to-remember tasks)
    const allUnseenVocab = await vocabRepo.getRandomUnseenVocabWithContentAndTranslations(languageCodes, 10);
    const vocabItems = allUnseenVocab.filter(vocab => vocab.consideredSentence !== true);
    
    if (vocabItems.length === 0) return null;
    
    // Return the first valid vocab item
    return generateVocabTryToRemember(vocabItems[0]);
  } catch (error) {
    toast.error(`Error generating vocab try to remember task: ${String(error)}`);
    return null;
  }
}