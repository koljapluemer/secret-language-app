const STORAGE_KEY = 'linguanodon:tree-state';

export interface GoalTreeState {
  goal: boolean;
  vocab: boolean;
  translations: boolean;
  glosses: boolean;
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
  path: keyof GoalTreeState,
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
      glosses: false
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
    glosses: false
  };
}
