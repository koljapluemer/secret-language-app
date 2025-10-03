import type { TaskCompletionData } from './TaskCompletionData';
import type { MotivationSettingsData } from './MotivationSettingsData';

export interface PracticeTrackingRepoContract {
  // Task completion events
  saveCompletionEvent(event: Omit<TaskCompletionData, 'id'>): Promise<TaskCompletionData>;
  getAllCompletionEvents(): Promise<TaskCompletionData[]>;
  getEventsByDateRange(startDate: Date, endDate: Date): Promise<TaskCompletionData[]>;
  getTodayEvents(): Promise<TaskCompletionData[]>;
  getThisWeekEvents(): Promise<TaskCompletionData[]>;
  getEventsByLanguage(languageCode: string): Promise<TaskCompletionData[]>;
  getEventsByPracticeMode(practiceMode: string): Promise<TaskCompletionData[]>;
  deleteOldEvents(olderThanDate: Date): Promise<void>;
  deleteAllEvents(): Promise<void>;

  // Motivation settings
  getSettings(): Promise<MotivationSettingsData>;
  updateSettings(settings: Partial<Omit<MotivationSettingsData, 'id'>>): Promise<MotivationSettingsData>;
}
