<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const defaultNotes = ['ADD HOUR', 'BOL', 'BREAK', 'CYCLE', 'FIXED LOG', 'FIXED VIOLATION', 'PTI', 'SHIFT']
const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}>(), { modelValue: '', placeholder: 'Action / note' })
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'commit', value: string): void
}>()
const open = ref(false)
const search = ref('')
const selected = ref<string[]>([])
const editableText = ref('')
const initialValue = ref('')
const parse = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)
const joined = computed(() => selected.value.join(', '))
const choices = computed(() => [...defaultNotes, ...selected.value.filter(item => !defaultNotes.some(note => note.toLowerCase() === item.toLowerCase()))])
const filtered = computed(() => choices.value.filter(note => note.toLowerCase().includes(search.value.trim().toLowerCase())))

function setSelected(notes: string[]) {
  selected.value = notes
  editableText.value = notes.join(', ')
  emit('update:modelValue', editableText.value)
}

function editText(value: string) {
  editableText.value = value
  selected.value = parse(value)
  emit('update:modelValue', value)
}

function toggle(note: string) {
  const current = parse(editableText.value)
  setSelected(current.includes(note)
    ? current.filter(item => item !== note)
    : [...current, note])
}

function addCustom() {
  const value = search.value.trim()
  if (!value) return
  const existing = choices.value.find(note => note.toLowerCase() === value.toLowerCase())
  if (existing) {
    if (!selected.value.includes(existing)) toggle(existing)
  } else {
    setSelected([...selected.value, value])
  }
  search.value = ''
}

watch(() => props.modelValue, value => {
  if (!open.value) {
    selected.value = parse(value)
    editableText.value = value
  }
}, { immediate: true })

watch(open, value => {
  if (value) {
    selected.value = parse(props.modelValue)
    initialValue.value = selected.value.join(', ')
    editableText.value = props.modelValue
    search.value = ''
  } else {
    const value = parse(editableText.value).join(', ')
    emit('update:modelValue', value)
    if (value !== initialValue.value) emit('commit', value)
  }
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" :disabled="disabled" class="h-8 w-full min-w-40 justify-between gap-2 px-2 font-normal" @click.stop @keydown.stop>
        <span class="min-w-0 truncate text-left" :class="!joined && 'text-muted-foreground'">{{ joined || placeholder }}</span>
        <ChevronsUpDown class="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-64 p-2" @click.stop @keydown.stop>
      <div class="relative mb-2">
        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input v-model="search" class="h-9 pl-8" placeholder="Search or add note" @keydown.enter.prevent="addCustom" />
      </div>
      <div class="max-h-60 overflow-auto">
        <button v-for="note in filtered" :key="note" type="button" class="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted" @click="toggle(note)">
          {{ note }}
          <Check class="h-4 w-4 shrink-0" :class="selected.includes(note) ? 'opacity-100' : 'opacity-0'" />
        </button>
        <button v-if="search.trim() && !choices.some(note => note.toLowerCase() === search.trim().toLowerCase())" type="button" class="w-full rounded px-2 py-2 text-left text-sm text-primary hover:bg-muted" @click="addCustom">
          Add “{{ search.trim() }}”
        </button>
        <p v-else-if="!filtered.length" class="px-2 py-3 text-sm text-muted-foreground">No matches</p>
      </div>
      <div class="mt-2 border-t border-border pt-2">
        <span class="mb-1 block text-xs text-muted-foreground">Edit selected notes</span>
        <Textarea :model-value="editableText" rows="2" aria-label="Edit selected notes" placeholder="Type or edit notes" @update:model-value="value => editText(String(value))" />
      </div>
    </PopoverContent>
  </Popover>
</template>
