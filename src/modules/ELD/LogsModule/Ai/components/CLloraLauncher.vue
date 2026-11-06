<template>
  <div class="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
    <section
      v-if="open"
      class="flex h-[580px] max-h-[calc(100vh-120px)] w-[400px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
      aria-label="Llora AI"
    >
      <header class="relative flex h-12 items-center justify-center border-b border-border">
        <h2 class="text-sm font-medium">Llora AI</h2>
        <button
          type="button"
          aria-label="Close Llora AI"
          class="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          @click="close"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div v-if="step === 'ask'" class="flex h-full flex-col items-center justify-center gap-6">
          <div class="llora-orb h-24 w-24 rounded-full" aria-hidden="true" />
          <p class="text-center text-base">Hi {{ firstName }}, how can I help you?</p>
        </div>

        <template v-else>
          <div class="flex justify-end">
            <p class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-foreground px-3 py-2 text-sm text-background">
              {{ request }}
            </p>
          </div>

          <template v-if="step === 'driver'">
            <p class="text-sm">Which driver?</p>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="driver in suggestions"
                :key="driver.driverId"
                variant="outline"
                size="sm"
                @click="pickDriver(driver)"
              >
                {{ driver.displayName }}
              </Button>
            </div>
            <Input v-model="driverSearch" placeholder="Search drivers" aria-label="Search drivers" class="h-9" />
            <div v-if="driverSearch.trim()" class="max-h-40 space-y-1 overflow-y-auto">
              <button
                v-for="driver in searchResults"
                :key="driver.driverId"
                type="button"
                class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                @click="pickDriver(driver)"
              >
                {{ driver.displayName }}
              </button>
              <p v-if="!searchResults.length" class="px-2 text-sm text-muted-foreground">No driver found.</p>
            </div>
          </template>

          <template v-else-if="step === 'days' && driver">
            <p class="text-sm">Which days for {{ driver.displayName }}?</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="space-y-1 text-xs text-muted-foreground">
                From
                <Input v-model="fromDate" type="date" class="h-9" :max="toDate" />
              </label>
              <label class="space-y-1 text-xs text-muted-foreground">
                To
                <Input v-model="toDate" type="date" class="h-9" :min="fromDate" />
              </label>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" @click="step = 'driver'">Back</Button>
              <Button size="sm" :disabled="!fromDate || !toDate || fromDate > toDate" @click="openInAi">
                Open in AI
              </Button>
            </div>
          </template>
        </template>
      </div>

      <form
        v-if="step === 'ask'"
        class="flex items-center gap-2 border-t border-border px-3 py-2"
        @submit.prevent="submit"
      >
        <Plus class="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          v-model="draft"
          class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Write your question"
          aria-label="Your question"
          maxlength="2000"
        />
        <Button type="submit" size="icon" class="h-8 w-8 shrink-0 rounded-full" aria-label="Send" :disabled="!draft.trim()">
          <ArrowUp class="h-4 w-4" />
        </Button>
      </form>
    </section>

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
      :aria-label="open ? 'Close Llora AI' : 'Open Llora AI'"
      @click="open ? close() : (open = true)"
    >
      <Sparkles class="h-6 w-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ArrowUp, Plus, Sparkles, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAiHandoffStore } from '../store/aiHandoff'
import { matchDrivers, type AiDriverChoice } from '../utils/aiDrivers'

type Step = 'ask' | 'driver' | 'days'

const props = withDefaults(
  defineProps<{ drivers: AiDriverChoice[]; firstName?: string | null; defaultOpen?: boolean }>(),
  { firstName: null, defaultOpen: false }
)

const router = useRouter()
const handoff = useAiHandoffStore()

const open = ref(props.defaultOpen)
const step = ref<Step>('ask')
const draft = ref('')
const request = ref('')
const driverSearch = ref('')
const driver = ref<AiDriverChoice | null>(null)
// Same default range as the Boost page: the last 14 days.
const fromDate = ref(dayjs().subtract(14, 'day').format('YYYY-MM-DD'))
const toDate = ref(dayjs().format('YYYY-MM-DD'))

const firstName = computed(() => props.firstName?.trim() || 'there')
const suggestions = computed(() => matchDrivers(request.value, props.drivers))
const searchResults = computed(() => {
  const query = driverSearch.value.trim().toLowerCase()
  return props.drivers.filter((item) => item.displayName.toLowerCase().includes(query)).slice(0, 20)
})

function submit() {
  if (!draft.value.trim()) return
  request.value = draft.value.trim()
  draft.value = ''
  step.value = 'driver'
}

function pickDriver(choice: AiDriverChoice) {
  driver.value = choice
  step.value = 'days'
}

function reset() {
  step.value = 'ask'
  draft.value = ''
  request.value = ''
  driverSearch.value = ''
  driver.value = null
}

function close() {
  open.value = false
  reset()
}

async function openInAi() {
  const chosen = driver.value
  if (!chosen || !request.value) return
  handoff.set({ driverId: chosen.driverId, fromDate: fromDate.value, toDate: toDate.value, text: request.value })
  close()
  await router?.push({
    name: 'ELDAi',
    params: { id: chosen.driverId },
    query: { fromDate: fromDate.value, toDate: toDate.value },
  })
}
</script>

<style scoped>
.llora-orb {
  background:
    radial-gradient(circle at 30% 30%, #ffffff 0 8%, transparent 30%),
    radial-gradient(circle at 70% 35%, #a855f7 0 25%, transparent 55%),
    radial-gradient(circle at 35% 70%, #3b82f6 0 30%, transparent 60%),
    radial-gradient(circle at 70% 75%, #ec4899 0 20%, transparent 55%),
    #6366f1;
  box-shadow: 0 0 40px 12px rgb(99 102 241 / 0.25);
}
</style>
