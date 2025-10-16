<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { TestResult } from '@/modes/utils/useTestMode';

interface Props {
  results: TestResult[];
  modeId: string;
}

const props = defineProps<Props>();
const router = useRouter();

const correctCount = computed(() => props.results.filter(r => r.correct).length);
const totalCount = computed(() => props.results.length);
const percentage = computed(() => totalCount.value > 0 ? Math.round((correctCount.value / totalCount.value) * 100) : 0);

function returnToSelfTest() {
  router.push({ name: 'self-test' });
}

function tryAgain() {
  router.go(0); // Reload current page to restart test
}
</script>

<template>
  <div class="hero min-h-96">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">{{ $t('selfTest.resultsTitle') }}</h1>

        <div class="stats shadow my-8">
          <div class="stat">
            <div class="stat-title">{{ $t('selfTest.score') }}</div>
            <div class="stat-value">{{ correctCount }} / {{ totalCount }}</div>
            <div class="stat-desc">{{ percentage }}% {{ $t('selfTest.correct') }}</div>
          </div>
        </div>

        <div class="flex gap-4 justify-center">
          <button class="btn btn-primary" @click="tryAgain">
            {{ $t('selfTest.tryAgain') }}
          </button>
          <button class="btn btn-ghost" @click="returnToSelfTest">
            {{ $t('selfTest.returnToTests') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
