export interface TranslationData {
  id: string;
  content: string;
  priority: number;
  notes: string[]; // Ids of `NoteData`

  origins: string[] // id of set, or the string "user-added"

  // Internal merge tracking
  _mergeChecked?: boolean // Has background merge service processed this item?
} 