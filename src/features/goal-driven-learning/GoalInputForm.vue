<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';

interface Emits {
  (e: 'submit', payload: { goalText: string; languageCode: string }): void;
}

const emit = defineEmits<Emits>();

const languageRepo = inject<LanguageRepoContract>('languageRepo');
if (!languageRepo) {
  throw new Error('languageRepo not available');
}

const goalText = ref('');
const selectedLanguageCode = ref('deu'); // Default to German
const languages = ref<LanguageData[]>([]);

onMounted(async () => {
  languages.value = await languageRepo.getAll();
});

function handleSubmit() {
  if (goalText.value.trim() && selectedLanguageCode.value) {
    emit('submit', {
      goalText: goalText.value.trim(),
      languageCode: selectedLanguageCode.value
    });
  }
}

const exampleGoals = [
  'I want to learn how to communicate in a German bakery',
  'I want to order food in a French restaurant',
  'I want to ask for directions in Spanish',
  'I want to introduce myself in Mandarin',
  'I want to make small talk about the weather in Arabic'
];

function useExample(example: string) {
  goalText.value = example;
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="text-center space-y-2">
      <h2 class="text-3xl font-bold">What do you want to learn?</h2>
      <p class="text-light">
        Describe your learning goal in plain English, and AI will design a personalized practice session for you.
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Language Selection -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text font-semibold">Target Language</span>
        </label>
        <select
          v-model="selectedLanguageCode"
          class="select select-bordered w-full"
          required
        >
          <option
            v-for="lang in languages"
            :key="lang.code"
            :value="lang.code"
          >
            {{ lang.emoji }} {{ lang.name }}
          </option>
        </select>
      </div>

      <!-- Goal Text Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text font-semibold">Your Learning Goal</span>
        </label>
        <textarea
          v-model="goalText"
          class="textarea textarea-bordered h-32 w-full"
          placeholder="E.g., I want to learn how to communicate in a German bakery"
          required
        ></textarea>
        <label class="label">
          <span class="label-text-alt">Be specific! The more detail you provide, the better the AI can help.</span>
        </label>
      </div>

      <!-- Example Goals -->
      <div class="space-y-2">
        <p class="text-sm font-semibold">Example goals:</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(example, index) in exampleGoals"
            :key="index"
            type="button"
            @click="useExample(example)"
            class="btn btn-outline btn-sm"
          >
            {{ example }}
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="pt-4">
        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="!goalText.trim()"
        >
          Generate My Practice Session
        </button>
      </div>
    </form>

    <!-- Info Box -->
    <div class="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <div class="font-bold">How it works</div>
        <div class="text-sm">
          AI will analyze your goal, identify core sentences and vocabulary, create any missing content,
          and design 12 personalized exercises to help you achieve your learning objective.
        </div>
      </div>
    </div>
  </div>
</template>
