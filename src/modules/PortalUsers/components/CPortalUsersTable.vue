<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { PortalUser, SortKey, SortOrder } from '@/modules/PortalUsers/types'

interface Props {
  users: PortalUser[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'toggle-status', user: PortalUser): void
  (e: 'edit', user: PortalUser): void
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-gray-50 dark:bg-gray-800">
          <TableHead class="w-16">
            <button
              @click="emit('sort', 'no')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'name')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Name
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'email')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Email
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'role')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Role
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    @click="emit('sort', 'phoneNumber')"
                    class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
                  >
                    Phone number
                    <SortIcon class="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Phone number clients</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'status')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Status
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead class="w-20">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="user in users"
          :key="user.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="font-medium">{{ user.no }}</TableCell>
          <TableCell>{{ user.name }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.role }}</TableCell>
          <TableCell>
            <p
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {{ user.phoneNumber }}
            </p>
          </TableCell>
          <TableCell>
            <Switch
              :model-value="user.status"
              @update:model-value="emit('toggle-status', user)"
              class="data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-gray-100"
            />
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" @click="emit('edit', user)" class="h-8 w-8">
              <Pencil class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
