import type { PracticeTrackingRepoContract } from './PracticeTrackingRepoContract';
import type { TaskCompletionData } from './TaskCompletionData';
import type { MotivationSettingsData } from './MotivationSettingsData';
import { db } from '@/shared/database/db';
import { useToast } from '@/shared/toasts';

const SETTINGS_ID = 'motivation-settings';

export class PracticeTrackingRepo implements PracticeTrackingRepoContract {
  private toast = useToast();

  // Task completion events
  async saveCompletionEvent(event: Omit<TaskCompletionData, 'id'>): Promise<TaskCompletionData> {
    try {
      const id = await db.taskCompletions.add(event as TaskCompletionData);
      return { ...event, id } as TaskCompletionData;
    } catch (error) {
      this.toast.error(`PracticeTrackingRepo: Failed to save completion event: ${String(error)}`);
      throw error;
    }
  }

  async getAllCompletionEvents(): Promise<TaskCompletionData[]> {
    return await db.taskCompletions.toArray();
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<TaskCompletionData[]> {
    return await db.taskCompletions
      .where('timestamp')
      .between(startDate, endDate, true, false)
      .toArray();
  }

  async getTodayEvents(): Promise<TaskCompletionData[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getEventsByDateRange(today, tomorrow);
  }

  async getThisWeekEvents(): Promise<TaskCompletionData[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date();

    return await this.getEventsByDateRange(startOfWeek, endOfWeek);
  }

  async getEventsByLanguage(languageCode: string): Promise<TaskCompletionData[]> {
    return await db.taskCompletions
      .where('language_code')
      .equals(languageCode)
      .toArray();
  }

  async getEventsByPracticeMode(practiceMode: string): Promise<TaskCompletionData[]> {
    return await db.taskCompletions
      .where('practice_mode')
      .equals(practiceMode)
      .toArray();
  }

  async deleteOldEvents(olderThanDate: Date): Promise<void> {
    await db.taskCompletions
      .where('timestamp')
      .below(olderThanDate)
      .delete();
  }

  async deleteAllEvents(): Promise<void> {
    await db.taskCompletions.clear();
  }

  // Motivation settings
  async getSettings(): Promise<MotivationSettingsData> {
    const settings = await db.motivationSettings.get(SETTINGS_ID);

    if (!settings) {
      // Return default settings
      const defaultSettings: MotivationSettingsData = {
        id: SETTINGS_ID,
        dailyGoalMinutes: 30,
        weeklyGoalMinutes: 180
      };

      // Save defaults to DB
      await db.motivationSettings.add(defaultSettings);
      return defaultSettings;
    }

    return settings;
  }

  async updateSettings(settings: Partial<Omit<MotivationSettingsData, 'id'>>): Promise<MotivationSettingsData> {
    const current = await this.getSettings();
    const updated: MotivationSettingsData = {
      ...current,
      ...settings
    };

    await db.motivationSettings.put(updated);
    return updated;
  }
}
