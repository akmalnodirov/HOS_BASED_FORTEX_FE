<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Eld management</DialogTitle>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Select v-model="selectedFileId">
            <SelectTrigger>
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="file in files" 
                :key="file.id" 
                :value="file.id"
              >
                {{ file.versionLevel }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('close')">Cancel</Button>
        <Button @click="handleSave" :disabled="!selectedFileId || isLoading" class="bg-primary text-primary-foreground hover:bg-primary/90">
          {{ isLoading ? 'Saving...' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { EldInfo, UpdateEldFileRequest } from '@/modules/Tools/ELDs/types'

interface Props {
  open: boolean
  eld: EldInfo | null
  isLoading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: UpdateEldFileRequest): void
}>()

const selectedFileId = ref<string>('')

// Computed files from the selected ELD
const files = ref<any[]>([])

watch(() => props.eld, (newEld) => {
  if (newEld && newEld.files) {
    files.value = newEld.files
    selectedFileId.value = '' // Reset selection
  } else {
    files.value = []
    selectedFileId.value = ''
  }
}, { immediate: true })

const handleSave = () => {
  if (props.eld && selectedFileId.value) {
    emit('save', {
      eldDeviceId: props.eld.id,
      eldFileId: selectedFileId.value
    })
  }
}
</script>
