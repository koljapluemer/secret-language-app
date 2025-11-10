export interface GoalData {
  id: string;
  language: string;
  title: string;
  translations: string[]; // ids of TranslationData
  factCards: string[]; // Ids of FactCardData
  notes: string[]; // Ids of NoteData

  lastShownAt?: Date;

  origins: string[] // id of set, or the string "user-added"

  isAchieved: boolean;
}