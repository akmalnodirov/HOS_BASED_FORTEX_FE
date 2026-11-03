<template>
  <div class="min-h-screen bg-[#F0F0F0] dark:bg-sidebar">
    <AppSidebar :is-open="isSidebarOpen" @update:is-open="isSidebarOpen = $event" />

    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isSidebarOpen && isMobile"
        class="fixed inset-0 bg-black/50 z-30 lg:hidden"
        @click="isSidebarOpen = false"
      />
    </Transition>

    <CToggle :is-open="isSidebarOpen" @toggle="toggleSidebar" />

    <AppHeader :is-sidebar-open="isSidebarOpen" @toggle-sidebar="toggleSidebar" />

    <main
      class="pt-[65px] transition-all duration-300"
      :class="[isSidebarOpen ? 'lg:pl-[248px]' : 'lg:pl-0', isViewportPage && 'h-dvh overflow-hidden']"
    >
      <div :class="isAuditPage && 'h-full min-h-0'">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/layouts/Default/components/AppSidebar.vue'
import AppHeader from '@/layouts/Default/components/AppHeader.vue'
import CToggle from '@/layouts/Default/components/CToggle.vue'

const route = useRoute()
const isBoardPage = computed(() => ['/report/tasks', '/report/activity', '/report/checker', '/report/assistant'].includes(route.path))
const isAuditPage = computed(() => route.path === '/tools/audit' || route.path.startsWith('/tools/audit/'))
const isViewportPage = computed(() => isBoardPage.value || isAuditPage.value)
const isSidebarOpen = ref(true)
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  const savedState = localStorage.getItem('sidebar-open')
  if (savedState !== null && !isMobile.value) {
    isSidebarOpen.value = JSON.parse(savedState)
  }
})

watch(isSidebarOpen, (newValue) => {
  if (!isMobile.value) {
    localStorage.setItem('sidebar-open', JSON.stringify(newValue))
  }
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) {
      isSidebarOpen.value = false
    }
  }
)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>
<!--:class="{ 'p-6': route.name !== 'Overview' && route.name !== 'OverviewDetail' }"-->
