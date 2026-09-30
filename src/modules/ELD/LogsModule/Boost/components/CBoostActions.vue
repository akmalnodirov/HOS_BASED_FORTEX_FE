<template>
  <div
    class="fixed bottom-0 right-0 bg-background border-t border-border shadow-lg z-50 transition-all duration-300"
    :class="[sidebarStore.sidebar === 'open' ? 'left-62' : 'left-0']"
  >
    <div class="px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <!-- Left Side: Empty (status buttons moved to toolbar) -->
        <div class="flex items-center gap-2"></div>

        <!-- Center: Empty (add buttons moved to toolbar) -->
        <div class="flex items-center gap-2"></div>

        <!-- Action Buttons (centered) -->
        <div class="flex items-center justify-end gap-2 flex-1">
          <!-- Delete Button -->
          <Button
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

            <span>Delete</span>
          </Button>

          <!-- Multi Update Button -->
          <Button
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="deleteDisabled"
            @click="$emit('multi-update-click')"
          >
            <span>Multi Update</span>
          </Button>

          <!-- Drag & Drop Button -->
          <Label
            class="hover:bg-accent/50 flex items-start gap-3 rounded border py-2.5 px-3 has-aria-checked:border-[#666666] has-aria-checked:bg-white dark:has-aria-checked:border-blue-900 dark:has-aria-checked:bg-blue-950"
          >
            <Checkbox
              id="toggle-2"
              :checked="dragDropEnabled"
              @update:checked="(v: boolean) => $emit('dragdrop-change', v)"
              class="border-[#DBDBDB] data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
            />
            <div class="grid gap-1.5 font-normal">
              <p class="text-sm leading-none font-medium">Drag & Drop</p>
            </div>
          </Label>

          <!-- Fullscreen Button -->
          <Button
            variant="outline"
            size="icon"
            class="h-9.5 w-9.5"
            @click="$emit('fullscreen-click')"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="text-foreground"
            >
              <g clip-path="url(#clip0_2908_56972)">
                <path
                  d="M14.6673 4.66699L9.42156 9.91275C9.15755 10.1768 9.02555 10.3088 8.87333 10.3582C8.73943 10.4017 8.5952 10.4017 8.46131 10.3582C8.30909 10.3088 8.17708 10.1768 7.91307 9.91274L6.08823 8.08791C5.82422 7.82389 5.69221 7.69189 5.54 7.64243C5.4061 7.59892 5.26187 7.59892 5.12797 7.64243C4.97575 7.69189 4.84375 7.82389 4.57974 8.08791L1.33398 11.3337M14.6673 4.66699H10.0007M14.6673 4.66699V9.33366"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_2908_56972">
                  <rect width="16" height="16" fill="currentColor" fill-opacity="0" />
                </clipPath>
              </defs>
            </svg>
          </Button>

          <!-- Optimize Button -->
          <Button
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            @click="$emit('optimize-click')"
          >
            <span>Optimize</span>
          </Button>

          <!-- Reset Button -->
          <Button
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="boostDisabled"
            @click="$emit('boost-click')"
          >
            <span>Boost</span>
          </Button>

          <!-- Escalate Button -->
          <Button
            variant="outline"
            size="sm"
            class="h-9.5 px-4 text-sm"
            :disabled="reassignDisabled"
            @click="$emit('reassign-click')"
          >
            <span>Reassign</span>
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Delete Events</DialogTitle>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        Are you sure you want to delete the selected events? This action cannot be undone.
      </p>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="showDeleteConfirm = false">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
import { useSidebarStore } from '@/modules/ELD/LogsModule/[Id]/store/sidebar'

const sidebarStore = useSidebarStore()

let cleanupListener = () => {}
onMounted(() => {
  cleanupListener = sidebarStore.setupStorageListener()
})
onUnmounted(() => {
  cleanupListener()
})

withDefaults(
  defineProps<{
    dragDropEnabled?: boolean
    deleteDisabled?: boolean
    boostDisabled?: boolean
    reassignDisabled?: boolean
  }>(),
  {
    dragDropEnabled: false,
    deleteDisabled: false,
    boostDisabled: false,
    reassignDisabled: false,
  }
)

const emit = defineEmits<{
  (e: 'delete-click'): void
  (e: 'dragdrop-change', enabled: boolean): void
  (e: 'fullscreen-click'): void
  (e: 'optimize-click'): void
  (e: 'boost-click'): void
  (e: 'reassign-click'): void
  (e: 'multi-update-click'): void
}>()

const showDeleteConfirm = ref(false)

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete-click')
}
</script>
