const STORAGE_KEY = 'linguanodon:tree-state';

export interface VocabItemState {
  expanded: boolean;
  translations: boolean;
  glosses: boolean;
}

export interface GoalTreeState {
  goal: boolean;
  vocab: boolean;
  translations: boolean;
  glosses: boolean;
  expandedVocabItems?: {
    [vocabId: string]: VocabItemState;
  };
}

interface TreeStateData {
  [situationId: string]: {
    [goalId: string]: GoalTreeState;
  };
}

function getStorageData(): TreeStateData {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setStorageData(data: TreeStateData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

export function getTreeState(situationId: string, goalId: string): GoalTreeState | null {
  const data = getStorageData();
  return data[situationId]?.[goalId] || null;
}

export function setTreeState(
  situationId: string,
  goalId: string,
  path: 'goal' | 'vocab' | 'translations' | 'glosses',
  isOpen: boolean
): void {
  const data = getStorageData();

  if (!data[situationId]) {
    data[situationId] = {};
  }

  if (!data[situationId][goalId]) {
    data[situationId][goalId] = {
      goal: false,
      vocab: false,
      translations: false,
      glosses: false,
      expandedVocabItems: {}
    };
  }

  data[situationId][goalId][path] = isOpen;
  setStorageData(data);
}

export function getDefaultTreeState(): GoalTreeState {
  return {
    goal: false,
    vocab: false,
    translations: false,
    glosses: false,
    expandedVocabItems: {}
  };
}

export function getVocabState(situationId: string, goalId: string, vocabId: string): VocabItemState | null {
  const data = getStorageData();
  return data[situationId]?.[goalId]?.expandedVocabItems?.[vocabId] || null;
}

export function setVocabState(
  situationId: string,
  goalId: string,
  vocabId: string,
  path: keyof VocabItemState,
  isOpen: boolean
): void {
  const data = getStorageData();

  if (!data[situationId]) {
    data[situationId] = {};
  }

  if (!data[situationId][goalId]) {
    data[situationId][goalId] = {
      goal: false,
      vocab: false,
      translations: false,
      glosses: false,
      expandedVocabItems: {}
    };
  }

  if (!data[situationId][goalId].expandedVocabItems) {
    data[situationId][goalId].expandedVocabItems = {};
  }

  if (!data[situationId][goalId].expandedVocabItems![vocabId]) {
    data[situationId][goalId].expandedVocabItems![vocabId] = {
      expanded: false,
      translations: false,
      glosses: false
    };
  }

  data[situationId][goalId].expandedVocabItems![vocabId][path] = isOpen;
  setStorageData(data);
}
