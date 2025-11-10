<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3>Feature Removed</h3>
      <p>The gloss feature has been removed from the application.</p>

      <div class="flex gap-2 justify-end mt-4">
        <button type="button" @click="closeModal" class="btn btn-primary">Close</button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  excludeGlossIds?: string[];
}>();

const emit = defineEmits<{
  close: [];
  'gloss-added': [string];
}>();

function closeModal() {
  emit('close');
}
</script>
