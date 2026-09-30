<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Edit Profile Form</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Date display -->
        <div class="space-y-1">
          <label class="text-sm font-medium">Date</label>
          <Input :value="form.date" disabled class="bg-muted" />
        </div>

        <!-- Co-Driver -->
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

        <!-- Trailer -->
        <div class="space-y-1">
          <label class="text-sm font-medium">Trailer</label>
          <Input
            :value="form.trailer ?? ''"
            @input="onStringInput('trailer', $event)"
            placeholder="Trailer"
            maxlength="100"
          />
        </div>

        <!-- Shipping Docs -->
        <div class="space-y-1">
          <label class="text-sm font-medium">Shipping docs</label>
          <Input
            :value="form.shippingDocs ?? ''"
            @input="onStringInput('shippingDocs', $event)"
            placeholder="Shipping docs"
            maxlength="100"
          />
        </div>

        <!-- Signature Path -->
        <div class="space-y-1">
          <label class="text-sm font-medium">Signature Path</label>
          <div class="relative">
            <Input
              :value="form.signature ?? ''"
              @input="onStringInput('signature', $event)"
              placeholder="Signature Path"
              class="pr-8"
            />
            <Button
              v-if="form.signature"
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-destructive"
              @click="patch({ signature: null })"
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
          <!-- Signature dropdown -->
          <div v-if="form.signaturePaths.length" class="flex flex-wrap gap-1 mt-1">
            <Button
              v-for="path in form.signaturePaths"
              :key="path"
              type="button"
              variant="outline"
              size="sm"
              class="text-xs h-7 max-w-[200px] truncate"
              :class="form.signature === path ? 'border-primary text-primary' : ''"
              @click="patch({ signature: path })"
            >
              {{ shortPath(path) }}
            </Button>
          </div>
        </div>

        <Separator />

        <DialogFooter class="flex gap-2">
          <Button
            v-if="form.dailyFormId"
            type="button"
            variant="destructive"
            :disabled="loading"
            @click="$emit('revert', form)"
          >
            Revert
          </Button>
          <div class="flex gap-2 ml-auto">
            <Button type="button" variant="secondary" @click="$emit('update:open', false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save' }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
  revert: [form: BoostEventEditProfile]
  'update:form': [form: BoostEventEditProfile]
}>()

function patch(partial: Partial<BoostEventEditProfile>) {
  emit('update:form', { ...props.form, ...partial })
}

function onStringInput(field: keyof BoostEventEditProfile, e: Event) {
  const val = (e.target as HTMLInputElement).value
  patch({ [field]: val || null } as Partial<BoostEventEditProfile>)
}

function shortPath(path: string) {
  const parts = path.split('/')
  return parts.at(-1) ?? path
}

function handleSubmit() {
  emit('submit', props.form)
}
</script>
