import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { SituationRepoContract } from '@/entities/situation/SituationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';

export interface RepositoriesContext {
  vocabRepo?: VocabRepoContract;
  translationRepo?: TranslationRepoContract;
  glossRepo?: GlossRepoContract;
  situationRepo?: SituationRepoContract;
  factCardRepo?: FactCardRepoContract;
  resourceRepo?: ResourceRepoContract;
  goalRepo?: GoalRepoContract;
  noteRepo?: NoteRepoContract;
  languageRepo?: LanguageRepoContract;
}

export interface RepositoriesContextStrict {
  vocabRepo: VocabRepoContract;
  translationRepo: TranslationRepoContract;
  glossRepo: GlossRepoContract;
  situationRepo: SituationRepoContract;
  factCardRepo: FactCardRepoContract;
  resourceRepo: ResourceRepoContract;
  goalRepo: GoalRepoContract;
  noteRepo: NoteRepoContract;
  languageRepo: LanguageRepoContract;
}