<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="sm:max-w-[480px]"
      @escape-key-down="loading && $event.preventDefault()"
      @interact-outside="loading && $event.preventDefault()"
      @pointer-down-outside="loading && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Edit Profile Form</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-1">
          <label class="text-sm font-medium">Date</label>
          <Input :model-value="form.date" disabled class="bg-muted" />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Co-Driver</label>
          <div class="relative">
            <Select
              :model-value="form.coDriver ?? ''"
              @update:model-value="(v) => patch({ coDriver: v ? String(v) : null })"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Co-Driver" />
              </SelectTrigger>
              <SelectContent class="max-h-60">
                <SelectItem
                  v-if="
                    form.coDriver &&
                    !form.coDrivers.some((driver) => driver.driverId === form.coDriver)
                  "
                  :value="form.coDriver"
                >
                  {{ form.coDriverName || form.coDriver }}
                </SelectItem>
                <SelectItem
                  v-for="driver in form.coDrivers"
                  :key="driver.driverId"
                  :value="driver.driverId"
                >
                  {{ driver.firstName }} {{ driver.lastName }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              v-if="form.coDriver"
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-destructive"
              @click.stop="patch({ coDriver: null })"
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <p v-if="cargoError" class="text-xs text-destructive">{{ cargoError }}</p>

        <div class="space-y-1">
          <label class="text-sm font-medium">Trailer</label>
          <Input
            :model-value="form.trailer ?? ''"
            @update:model-value="(value) => patch({ trailer: String(value || '') || null })"
            placeholder="Trailer"
            maxlength="100"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Shipping docs</label>
          <Input
            :model-value="form.shippingDocs ?? ''"
            @update:model-value="(value) => patch({ shippingDocs: String(value || '') || null })"
            placeholder="Shipping docs"
            maxlength="100"
          />
        </div>

        <DialogFooter class="flex gap-2">
          <div class="flex gap-2 ml-auto">
            <Button type="button" variant="secondary" :disabled="loading" @click="onOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="loading || Boolean(cargoError)">
              {{ loading ? 'Saving...' : 'Save' }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BoostEventEditProfile } from '../../types/boost.ts'

interface Props {
  open: boolean
  form: BoostEventEditProfile
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [form: BoostEventEditProfile]
  'update:form': [form: Partial<BoostEventEditProfile>]
}>()

function patch(partial: Partial<BoostEventEditProfile>) {
  emit('update:form', partial)
}

const cargoError = computed(() => {
  const trailers = (props.form.trailer ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const documents = (props.form.shippingDocs ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  return !trailers.length && documents.length
    ? 'Shipping documents require at least one trailer.'
    : ''
})

function handleSubmit() {
  if (props.loading || cargoError.value) return
  emit('submit', props.form)
}

function onOpenChange(open: boolean) {
  if (!open && props.loading) return
  emit('update:open', open)
}
</script>
