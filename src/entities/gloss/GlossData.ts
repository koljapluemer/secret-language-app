export interface GlossData {
  id: string;
  description: string;
  origins: string[]; // id of set, or the string "user-added"
  _mergeChecked?: boolean; // Has background merge service processed this item?
  descriptions: Array<{ languageCode: string; description: string }>; // multilingual descriptions
}
