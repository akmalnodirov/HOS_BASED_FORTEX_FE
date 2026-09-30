<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
      <!-- Header -->
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold">Optimize</DialogTitle>
      </DialogHeader>

      <!-- Content (Grid of checkboxes) -->
      <div class="px-6 py-6">
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="item in categories"
            :key="item.id"
            class="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            @click="toggleOption(item.id, !selectedOptions.includes(item.id))"
          >
            <CCustomCheckbox
              :checked="selectedOptions.includes(item.id)"
              @update:checked="toggleOption(item.id, $event)"
            />
            <span class="text-sm font-medium leading-none select-none">
              {{ item.name }}
            </span>
          </div>
        </div>

        <!-- Input field at the bottom section from image? No, image just shows grid and then "All" at bottom left footer area -->
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex items-center justify-between bg-white dark:bg-card">
        <!-- 'All' Checkbox -->
        <div
          class="flex items-center space-x-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          @click="isAllSelected = !isAllSelected"
        >
          <CCustomCheckbox
            :checked="isAllSelected"
            @update:checked="isAllSelected = $event"
          />
          <span class="text-sm font-medium leading-none select-none">All</span>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
          <Button
            class="bg-black text-white hover:bg-black/90"
            :disabled="loading || selectedOptions.length === 0"
            @click="handleSave"
          >
            {{ loading ? 'Saving…' : 'Save' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { OptimizeCategory } from '../../types/boost.ts'

const props = defineProps<{
  open: boolean
  categories: OptimizeCategory[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', selectedCategoryIds: string[]): void
}>()

// State to track selected options
const selectedOptions = ref<string[]>([])

// Computed property for "Select All"
const isAllSelected = computed({
  get: () => {
    return props.categories.length > 0 && selectedOptions.value.length === props.categories.length
  },
  set: (val: boolean) => {
    if (val) {
      selectedOptions.value = props.categories.map((o) => o.id)
    } else {
      selectedOptions.value = []
    }
  },
})

// Toggle individual option
const toggleOption = (id: string, checked: boolean) => {
  if (checked) {
    if (!selectedOptions.value.includes(id)) {
      selectedOptions.value.push(id)
    }
  } else {
    selectedOptions.value = selectedOptions.value.filter((item) => item !== id)
  }
}

const handleSave = () => {
  emit('save', [...selectedOptions.value])
}
</script>
