<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'

interface Note {
  id: string
  title: string
}
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.notes.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.notes.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.notes.delete'))
const notes = ref<Note[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const editorOpen = ref(false)
const editing = ref<Note | null>(null)
const removing = ref<Note | null>(null)
const title = ref('')
const filtered = computed(() =>
  notes.value.filter((note) => note.title.toLowerCase().includes(search.value.trim().toLowerCase()))
)

async function load() {
  loading.value = true
  try {
    const response = await api.get<{ successResult: Note[] }>('/report/api/note')
    notes.value = response.data.successResult ?? []
  } catch {
    toast.error('Could not load notes.')
  } finally {
    loading.value = false
  }
}

function openEditor(note: Note | null = null) {
  editing.value = note
  title.value = note?.title ?? ''
  editorOpen.value = true
}

async function save() {
  if (!title.value.trim()) return
  saving.value = true
  try {
    if (editing.value)
      await api.put(`/report/api/note/${editing.value.id}`, { title: title.value.trim() })
    else await api.post('/report/api/note', { title: title.value.trim() })
    editorOpen.value = false
    toast.success('Note saved.')
    window.dispatchEvent(new Event('report-notes-updated'))
    await load()
  } catch {
    toast.error('Could not save the note.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/note/${removing.value.id}`)
    removing.value = null
    toast.success('Note deleted.')
    window.dispatchEvent(new Event('report-notes-updated'))
    await load()
  } catch {
    toast.error('Could not delete the note.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <CReportAdminHeader
      v-model:search="search"
      title="Notes"
      subtitle="Manage the task note dictionary."
      placeholder="Search notes"
    >
      <Button v-if="canCreate" @click="openEditor()"><Plus class="mr-2 h-4 w-4" />Add note</Button>
    </CReportAdminHeader>
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full text-left text-sm">
          <thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50">
            <tr class="h-11">
              <th class="w-20 px-4 font-medium">No</th>
              <th class="px-4 font-medium">Title</th>
              <th v-if="canEdit || canDelete" class="w-28 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(note, index) in filtered"
              :key="note.id"
              class="h-12 border-t border-border"
            >
              <td class="px-4 text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4 font-medium">{{ note.title }}</td>
              <td v-if="canEdit || canDelete" class="px-4">
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="canEdit"
                    size="icon-sm"
                    variant="ghost"
                    title="Edit"
                    @click="openEditor(note)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    v-if="canDelete"
                    size="icon-sm"
                    variant="ghost"
                    title="Delete"
                    @click="removing = note"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td
                :colspan="canEdit || canDelete ? 3 : 2"
                class="px-4 py-12 text-center text-muted-foreground"
              >
                {{ loading ? 'Loading notes…' : 'No notes found.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {{ filtered.length }} notes
      </div>
    </div>
    <Dialog v-model:open="editorOpen"
      ><DialogContent class="max-w-md"
        ><DialogHeader
          ><DialogTitle>{{ editing ? 'Edit note' : 'Add note' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="save">
          <label class="grid gap-1.5 text-sm"
            >Title<Input v-model="title" required maxlength="200" /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="editorOpen = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !title.trim()">Save</Button></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
    <Dialog
      :open="!!removing"
      @update:open="
        (value) => {
          if (!value) removing = null
        }
      "
      ><DialogContent class="max-w-sm"
        ><DialogHeader
          ><DialogTitle>Delete {{ removing?.title }}?</DialogTitle></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="removing = null">Cancel</Button
          ><Button variant="destructive" :disabled="saving" @click="remove"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
