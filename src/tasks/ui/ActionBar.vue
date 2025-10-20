<template>
  <div
    class="bg-primary border-t-10 border-t-secondary p-4 mt-4 text-white flex flex-row gap-4 justify-between items-center">
    <div class="flex flex-row gap-2 items-center">
      <template v-for="control in secondaryLeftControls" :key="control.id">
        <button
          v-if="control.type === 'button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position, control.destructive)"
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

    <div class="flex flex-row justify-center gap-2 items-center">
      <template v-for="control in centralControls" :key="control.id">
        <button
          v-if="control.type === 'button'"
          @click="emit('action', control.id)"
          :class="getButtonClass(control.position, control.destructive)"
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
        <div v-else-if="control.type === 'text-input'" class="flex gap-2 items-center">
          <input
            type="text"
            :value="control.value"
            @input="emit('action', control.id, ($event.target as HTMLInputElement).value)"
            :placeholder="control.placeholder"
            class="input input-bordered input-lg"
          />
          <button
            v-if="control.showDoneButton"
            @click="emit('action', `${control.id}-done`)"
            class="btn btn-primary btn-lg"
          >
            Done
          </button>
        </div>
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
          v-else-if="control.type === 'image-button'"
          @click="emit('action', control.id)"
          :class="getImageButtonClass(control.position)"
        >
          <img :src="control.imageUrl" :alt="control.alt" class="w-full h-full object-cover" />
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
import { Volume2, Play } from 'lucide-vue-next';

const props = defineProps<{
  controls: ActionControl[];
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
    classes.push('btn-lg');
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
  };
  return iconMap[icon] || Play;
}
</script>