<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Option { id: string; name: string }

const props = withDefaults(defineProps<{
  modelValue?: string
  options: Option[]
  placeholder?: string
  emptyLabel?: string
  emptyValue?: string
  disabled?: boolean
  size?: 'sm' | 'default'
}>(), { modelValue: '', placeholder: 'Select', size: 'default' })
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
const open = ref(false)
const search = ref('')
const selected = computed(() => props.options.find(option => option.id === props.modelValue))
const label = computed(() => selected.value?.name ?? (props.modelValue === props.emptyValue ? props.emptyLabel : '') ?? props.placeholder)
const filtered = computed(() => props.options
  .filter(option => option.name.toLowerCase().includes(search.value.trim().toLowerCase()))
  .slice(0, 100))

function choose(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

watch(open, value => { if (value) search.value = '' })
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" :disabled="disabled" :class="['w-full min-w-36 justify-between font-normal', size === 'sm' ? 'h-8' : 'h-10']">
        <span class="truncate text-left">{{ label || placeholder }}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-72 p-2">
      <div class="relative mb-2">
        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input v-model="search" class="h-9 pl-8" placeholder="Search..." @keydown.stop />
      </div>
      <div class="max-h-60 overflow-auto">
        <button v-if="emptyLabel" type="button" class="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted" @click="choose(emptyValue ?? '')">
          {{ emptyLabel }}<Check v-if="modelValue === emptyValue" class="h-4 w-4" />
        </button>
        <button v-for="option in filtered" :key="option.id" type="button" class="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted" @click="choose(option.id)">
          <span class="truncate">{{ option.name }}</span><Check v-if="modelValue === option.id" class="h-4 w-4 shrink-0" />
        </button>
        <p v-if="!filtered.length" class="px-2 py-3 text-sm text-muted-foreground">No matches</p>
      </div>
    </PopoverContent>
  </Popover>
</template>
