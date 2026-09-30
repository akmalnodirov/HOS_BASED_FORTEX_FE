<template>
  <div
    role="checkbox"
    :aria-checked="checked"
    :class="[
      'grid place-content-center h-4 w-4 shrink-0 rounded-sm border border-[#DBDBDB] ring-offset-background transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      checked ? 'bg-primary text-primary-foreground' : 'bg-background',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    ]"
    :tabindex="disabled ? -1 : 0"
    @click.stop="toggle"
    @keydown.space.prevent="toggle"
  >
    <Check v-if="checked" class="h-4 w-4" />
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

interface Props {
  checked?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  checked: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:checked', value: boolean): void
}>()

const toggle = () => {
  if (!props.disabled) {
    emit('update:checked', !props.checked)
  }
}
</script>
