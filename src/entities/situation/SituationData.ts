export interface SituationData {
  id: string;
  description: string;
  vocabs: string[]; // ids of vocab items
  glosses: string[]; // ids of glosses
  translations: string[]; // ids of translations
}
