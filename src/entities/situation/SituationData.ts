export interface SituationData {
  id: string;
  description: string;
  goals: string[]; // ids of GoalData
  relevantForLanguages: string[]; // ISO 3-character language codes
}
