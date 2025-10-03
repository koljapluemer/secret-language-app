import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import { getRandomSeenVocabFromImmersionResource } from './getRandomVocabBasedOnImmersionResource';
import { randomFromArray } from '@/shared/utils/arrayUtils';
import { useToast } from '@/shared/toasts';

export async function getRandomDueVocabFromRandomValidImmersionResource(
  resourceRepo: ResourceRepoContract,
  vocabRepo: VocabRepoContract,
  languageCodes: string[],
  vocabBlockList?: string[]
): Promise<VocabData | null> {
  const toast = useToast();
  try {
    const resources = await resourceRepo.getValidImmersionResources(languageCodes);
    if (resources.length === 0) return null;
    
    const resource = randomFromArray(resources);
    if (!resource) return null;

    return await getRandomSeenVocabFromImmersionResource(resourceRepo, vocabRepo, resource.id, vocabBlockList);
  } catch (error) {
    toast.error(`Error getting random due vocab from random valid immersion resource: ${String(error)}`);
    return null;
  }
}
