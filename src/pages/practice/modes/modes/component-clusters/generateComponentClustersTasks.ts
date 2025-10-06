import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';
import { getRandomGeneratedTaskForVocab } from '@/pages/practice/modes/utils/getRandomGeneratedTaskForVocab';
import { useToast } from '@/shared/toasts';

interface ComponentClustersState {
  currentComponent: VocabData | null;
  containerVocabQueue: VocabData[];
  phase: 'component-task' | 'container-tasks';
}

// Global state for the component clusters mode
let clusterState: ComponentClustersState = {
  currentComponent: null,
  containerVocabQueue: [],
  phase: 'component-task'
};

export async function generateComponentClustersTask(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract,
  languageCodes: string[],
  blockList?: string[]
): Promise<Task | null> {
  try {
    console.log('[ComponentClusters] generateComponentClustersTask called with:', {
      languageCodes,
      blockList,
      currentComponent: clusterState.currentComponent?.id,
      phase: clusterState.phase
    });

    // If we don't have a current component or need to pick a new one
    if (!clusterState.currentComponent) {
      console.log('[ComponentClusters] Finding new component vocab...');
      const component = await getRandomComponentVocab(
        vocabRepo,
        languageCodes,
        blockList
      );

      console.log('[ComponentClusters] Found component:', component ?
        { id: component.id, content: component.content } :
        'null'
      );

      if (!component) {
        console.log('[ComponentClusters] No component vocab available');
        return null;
      }

      clusterState.currentComponent = component;
      await initializeContainerVocabQueue(component, vocabRepo, blockList);
      clusterState.phase = 'component-task';
      console.log('[ComponentClusters] Initialized with component, starting component-task phase');
    }

    // Phase 1: Show task for the component itself
    if (clusterState.phase === 'component-task') {
      console.log('[ComponentClusters] Generating component task');
      const translations = await translationRepo.getTranslationsByIds(
        clusterState.currentComponent.translations || []
      );
      const task = await getRandomGeneratedTaskForVocab(
        clusterState.currentComponent,
        translations,
        vocabRepo
      );

      if (task) {
        console.log('[ComponentClusters] Component task generated');
        // Move to container tasks phase after this task
        clusterState.phase = 'container-tasks';
        return task;
      }

      console.log('[ComponentClusters] Failed to generate component task, moving to container tasks');
      // If we couldn't generate a task for the component, skip to containers
      clusterState.phase = 'container-tasks';
    }

    // Phase 2: Work through container vocabulary
    if (clusterState.phase === 'container-tasks') {
      console.log('[ComponentClusters] In container-tasks phase');
      const task = await getNextContainerVocabTask(vocabRepo, translationRepo);
      if (task) {
        console.log('[ComponentClusters] Container task generated');
        return task;
      }

      console.log('[ComponentClusters] No more container tasks, resetting state');
      // All container vocab done, reset for next component
      resetClusterState();
      return null;
    }

    // Fallback - reset and try again
    console.log('[ComponentClusters] Unexpected state, resetting');
    resetClusterState();
    return null;

  } catch (error) {
    const toast = useToast();
    toast.error(`Error generating component clusters task: ${String(error)}`);
    resetClusterState();
    return null;
  }
}

async function getRandomComponentVocab(
  vocabRepo: VocabRepoContract,
  languageCodes: string[],
  blockList?: string[]
): Promise<VocabData | null> {
  try {
    // Use the new repo method that finds vocab contained in at least 2 other vocab
    return await vocabRepo.getRandomDueOrUnseenVocabContainedInMultiple(
      languageCodes,
      2, // minContainers
      blockList
    );
  } catch (error) {
    const toast = useToast();
    toast.error(`Error getting random component vocab: ${String(error)}`);
    return null;
  }
}

async function initializeContainerVocabQueue(
  component: VocabData,
  vocabRepo: VocabRepoContract,
  blockList?: string[]
): Promise<void> {
  try {
    // Get all vocab that contain this component
    const containerVocab = await vocabRepo.getDueOrUnseenVocabContainingVocabId(
      component.id,
      blockList
    );

    // Store in state
    clusterState.containerVocabQueue = [...containerVocab];
    console.log('[ComponentClusters] Initialized container queue with', containerVocab.length, 'vocab');
  } catch (error) {
    const toast = useToast();
    toast.error(`Error initializing container vocab queue: ${String(error)}`);
    clusterState.containerVocabQueue = [];
  }
}

async function getNextContainerVocabTask(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract
): Promise<Task | null> {
  try {
    // Check if we have any container vocab left
    if (clusterState.containerVocabQueue.length === 0) {
      console.log('[ComponentClusters] No container vocab left in queue');
      return null;
    }

    // Pick random vocab from container list
    const randomIndex = Math.floor(Math.random() * clusterState.containerVocabQueue.length);
    const vocab = clusterState.containerVocabQueue[randomIndex];

    console.log('[ComponentClusters] Generating task for container vocab:', vocab.id);

    // Generate task for this vocab
    const translations = await translationRepo.getTranslationsByIds(vocab.translations || []);
    const task = await getRandomGeneratedTaskForVocab(vocab, translations, vocabRepo);

    if (!task) {
      // If we couldn't generate a task, remove this vocab from queue and try again
      console.log('[ComponentClusters] Failed to generate task, removing vocab and retrying');
      clusterState.containerVocabQueue.splice(randomIndex, 1);
      return getNextContainerVocabTask(vocabRepo, translationRepo);
    }

    return task;
  } catch (error) {
    const toast = useToast();
    toast.error(`Error getting next container vocab task: ${String(error)}`);
    return null;
  }
}

export async function removeVocabIfNotDue(
  vocabId: string,
  vocabRepo: VocabRepoContract
): Promise<void> {
  try {
    // Get fresh vocab data to check due status
    const vocab = await vocabRepo.getVocabByUID(vocabId);
    if (!vocab) return;

    // Check if vocab is still due
    const now = new Date();
    const dueDate = vocab.progress.due;
    const isStillDue = dueDate && dueDate <= now;
    const isUnseen = vocab.progress.level === -1;

    if (!isStillDue && !isUnseen) {
      // Remove from container vocab queue
      console.log('[ComponentClusters] Removing vocab from queue (no longer due/unseen):', vocabId);
      clusterState.containerVocabQueue = clusterState.containerVocabQueue.filter(v => v.id !== vocabId);
    }
  } catch (error) {
    const toast = useToast();
    toast.error(`Error checking vocab due status: ${String(error)}`);
  }
}

function resetClusterState(): void {
  console.log('[ComponentClusters] Resetting cluster state');
  clusterState = {
    currentComponent: null,
    containerVocabQueue: [],
    phase: 'component-task'
  };
}
