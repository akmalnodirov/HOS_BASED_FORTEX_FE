<template>
  <div class="flex flex-wrap items-center gap-2 min-w-28">
    <div v-for="upload in uploads" :key="upload.id" class="relative">
      <a :href="previews[upload.id] || undefined" target="_blank" rel="noopener noreferrer" class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary/30">
        <video v-if="previews[upload.id] && upload.fileType === 'video'" :src="previews[upload.id]" muted preload="metadata" class="h-full w-full object-cover" />
        <img v-else-if="previews[upload.id] && upload.fileType === 'image'" :src="previews[upload.id]" alt="Checker upload" class="h-full w-full object-cover" />
        <FileText v-else class="h-4 w-4" />
      </a>
      <button v-if="canManage" type="button" class="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground" aria-label="Remove upload" @click="removeUpload(upload.id)">
        <X class="h-3 w-3" />
      </button>
    </div>
    <span v-if="!uploads.length" class="text-muted-foreground">—</span>
    <label v-if="canManage" class="cursor-pointer rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
      {{ uploading ? 'Uploading…' : 'Add file' }}
      <input class="hidden" type="file" accept="image/*,video/*" multiple :disabled="uploading" @change="uploadFiles" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { FileText, X } from 'lucide-vue-next'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'

const props = defineProps<{ taskId: string; uploads: Array<{ id: string; url: string; fileType?: string | null }>; canManage?: boolean }>()
const emit = defineEmits<{ (event: 'updated'): void }>()
const api = useApi()
const uploading = ref(false)
const previews = ref<Record<string, string>>({})

watch(() => props.uploads.map((item) => item.id).join(','), async () => {
  Object.values(previews.value).forEach(URL.revokeObjectURL)
  previews.value = {}
  await Promise.all(props.uploads.map(async (upload) => {
    const url = upload.url.startsWith('/uploads/')
      ? ApiEndpoints.REPORT_CHECKER_FILE(upload.url.split('/').pop() ?? '')
      : upload.url
    const response = await api.get<Blob>(url, { responseType: 'blob' })
    previews.value = { ...previews.value, [upload.id]: URL.createObjectURL(response.data) }
  }))
}, { immediate: true })

onBeforeUnmount(() => Object.values(previews.value).forEach(URL.revokeObjectURL))

async function uploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const body = new FormData()
  Array.from(input.files).forEach((file) => body.append('files', file))
  uploading.value = true
  try {
    await api.post(ApiEndpoints.REPORT_CHECKER_UPLOADS(props.taskId), body, { headers: { 'Content-Type': 'multipart/form-data' } })
    emit('updated')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function removeUpload(id: string) {
  if (!window.confirm('Remove this file?')) return
  await api.delete(ApiEndpoints.REPORT_CHECKER_UPLOAD(id))
  emit('updated')
}
</script>

