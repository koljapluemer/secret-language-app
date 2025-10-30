import Dexie, { type Table } from 'dexie';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { GoalData } from '@/entities/goals/GoalData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import type { MergeQueueItem } from '@/features/merge/MergeQueueData';
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData';
import type { MotivationSettingsData } from '@/entities/practice-tracking/MotivationSettingsData';
import type { TestResultData } from '@/entities/test-results/TestResultData';

class LinguanodonDatabase extends Dexie {
  vocab!: Table<VocabData>;
  translations!: Table<TranslationData>;
  goals!: Table<GoalData>;
  notes!: Table<NoteData>;
  factCards!: Table<FactCardData>;
  resources!: Table<ResourceData>;
  languages!: Table<LanguageData>;
  localSets!: Table<LocalSetData>;
  mergeQueue!: Table<MergeQueueItem>;
  taskCompletions!: Table<TaskCompletionData>;
  motivationSettings!: Table<MotivationSettingsData>;
  testResults!: Table<TestResultData>;

  constructor() {
    super('LinguanodonDB');

    this.version(1).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language',
      resources: '@id, language',
      languages: '@id, code',
      localSets: '@id, name, language',
      mergeQueue: '@id'
    });

    this.version(2).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language',
      resources: '@id, language',
      languages: '@id, code',
      localSets: '@id, name, language',
      mergeQueue: '@id',
      taskCompletions: '@id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: '@id'
    });

    // Version 3: Add unique compound index for localSets
    this.version(3).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language',
      resources: '@id, language',
      languages: '@id, &code',
      localSets: '@id, &[name+language], lastDownloadedAt',
      mergeQueue: '@id',
      taskCompletions: '@id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: '@id'
    });

    // Version 4: Add testResults table
    this.version(4).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language',
      resources: '@id, language',
      languages: '@id, &code',
      localSets: '@id, &[name+language], lastDownloadedAt',
      mergeQueue: '@id',
      taskCompletions: '@id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: '@id',
      testResults: 'id, testMode, completedAt'
    });

    // Version 5: Add origins index to resources, factCards, and goals for efficient set deletion
    this.version(5).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, language, *origins, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language, *origins',
      resources: '@id, language, *origins',
      languages: '@id, &code',
      localSets: '@id, &[name+language], lastDownloadedAt',
      mergeQueue: '@id',
      taskCompletions: '@id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: '@id',
      testResults: 'id, testMode, completedAt'
    });

    // Version 6: Remove Dexie Cloud - change @id to ++id for standard auto-increment
    this.version(6).stores({
      vocab: '++id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '++id, content, *origins',
      goals: '++id, language, *origins, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '++id',
      factCards: '++id, language, *origins',
      resources: '++id, language, *origins',
      languages: null, // Remove languages table (now hardcoded)
      localSets: '++id, &[name+language], language, lastDownloadedAt',
      mergeQueue: '++id',
      taskCompletions: '++id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: '++id',
      testResults: '++id, testMode, completedAt'
    });

    // Version 7: Use string UUIDs instead of auto-increment numbers
    this.version(7).stores({
      vocab: 'id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: 'id, content, *origins',
      goals: 'id, language, *origins, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: 'id',
      factCards: 'id, language, *origins',
      resources: 'id, language, *origins',
      languages: null,
      localSets: 'id, &[name+language], language, lastDownloadedAt',
      mergeQueue: 'id',
      taskCompletions: 'id, timestamp, language_code, practice_mode, session_id',
      motivationSettings: 'id',
      testResults: 'id, testMode, completedAt'
    });
  }
}

export const db = new LinguanodonDatabase();
