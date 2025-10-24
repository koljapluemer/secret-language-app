<template>
  <div
    class="bg-primary border-t-10 border-t-secondary p-4 pt-20 text-white flex flex-row gap-4 justify-between items-end relative min-h-32">
    <!-- Left Element -->
    <div class="flex flex-row gap-2 items-center">
      <!-- Default skip button -->
      <button
        v-if="!hideSkipButton"
        @click="emit('action', 'skip')"
        class="btn btn-sm btn-ghost text-white"
      >
        <component :is="getIcon('skip')" :size="20" />
      </button>

      <!-- Default disable button -->
      <button
        v-if="!hideDisableButton"
        @click="emit('action', 'disable')"
        class="btn btn-sm btn-ghost text-white"
      >
        <component :is="getIcon('disable')" :size="20" />
      </button>

      <!-- Default jump-to button -->
      <button
        v-if="!hideJumpToButton"
        @click="emit('action', 'jump-to')"
        class="btn btn-sm btn-ghost text-white"
      >
        <component :is="getIcon('jump-to')" :size="20" />
      </button>

      <!-- Additional left controls -->
      <template v-for="control in secondaryLeftControls" :key="control.id">
        <button
          v-if="control.type === 'button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position, control.destructive)"
        >
          {{ control.label }}
        </button>
        <button
          v-else-if="control.type === 'icon-button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position)"
        >
          <component :is="getIcon(control.icon)" />
          <span v-if="control.label">{{ control.label }}</span>
        </button>
      </template>
    </div>

    <!-- Central Element with Header and Footer -->
    <div class="flex flex-col items-center gap-2 absolute left-1/2 -translate-x-1/2 bottom-0 pb-4">
      <!-- Central controls -->
      <div class="flex flex-row flex-wrap justify-center gap-2 items-center">
        <template v-for="control in centralControls" :key="control.id">
          <button
            v-if="control.type === 'button'"
            @click="emit('action', control.id)"
            :class="getButtonClass(control.position, control.destructive)"
            :disabled="control.disabled"
          >
            {{ control.label }}
          </button>
          <button
            v-else-if="control.type === 'image-button'"
            @click="emit('action', control.id)"
            :class="getImageButtonClass(control.position)"
          >
            <img :src="control.imageUrl" :alt="control.alt" class="w-full h-full object-cover" />
          </button>
          <input
            v-else-if="control.type === 'text-input'"
            type="text"
            :value="control.value"
            @input="emit('action', control.id, ($event.target as HTMLInputElement).value)"
            :placeholder="control.placeholder"
            class="input input-bordered input-lg"
          />
          <textarea
            v-else-if="control.type === 'textarea'"
            :value="control.value"
            @input="emit('action', control.id, ($event.target as HTMLTextAreaElement).value)"
            :placeholder="control.placeholder"
            :disabled="control.disabled"
            class="textarea w-96 h-40 text-xl border-3 border-secondary bg-primary text-white placeholder-white/60 resize-none"
          />
          <button
            v-else-if="control.type === 'icon-button'"
            @click="emit('action', control.id)"
            :class="getButtonClass(control.position)"
          >
            <component :is="getIcon(control.icon)" />
            <span v-if="control.label">{{ control.label }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Right Element -->
    <div class="flex flex-row gap-2 items-center">
      <template v-for="control in secondaryRightControls" :key="control.id">
        <button
          v-if="control.type === 'button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position, control.destructive)"
        >
          {{ control.label }}
        </button>
        <button
          v-else-if="control.type === 'icon-button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position)"
        >
          <component :is="getIcon(control.icon)" />
          <span v-if="control.label">{{ control.label }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ActionControl, ActionControlPosition } from './ActionControl';
import { Volume2, Play, SkipForward, Ban, ExternalLink } from 'lucide-vue-next';

const props = defineProps<{
  controls: ActionControl[];
  hideSkipButton?: boolean;
  hideDisableButton?: boolean;
  hideJumpToButton?: boolean;
}>();

const emit = defineEmits<{
  action: [controlId: string, data?: string];
}>();

const secondaryLeftControls = computed(() =>
  props.controls.filter((c) => c.position === 'secondary-left')
);

const centralControls = computed(() =>
  props.controls.filter((c) => c.position === 'central')
);

const secondaryRightControls = computed(() =>
  props.controls.filter((c) => c.position === 'secondary-right')
);

function getButtonClass(position: ActionControlPosition, destructive?: boolean): string {
  const classes = ['btn', 'border-3', 'border-secondary'];

  // Position determines size
  if (position === 'central') {
    classes.push('btn-xl', 'text-xl', 'px-8', 'py-4');
  }
  // secondary-left and secondary-right use default size

  // Destructive overrides primary styling
  if (destructive) {
    classes.push('btn-error');
  } else {
    classes.push('btn-primary');
  }

  return classes.join(' ');
}

function getImageButtonClass(position: ActionControlPosition): string {
  const classes = ['btn', 'p-1'];

  // Position determines size
  if (position === 'central') {
    classes.push('w-32', 'h-32');
  } else {
    classes.push('w-24', 'h-24');
  }

  return classes.join(' ');
}

function getIcon(icon: string) {
  const iconMap: Record<string, unknown> = {
    volume: Volume2,
    play: Play,
    skip: SkipForward,
    disable: Ban,
    'jump-to': ExternalLink,
  };
  return iconMap[icon] || Play;
}
</script>