<script setup lang="ts">
interface Props {
  class?: string
}

defineProps<Props>()
</script>

<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="class"
  >
    <path
      d="M7.77701 2.24776C7.89618 2.11535 8.10382 2.11535 8.22299 2.24776L12.0494 6.49931C12.2231 6.69237 12.0861 7 11.8264 7H4.17361C3.91388 7 3.77687 6.69237 3.95062 6.49931L7.77701 2.24776Z"
      fill="currentColor"
    />
    <path
      d="M8.22299 13.7522C8.10382 13.8846 7.89618 13.8846 7.77701 13.7522L3.95062 9.50069C3.77687 9.30763 3.91388 9 4.17361 9L11.8264 9C12.0861 9 12.2231 9.30763 12.0494 9.50069L8.22299 13.7522Z"
      fill="currentColor"
    />
  </svg>
</template>
