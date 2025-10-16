import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { useToast } from '@/shared/toasts';

interface ComponentClustersState {
  currentComponent: VocabData | null;
  containerVocabQueue: VocabData[];
  phase: 'component-task' | 'container-tasks';
  lastPracticedVocabId: string | null;
  lastPracticedOrigins: string[];
}

// Global state for the component clusters mode
let clusterState: ComponentClustersState = {
  currentComponent: null,
  containerVocabQueue: [],
  phase: 'component-task',
  lastPracticedVocabId: null,
  lastPracticedOrigins: []
};

export async function generateComponentClustersTask(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract,
  languageCodes: string[],
  blockList?: string[],
  setsToAvoid?: string[]
): Promise<Task | null> {
  try {
    console.log('[ComponentClusters] generateComponentClustersTask called with:', {
      languageCodes,
      blockList,
      currentComponent: clusterState.currentComponent?.id,
      phase: clusterState.phase
    });

    // Opportunistically serve due vocab from the same set as the last practiced item
    const reviewTask = await maybeGenerateSameSetReviewTask(
      vocabRepo,
      translationRepo,
      blockList
    );
    if (reviewTask) {
      console.log('[ComponentClusters] Serving same-set review task');
      return reviewTask;
    }

    // If we don't have a current component or need to pick a new one
    if (!clusterState.currentComponent) {
      console.log('[ComponentClusters] Finding new component vocab...');
      const component = await getRandomComponentVocab(
        vocabRepo,
        languageCodes,
        blockList,
        setsToAvoid
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
      await initializeContainerVocabQueue(component, vocabRepo, blockList, setsToAvoid);
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
        recordPracticedVocab(clusterState.currentComponent);
        return task;
      }

      console.log('[ComponentClusters] Failed to generate component task, moving to container tasks');
      // If we couldn't generate a task for the component, skip to containers
      clusterState.phase = 'container-tasks';
    }

    // Phase 2: Work through container vocabulary
    if (clusterState.phase === 'container-tasks') {
      console.log('[ComponentClusters] In container-tasks phase');
      const task = await getNextContainerVocabTask(vocabRepo, translationRepo, blockList, setsToAvoid);
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
  blockList?: string[],
  setsToAvoid?: string[]
): Promise<VocabData | null> {
  try {
    // Use the new repo method that finds vocab contained in at least 2 other vocab
    return await vocabRepo.getRandomDueOrUnseenVocabContainedInMultiple(
      languageCodes,
      2, // minContainers
      blockList,
      setsToAvoid
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
  blockList?: string[],
  setsToAvoid?: string[]
): Promise<void> {
  try {
    // Get all vocab that contain this component
    const containerVocab = await vocabRepo.getDueOrUnseenVocabContainingVocabId(
      component.id,
      blockList,
      setsToAvoid
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
  translationRepo: TranslationRepoContract,
  blockList?: string[],
  setsToAvoid?: string[]
): Promise<Task | null> {
  try {
    // Check if we have any container vocab left
    if (clusterState.containerVocabQueue.length === 0) {
      console.log('[ComponentClusters] No container vocab left in queue');
      return null;
    }

    // Build strict block list so we never repeat the last vocab
    const combinedBlockList = buildGlobalBlockList(blockList);
    const candidates = clusterState.containerVocabQueue.filter(v => !combinedBlockList.has(v.id));

    if (candidates.length === 0) {
      console.log('[ComponentClusters] No container vocab available after applying block list');
      return null;
    }

    // Pick random vocab from candidate list
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const vocab = candidates[randomIndex];
    const originalIndex = clusterState.containerVocabQueue.findIndex(v => v.id === vocab.id);

    console.log('[ComponentClusters] Generating task for container vocab:', vocab.id);

    // Generate task for this vocab
    const translations = await translationRepo.getTranslationsByIds(vocab.translations || []);
    const task = await getRandomGeneratedTaskForVocab(vocab, translations, vocabRepo);

    if (!task) {
      // If we couldn't generate a task, remove this vocab from queue and try again
      console.log('[ComponentClusters] Failed to generate task, removing vocab and retrying');
      if (originalIndex !== -1) {
        clusterState.containerVocabQueue.splice(originalIndex, 1);
      }
      return getNextContainerVocabTask(vocabRepo, translationRepo, blockList, setsToAvoid);
    }

    recordPracticedVocab(vocab);
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
    phase: 'component-task',
    lastPracticedVocabId: null,
    lastPracticedOrigins: []
  };
}

function recordPracticedVocab(vocab: VocabData) {
  clusterState.lastPracticedVocabId = vocab.id;
  if (!Array.isArray(vocab.origins)) {
    clusterState.lastPracticedOrigins = [];
    return;
  }

  const filtered = vocab.origins.filter(origin => origin && origin !== 'user-added');
  clusterState.lastPracticedOrigins = Array.from(new Set(filtered));
}

async function maybeGenerateSameSetReviewTask(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract,
  incomingBlockList: string[] | undefined,
): Promise<Task | null> {
  if (Math.random() >= 0.25) {
    return null;
  }

  const originSetIds = clusterState.lastPracticedOrigins;
  if (!originSetIds.length) {
    return null;
  }

  const eligibleSetIds = originSetIds.filter(Boolean);
  if (!eligibleSetIds.length) {
    return null;
  }

  const selectedSetId = eligibleSetIds[Math.floor(Math.random() * eligibleSetIds.length)];

  const combinedBlockList = buildGlobalBlockList(incomingBlockList);

  const dueCandidates = await vocabRepo.getRandomDueVocabFromSet(
    selectedSetId,
    10,
    Array.from(combinedBlockList)
  );

  const now = Date.now();
  const filteredCandidate = dueCandidates.find(candidate => {
    if (!candidate.progress.due) {
      return false;
    }

    const dueSource = candidate.progress.due;
    const dueTime = dueSource instanceof Date ? dueSource.getTime() : new Date(dueSource).getTime();
    if (Number.isNaN(dueTime)) {
      return false;
    }

    return candidate.progress.level > -1 &&
      dueTime <= now &&
      candidate.id !== clusterState.lastPracticedVocabId;
  });

  if (!filteredCandidate) {
    return null;
  }

  const translations = await translationRepo.getTranslationsByIds(filteredCandidate.translations || []);
  const task = await getRandomGeneratedTaskForVocab(filteredCandidate, translations, vocabRepo);
  if (!task) {
    return null;
  }

  recordPracticedVocab(filteredCandidate);
  return task;
}

function buildGlobalBlockList(incoming?: string[]): Set<string> {
  const set = new Set<string>();
  (incoming || []).forEach(id => {
    if (id) {
      set.add(id);
    }
  });
  if (clusterState.lastPracticedVocabId) {
    set.add(clusterState.lastPracticedVocabId);
  }
  if (clusterState.currentComponent) {
    set.add(clusterState.currentComponent.id);
  }
  return set;
}
