<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
const open = ref(false)
const year = ref(Number(props.modelValue.slice(0, 4)) || new Date().getFullYear())
const label = computed(() => {
  const [selectedYear, month] = props.modelValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(selectedYear, month - 1, 1)
  )
})
const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, index, 1))
)
watch(
  () => props.modelValue,
  (value) => {
    year.value = Number(value.slice(0, 4)) || new Date().getFullYear()
  }
)

function select(month: number) {
  emit('update:modelValue', `${year.value}-${String(month).padStart(2, '0')}`)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child
      ><Button type="button" variant="outline" class="w-44 justify-start font-normal"
        ><CalendarDays class="mr-2 h-4 w-4 text-muted-foreground" />{{ label }}</Button
      ></PopoverTrigger
    >
    <PopoverContent align="start" class="w-64 p-3"
      ><div class="mb-3 flex items-center justify-between">
        <Button size="icon-sm" variant="ghost" @click="year--"
          ><ChevronLeft class="h-4 w-4" /></Button
        ><span class="text-sm font-semibold">{{ year }}</span
        ><Button size="icon-sm" variant="ghost" @click="year++"
          ><ChevronRight class="h-4 w-4"
        /></Button>
      </div>
      <div class="grid grid-cols-3 gap-1">
        <Button
          v-for="(month, index) in months"
          :key="month"
          size="sm"
          :variant="
            modelValue === `${year}-${String(index + 1).padStart(2, '0')}` ? 'default' : 'ghost'
          "
          @click="select(index + 1)"
          >{{ month }}</Button
        >
      </div></PopoverContent
    >
  </Popover>
</template>
