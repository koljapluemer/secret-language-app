const STORAGE_KEY = 'linguanodon:tree-state';

export interface VocabItemState {
  expanded: boolean;
  translations: boolean;
  glosses: boolean;
}

export interface GoalTreeState {
  goal: boolean;
}

export interface ResourceTreeState {
  resource: boolean;
  expandedVocabItems?: {
    [vocabId: string]: VocabItemState;
  };
}

interface TreeStateData {
  goals: {
    [situationId: string]: {
      [goalId: string]: GoalTreeState;
    };
  };
  resources: {
    [situationId: string]: {
      [resourceId: string]: ResourceTreeState;
    };
  };
}

function getStorageData(): TreeStateData {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { goals: {}, resources: {} };
  } catch {
    return { goals: {}, resources: {} };
  }
}

function setStorageData(data: TreeStateData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

// Goal tree state functions
export function getTreeState(situationId: string, goalId: string): GoalTreeState | null {
  const data = getStorageData();
  return data.goals[situationId]?.[goalId] || null;
}

export function setTreeState(
  situationId: string,
  goalId: string,
  path: 'goal',
  isOpen: boolean
): void {
  const data = getStorageData();

  if (!data.goals[situationId]) {
    data.goals[situationId] = {};
  }

  if (!data.goals[situationId][goalId]) {
    data.goals[situationId][goalId] = {
      goal: false
    };
  }

  data.goals[situationId][goalId][path] = isOpen;
  setStorageData(data);
}

export function getDefaultTreeState(): GoalTreeState {
  return {
    goal: false
  };
}

// Resource tree state functions
export function getResourceTreeState(situationId: string, resourceId: string): ResourceTreeState | null {
  const data = getStorageData();
  return data.resources[situationId]?.[resourceId] || null;
}

export function setResourceTreeState(
  situationId: string,
  resourceId: string,
  path: 'resource',
  isOpen: boolean
): void {
  const data = getStorageData();

  if (!data.resources[situationId]) {
    data.resources[situationId] = {};
  }

  if (!data.resources[situationId][resourceId]) {
    data.resources[situationId][resourceId] = {
      resource: false,
      expandedVocabItems: {}
    };
  }

  data.resources[situationId][resourceId][path] = isOpen;
  setStorageData(data);
}

export function getDefaultResourceTreeState(): ResourceTreeState {
  return {
    resource: false,
    expandedVocabItems: {}
  };
}

export function getResourceVocabState(situationId: string, resourceId: string, vocabId: string): VocabItemState | null {
  const data = getStorageData();
  return data.resources[situationId]?.[resourceId]?.expandedVocabItems?.[vocabId] || null;
}

export function setResourceVocabState(
  situationId: string,
  resourceId: string,
  vocabId: string,
  path: keyof VocabItemState,
  isOpen: boolean
): void {
  const data = getStorageData();

  if (!data.resources[situationId]) {
    data.resources[situationId] = {};
  }

  if (!data.resources[situationId][resourceId]) {
    data.resources[situationId][resourceId] = {
      resource: false,
      expandedVocabItems: {}
    };
  }

  if (!data.resources[situationId][resourceId].expandedVocabItems) {
    data.resources[situationId][resourceId].expandedVocabItems = {};
  }

  if (!data.resources[situationId][resourceId].expandedVocabItems![vocabId]) {
    data.resources[situationId][resourceId].expandedVocabItems![vocabId] = {
      expanded: false,
      translations: false,
      glosses: false
    };
  }

  data.resources[situationId][resourceId].expandedVocabItems![vocabId][path] = isOpen;
  setStorageData(data);
}
