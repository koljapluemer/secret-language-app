export interface GoalData {
  id: string;
  language: string;
  title: string;
  doNotPractice?: boolean;
  subGoals: string[]; // array of Ids of other goals
  vocab: string[]; // Ids of Vocab
  factCards: string[]; // Ids of FactCardData
  notes: string[]; // Ids of NoteData

  prio?: number;

  lastShownAt?: Date;

  origins: string[] // id of set, or the string "user-added"

  finishedAddingSubGoals: boolean;
  finishedAddingMilestones: boolean;
  finishedAddingKnowledge: boolean;
  milestones: Record<string, boolean>;
  
  isAchieved: boolean;
}