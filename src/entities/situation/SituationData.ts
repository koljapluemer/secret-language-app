export interface SituationData {
  id: string;
  description: string;
  goals: string[]; // ids of GoalData
  immersionResources: string[]; // ids of ResourceData
  relevantForLanguages: string[]; // ISO 3-character language codes
}
