<template>
  <ul :style="{ marginTop: `${topOffset + 10}px` }" class="h-fit shrink-0 w-12">
    <li
      v-for="label in ['Off', 'SB', 'D', 'ON']"
      :key="label"
      :style="{ height: `${height}px`, fontSize: `${edit ? 11 : 13}px` }"
      class="uppercase text-sm font-bold flex items-center justify-center text-foreground"
    >
      {{ label }}
    </li>
  </ul>
</template>

<script lang="ts" setup>
const props = defineProps({
  height: {
    type: Number,
    required: true,
  },
  topOffset: {
    type: Number,
    required: true,
    default: 20,
  },
  edit: {
    type: Boolean,
    default: false,
  },
})
</script>
