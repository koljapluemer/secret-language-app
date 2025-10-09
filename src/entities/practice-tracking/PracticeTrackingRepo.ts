import type { PracticeTrackingRepoContract } from './PracticeTrackingRepoContract';
import type { TaskCompletionData } from './TaskCompletionData';
import type { MotivationSettingsData } from './MotivationSettingsData';
import { db } from '@/shared/database/db';
import { useToast } from '@/shared/toasts';

export class PracticeTrackingRepo implements PracticeTrackingRepoContract {
  private toast = useToast();

  // Task completion events
  async saveCompletionEvent(event: Omit<TaskCompletionData, 'id'>): Promise<TaskCompletionData> {
    try {
      console.log('[PracticeTrackingRepo] Saving event:', event);
      const id = await db.taskCompletions.add(event as TaskCompletionData);
      console.log('[PracticeTrackingRepo] Event saved with ID:', id);
      return { ...event, id } as TaskCompletionData;
    } catch (error) {
      console.error('[PracticeTrackingRepo] Save failed:', error);
      this.toast.error(`PracticeTrackingRepo: Failed to save completion event: ${String(error)}`);
      throw error;
    }
  }

  async getAllCompletionEvents(): Promise<TaskCompletionData[]> {
    const events = await db.taskCompletions.toArray();
    console.log('[PracticeTrackingRepo] Retrieved events count:', events.length);
    return events;
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
    // Get the first (and only) settings record
    const allSettings = await db.motivationSettings.toArray();

    if (allSettings.length === 0) {
      // Create default settings and let Dexie generate the ID
      const defaultSettings: Omit<MotivationSettingsData, 'id'> = {
        dailyGoalMinutes: 30,
        weeklyGoalMinutes: 180
      };

      const id = await db.motivationSettings.add(defaultSettings as MotivationSettingsData);
      return { ...defaultSettings, id } as MotivationSettingsData;
    }

    return allSettings[0];
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
