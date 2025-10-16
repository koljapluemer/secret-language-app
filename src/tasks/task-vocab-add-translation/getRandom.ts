import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateAddTranslation } from '@/tasks/task-vocab-add-translation/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomAddTranslationTask({
  vocabRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!vocabRepo) return null;

  try {
    const vocab = await vocabRepo.getRandomVocabWithNoTranslationsInLanguages(languageCodes);
    if (!vocab) return null;
    return generateAddTranslation(vocab);
  } catch (error) {
    toast.error(`Error generating add translation task: ${String(error)}`);
    return null;
  }
}


