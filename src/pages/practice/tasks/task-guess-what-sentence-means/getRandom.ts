import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateGuessWhatSentenceMeans } from '@/pages/practice/tasks/task-guess-what-sentence-means/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomGuessWhatSentenceMeansTask({
  vocabRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!vocabRepo) return null;
  try {
    // Get unseen sentence vocab
    const vocabItems = await vocabRepo.getRandomUnseenSentenceVocab(10, languageCodes);
    
    if (vocabItems.length === 0) return null;
    
    // Get first vocab item
    for (const vocab of vocabItems) {
      return generateGuessWhatSentenceMeans(vocab);
    }
    
    return null;
  } catch (error) {
    toast.error(`Error generating guess what sentence means task: ${String(error)}`);
    return null;
  }
}