<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
const open = ref(false)
const date = computed({
  get: () => {
    const [year, month, day] = (props.modelValue || new Date().toISOString().slice(0, 10)).slice(0, 10).split('-').map(Number)
    return new CalendarDate(year, month, day)
  },
  set: (value: CalendarDate) => {
    emit('update:modelValue', `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`)
    open.value = false
  },
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" class="h-10 w-full justify-start font-normal">
        <CalendarDays class="mr-2 h-4 w-4 text-muted-foreground" />{{ modelValue || placeholder || 'Select date' }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-auto p-0"><Calendar v-model="date" initial-focus /></PopoverContent>
  </Popover>
</template>
