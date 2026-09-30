<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[#E5E5E5] dark:bg-background p-4">
    <div class="w-full max-w-[434px]">
      <!-- Card -->
      <div class="bg-white dark:bg-card rounded-lg shadow-sm dark:shadow-lg border border-gray-200 dark:border-border p-8">
        <!-- Logo and Title -->
        <div class="flex justify-center gap-2 items-center mb-5">
          <div class="w-[28px] h-[28px] rounded-lg flex items-center justify-center">
            <img src="/images/logo.svg" alt="Logo" class="dark:hidden" />
            <img src="/images/logo-white.svg" alt="Logo" class="hidden dark:block" />
          </div>
          <h1 class="text-xl text-[#090909] dark:text-foreground">Unione</h1>
        </div>

        <!-- Form -->
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <!-- Username Field -->
          <div class="space-y-2">
            <!--            <Label for="username" class="text-sm font-medium text-gray-700"> Username </Label>-->
            <Input
              id="username"
              v-model="username"
              type="text"
              placeholder="Username"
              :class="errors.username ? 'h-11 border-red-500 focus-visible:ring-red-500' : 'h-11'"
              :disabled="isLoading"
              @input="clearError('username')"
            />
            <p v-if="errors.username" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.username }}
            </p>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <!--            <Label for="password" class="text-sm font-medium text-gray-700"> Password </Label>-->
            <div class="relative">
              <Input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                :class="
                  errors.password
                    ? 'h-11 pr-10 border-red-500 focus-visible:ring-red-500'
                    : 'h-11 pr-10'
                "
                :disabled="isLoading"
                @input="clearError('password')"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                :disabled="isLoading"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.password }}
            </p>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            :disabled="isLoading"
            class="w-full h-11 bg-[#090909] hover:bg-[#090909]/90 text-white font-medium shadow-none border-none outline-none"
          >
            <span v-if="!isLoading">Login</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>
<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { useLogin } from '@/modules/Auth/composables/useLogin'

const { username, password, isLoading, errors, clearError, handleSubmit } = useLogin()
const showPassword = ref(false)
</script>
