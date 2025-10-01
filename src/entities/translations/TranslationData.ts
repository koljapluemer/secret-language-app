export interface TranslationData {
  uid: string;
  content: string;
  priority: number;
  notes: string[]; // uids of `NoteData`

  origins: string[] // uid of set, or the string "user-added"

  // Internal merge tracking
  _mergeChecked?: boolean // Has background merge service processed this item?
} 