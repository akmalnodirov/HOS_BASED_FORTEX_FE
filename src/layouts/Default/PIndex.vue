<template>
  <div class="min-h-screen bg-[#F0F0F0] dark:bg-sidebar">
    <!-- Sidebar -->
    <AppSidebar :is-open="isSidebarOpen" @update:is-open="isSidebarOpen = $event" />

    <!-- Overlay for mobile -->
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

    <!-- Toggle Button - floats above sidebar -->
    <CToggle :is-open="isSidebarOpen" @toggle="toggleSidebar" />

    <!-- Header -->
    <AppHeader :is-sidebar-open="isSidebarOpen" @toggle-sidebar="toggleSidebar" />

    <!-- Main Content -->
    <main
      class="pt-[65px] transition-all duration-300"
      :class="[isSidebarOpen ? 'lg:pl-[248px]' : 'lg:pl-0']"
    >
      <div>
        <router-view />
      </div>
    </main>
  </div>
</template>
<!-- src/Layouts/MainLayout.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/layouts/Default/components/AppSidebar.vue'
import AppHeader from '@/layouts/Default/components/AppHeader.vue'
import CToggle from '@/layouts/Default/components/CToggle.vue'

const route = useRoute()
const isSidebarOpen = ref(true)
const isMobile = ref(false)

// Check if mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

// Load sidebar state from localStorage
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  const savedState = localStorage.getItem('sidebar-open')
  if (savedState !== null && !isMobile.value) {
    isSidebarOpen.value = JSON.parse(savedState)
  }
})

// Save sidebar state to localStorage
watch(isSidebarOpen, (newValue) => {
  if (!isMobile.value) {
    localStorage.setItem('sidebar-open', JSON.stringify(newValue))
  }
})

// Close sidebar on mobile when route changes
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
