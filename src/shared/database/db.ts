import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { GoalData } from '@/entities/goals/GoalData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import type { MergeQueueItem } from '@/app/merge/MergeQueueData';

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

  constructor() {
    super('LinguanodonDB', { addons: [dexieCloud] });

    this.version(1).stores({
      vocab: '@id, language, content, *origins, [language+content], progress.due, hasImage, hasSound',
      translations: '@id, content, *origins',
      goals: '@id, taskType, title, isActive, parentGoal, lastShownAt, *subGoals, *vocab, *examples, *factCards, *notes',
      notes: '@id',
      factCards: '@id, language',
      resources: '@id, language',
      languages: '@id, code',
      localSets: '@id, language',
      mergeQueue: '@id'
    });
  }
}

export const db = new LinguanodonDatabase();

// Configure Dexie Cloud
db.cloud.configure({
  databaseUrl: 'https://zj86qnw9c.dexie.cloud',
  requireAuth: false, // App works offline, sync is opt-in
  tryUseServiceWorker: true,
  periodicSync: { minInterval: 60000 } // 1 minute
});
