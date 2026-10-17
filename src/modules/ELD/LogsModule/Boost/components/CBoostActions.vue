<template>
  <div class="sticky bottom-0 z-50 !mt-0 border-t border-border bg-background shadow-lg">
    <div class="px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2"></div>

        <div class="flex items-center gap-2"></div>

        <div class="flex items-center justify-end gap-2 flex-1">
          <Button
            v-if="canDelete"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="deleteDisabled"
            @click="showDeleteConfirm = true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="text-foreground"
            >
              <path
                d="M10.6667 3.99967V3.46634C10.6667 2.7196 10.6667 2.34624 10.5213 2.06102C10.3935 1.81014 10.1895 1.60616 9.93865 1.47833C9.65344 1.33301 9.28007 1.33301 8.53333 1.33301H7.46667C6.71993 1.33301 6.34656 1.33301 6.06135 1.47833C5.81046 1.60616 5.60649 1.81014 5.47866 2.06102C5.33333 2.34624 5.33333 2.7196 5.33333 3.46634V3.99967M6.66667 7.66634V10.9997M9.33333 7.66634V10.9997M2 3.99967H14M12.6667 3.99967V11.4663C12.6667 12.5864 12.6667 13.1465 12.4487 13.5743C12.2569 13.9506 11.951 14.2566 11.5746 14.4484C11.1468 14.6663 10.5868 14.6663 9.46667 14.6663H6.53333C5.41323 14.6663 4.85318 14.6663 4.42535 14.4484C4.04903 14.2566 3.74307 13.9506 3.55132 13.5743C3.33333 13.1465 3.33333 12.5864 3.33333 11.4663V3.99967"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <span>Delete{{ selectedSuffix }}</span>
          </Button>

          <Button
            v-if="canMultiUpdate"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="deleteDisabled"
            @click="$emit('multi-update-click')"
          >
            <span>Multi Update{{ selectedSuffix }}</span>
          </Button>

          <Label v-if="canEdit"
            class="hover:bg-accent/50 flex items-start gap-3 rounded border py-2.5 px-3 has-aria-checked:border-[#666666] has-aria-checked:bg-white dark:has-aria-checked:border-blue-900 dark:has-aria-checked:bg-blue-950"
            :class="!canEdit ? 'cursor-not-allowed opacity-50' : ''"
          >
            <Checkbox
              id="toggle-2"
              :model-value="dragDropEnabled"
              :disabled="!canEdit"
              @update:model-value="canEdit && $emit('dragdrop-change', $event === true)"
              class="border-[#DBDBDB] data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
            />
            <div class="grid gap-1.5 font-normal">
              <p class="text-sm leading-none font-medium">Drag & Drop</p>
            </div>
          </Label>

          <Button
            v-if="canBoost"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="durationDisabled"
            :title="durationTitle || 'Expand or reduce the selected event'"
            @click="$emit('duration-click')"
          >
            <span>Expand / Reduce{{ selectedSuffix }}</span>
          </Button>

          <Button
            v-if="canNormalize"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="normalizeDisabled"
            @click="$emit('normalize-click')"
          >
            <span>Normalize</span>
          </Button>

          <Button
            v-if="canCertification"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            @click="$emit('certification-click')"
          >
            <span>Certification</span>
          </Button>

          <Button
            v-if="canReassign"
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="reassignDisabled"
            @click="$emit('reassign-click')"
          >
            <span>Reassign / Replicate{{ selectedSuffix }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>

  <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Delete Events</DialogTitle>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        Are you sure you want to delete {{ selectedCount }} selected
        {{ selectedCount === 1 ? 'event' : 'events' }}?
      </p>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="showDeleteConfirm = false">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
const props = withDefaults(
  defineProps<{
    dragDropEnabled?: boolean
    canEdit?: boolean
    canDelete?: boolean
    canMultiUpdate?: boolean
    canBoost?: boolean
    canNormalize?: boolean
    canCertification?: boolean
    canReassign?: boolean
    deleteDisabled?: boolean
    reassignDisabled?: boolean
    durationDisabled?: boolean
    durationTitle?: string
    normalizeDisabled?: boolean
    selectedCount?: number
  }>(),
  {
    dragDropEnabled: false,
    canEdit: false,
    canDelete: false,
    canMultiUpdate: false,
    canBoost: false,
    canNormalize: false,
    canCertification: false,
    canReassign: false,
    deleteDisabled: false,
    reassignDisabled: false,
    durationDisabled: false,
    durationTitle: '',
    normalizeDisabled: false,
    selectedCount: 0,
  }
)

const selectedSuffix = computed(() => (props.selectedCount > 0 ? ` (${props.selectedCount})` : ''))

const emit = defineEmits<{
  (e: 'delete-click'): void
  (e: 'dragdrop-change', enabled: boolean): void
  (e: 'fullscreen-click'): void
  (e: 'reassign-click'): void
  (e: 'multi-update-click'): void
  (e: 'normalize-click'): void
  (e: 'certification-click'): void
  (e: 'duration-click'): void
}>()

const showDeleteConfirm = ref(false)

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete-click')
}
</script>
