import type { Task } from '@/tasks/Task';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import { goalAnalysisAgent } from './GoalAnalysisAgent';
import { taskDesignAgent } from './TaskDesignAgent';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { GoalData } from '@/entities/goals/GoalData';
import { toRaw } from 'vue';
import { nanoid } from 'nanoid';

export interface RepositoryContracts {
  vocabRepo: VocabRepoContract;
  translationRepo: TranslationRepoContract;
  goalRepo: GoalRepoContract;
}

interface VocabMapping {
  id: string;
  content: string;
  meaning?: string;
  isSentence: boolean;
}

export async function generateGoalDrivenTasks(
  goalText: string,
  language: string,
  repos: RepositoryContracts
): Promise<{ tasks: Task[]; goalId: string }> {
  const { vocabRepo, translationRepo, goalRepo } = repos;

  // Step 1: Analyze the goal with AI
  const analysis = await goalAnalysisAgent.analyze(goalText, language);

  // Step 2: Create or find vocab for core sentences and building blocks
  const vocabMappings: VocabMapping[] = [];
  const sentenceToBlocksMap = new Map<string, string[]>(); // sentence ID -> building block IDs

  // Process building blocks first
  for (const block of analysis.buildingBlocks) {
    const vocabData = await createOrFindVocab(
      block.phrase,
      block.meaning,
      language,
      false, // not a sentence
      vocabRepo,
      translationRepo
    );
    vocabMappings.push({
      id: vocabData.id,
      content: block.phrase,
      meaning: block.meaning,
      isSentence: false
    });
  }

  // Process core sentences and link to building blocks
  for (const sentence of analysis.coreSentences) {
    const vocabData = await createOrFindVocab(
      sentence,
      undefined,
      language,
      true, // is a sentence
      vocabRepo,
      translationRepo
    );

    // Find which building blocks are contained in this sentence
    const containedBlockIds: string[] = [];
    for (const mapping of vocabMappings) {
      if (!mapping.isSentence && sentence.includes(mapping.content)) {
        containedBlockIds.push(mapping.id);
      }
    }

    // Update sentence vocab with 'contains' relationship
    if (containedBlockIds.length > 0) {
      vocabData.contains = containedBlockIds;
      await vocabRepo.updateVocab(toRaw(vocabData));
    }

    sentenceToBlocksMap.set(vocabData.id, containedBlockIds);

    vocabMappings.push({
      id: vocabData.id,
      content: sentence,
      isSentence: true
    });
  }

  // Step 3: Create a Goal to track this learning objective
  const goalId = nanoid();
  const goalData: GoalData = {
    id: goalId,
    language,
    title: goalText,
    doNotPractice: false,
    subGoals: [],
    vocab: vocabMappings.map(v => v.id),
    factCards: [],
    notes: [],
    origins: ['goal-driven-ai'],
    finishedAddingSubGoals: true,
    finishedAddingMilestones: true,
    finishedAddingKnowledge: true,
    milestones: {},
    isAchieved: false
  };

  await goalRepo.create(toRaw(goalData));

  // Step 4: Design tasks with AI
  const sentences = vocabMappings.filter(v => v.isSentence);
  const blocks = vocabMappings.filter(v => !v.isSentence);

  const taskConfigs = await taskDesignAgent.designTasks(
    sentences.map(s => ({ id: s.id, content: s.content })),
    blocks.map(b => ({ id: b.id, content: b.content, meaning: b.meaning || '' })),
    12
  );

  // Step 5: Convert AI task configs to actual Task objects
  const tasks: Task[] = taskConfigs.map((config, index) => {
    const task: Task = {
      id: `goal-driven-${goalId}-task-${index}-${Date.now()}`,
      language,
      taskType: config.taskType,
      prompt: config.prompt,
      associatedVocab: config.vocabIds,
      associatedGoals: [goalId]
    };

    console.log('[generateGoalDrivenTasks] Created task:', {
      id: task.id,
      type: task.taskType,
      prompt: task.prompt,
      vocabIds: task.associatedVocab
    });

    return task;
  });

  return { tasks, goalId };
}

async function createOrFindVocab(
  content: string,
  meaningEnglish: string | undefined,
  language: string,
  isSentence: boolean,
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract
): Promise<VocabData> {
  // Check if vocab already exists
  const existing = await vocabRepo.getVocabByLanguageAndContent(language, content);

  if (existing) {
    return existing;
  }

  // Create translation if meaning provided
  const translationIds: string[] = [];
  if (meaningEnglish) {
    const translation = await translationRepo.saveOrGetExistingTranslation({
      content: meaningEnglish,
      priority: 1,
      notes: []
    });
    translationIds.push(translation.id);
  }

  // Create new vocab
  const newVocab = await vocabRepo.saveVocab({
    language,
    content,
    consideredSentence: isSentence,
    consideredWord: !isSentence,
    consideredCharacter: false,
    priority: 2,
    doNotPractice: false,
    notes: [],
    transcriptions: [],
    translations: translationIds,
    glosses: [],
    links: [],
    origins: ['goal-driven-ai'],
    relatedVocab: [],
    notRelatedVocab: [],
    contains: [],
    isPicturable: false,
    images: [],
    hasImage: false,
    sounds: [],
    hasSound: false,
    notInterestedInPronunciationOrAlreadyAdded: false,
    notInterestedInAddingTranslations: false
  });

  return newVocab;
}
