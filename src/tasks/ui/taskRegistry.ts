import type { Component } from "vue";

import RenderTaskForAddingTranslation from "@/tasks/task-vocab-add-translation/Render.vue";
import RenderExtractKnowledgeFromResource from "@/tasks/task-resource-extract-knowledge/Render.vue";
import TaskAddSubGoals from "@/tasks/task-goal-add-sub-goals/Render.vue";
import TaskAddVocabToGoal from "@/tasks/task-goal-add-vocab/Render.vue";
import TaskVocabTryToRemember from "@/tasks/task-vocab-try-to-remember/Render.vue";
import TaskGuessWhatSentenceMeans from "@/tasks/task-guess-what-sentence-means/Render.vue";
import TaskVocabReveal from "@/tasks/task-vocab-reveal/Render.vue";
import TaskVocabChooseFromOptions from "@/tasks/task-vocab-single-choice/Render.vue";
import TaskClozeChooseFromOptions from "@/tasks/task-cloze-choice/Render.vue";
import TaskClozeReveal from "@/tasks/task-cloze-reveal/Render.vue";
import TaskVocabFormSentence from "@/tasks/task-vocab-form-sentence/Render.vue";
import TaskFactCardTryToRemember from "@/tasks/task-fact-card-try-to-remember/Render.vue";
import TaskFactCardReveal from "@/tasks/task-fact-card-reveal/Render.vue";
import TaskAddImageToVocab from "@/tasks/task-add-image-to-vocab/Render.vue";
import TaskVocabChooseImageBySound from "@/tasks/task-vocab-choose-image-by-sound/Render.vue";
import TaskVocabChooseFromSound from "@/tasks/task-vocab-choose-from-sound/Render.vue";
import TaskConsumeImmersionContent from "@/tasks/task-consume-immersion-content/Render.vue";
import TaskCreateNewGoal from "@/tasks/task-goal-create-new/Render.vue";

export interface TaskInfo {
  component: Component
  size: 'small' | 'medium' | 'big'
}

export const taskRegistry: Record<string, TaskInfo> = {
  "add-translation": { component: RenderTaskForAddingTranslation, size: 'medium' },
  "extract-knowledge-from-resource": { component: RenderExtractKnowledgeFromResource, size: 'big' },
  "add-sub-goals": { component: TaskAddSubGoals, size: 'medium' },
  "add-vocab-to-goal": { component: TaskAddVocabToGoal, size: 'medium' },
  "vocab-try-to-remember": { component: TaskVocabTryToRemember, size: 'small' },
  "guess-what-sentence-means": { component: TaskGuessWhatSentenceMeans, size: 'medium' },
  "vocab-reveal-target-to-native": { component: TaskVocabReveal, size: 'small' },
  "vocab-reveal-native-to-target": { component: TaskVocabReveal, size: 'small' },
  "vocab-choose-from-two-target-to-native": { component: TaskVocabChooseFromOptions, size: 'small' },
  "vocab-choose-from-two-native-to-target": { component: TaskVocabChooseFromOptions, size: 'small' },
  "vocab-choose-from-four-target-to-native": { component: TaskVocabChooseFromOptions, size: 'small' },
  "vocab-choose-from-four-native-to-target": { component: TaskVocabChooseFromOptions, size: 'small' },
  "cloze-choose-from-two": { component: TaskClozeChooseFromOptions, size: 'small' },
  "cloze-choose-from-four": { component: TaskClozeChooseFromOptions, size: 'small' },
  "cloze-reveal": { component: TaskClozeReveal, size: 'small' },
  "vocab-form-sentence": { component: TaskVocabFormSentence, size: 'medium' },
  "vocab-form-sentence-single": { component: TaskVocabFormSentence, size: 'medium' },
  "vocab-record-sentence": { component: TaskVocabFormSentence, size: 'medium' },
  "vocab-record-sentence-single": { component: TaskVocabFormSentence, size: 'medium' },
  "fact-card-try-to-remember": { component: TaskFactCardTryToRemember, size: 'small' },
  "fact-card-reveal": { component: TaskFactCardReveal, size: 'small' },
  "add-image-to-vocab": { component: TaskAddImageToVocab, size: 'medium' },
  "vocab-choose-image-by-sound": { component: TaskVocabChooseImageBySound, size: 'medium' },
  "vocab-choose-from-sound": { component: TaskVocabChooseFromSound, size: 'medium' },
  "consume-immersion-content": { component: TaskConsumeImmersionContent, size: 'big' },
  "create-new-goal": { component: TaskCreateNewGoal, size: 'medium' },
};

export const TASK_REGISTRY_INJECTION_KEY = Symbol("taskRegistry");
