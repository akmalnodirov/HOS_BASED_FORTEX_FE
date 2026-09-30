<template>
  <div class="min-h-screen bg-white p-[16px_24px] text-gray-800">
    <div v-if="isLoading" class="flex items-center justify-center min-h-100">
      <div class="text-gray-600">Loading...</div>
    </div>

    <div v-else class="max-w-350 mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <h2 class="text-2xl font-semibold text-gray-900">Company edit</h2>
        <div class="flex items-center gap-3">
          <Button
            variant="outline"
            @click="goBack"
            :disabled="isSaving"
            class="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-10 px-6"
          >
            Cancel
          </Button>
          <Button
            @click="handleSave"
            :disabled="isSaving"
            class="bg-[#1A1A1A] hover:bg-black text-white h-10 px-8 rounded-md"
          >
            <span v-if="!isSaving">Save</span>
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
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          </Button>
        </div>
      </div>

      <form @submit.prevent="handleSave" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          <!-- General Information Section -->
          <div class="space-y-6">
            <h3 class="text-sm font-bold text-gray-600 uppercase tracking-tight">
              GENERAL INFORMATION
            </h3>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2 space-y-1">
                <div class="w-full">
                  <Input
                    id="carrierName"
                    v-model="formData.carrierName"
                    placeholder="Carrier name"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <div class="w-full">
                  <Input
                    id="dotNumber"
                    v-model="formData.dotNumber"
                    placeholder="Dot number"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <div class="w-full">
                  <Select v-model="formData.timeZoneId" :disabled="isSaving">
                    <SelectTrigger
                      id="timeZone"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="Carrier Time Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in timeZoneOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="space-y-1">
                <div class="w-full">
                  <Input
                    id="address"
                    v-model="formData.address"
                    placeholder="Carrier Address"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <div class="w-full">
                  <Input
                    id="address2"
                    v-model="formData.address2"
                    placeholder="Carrier Address"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>

              <div class="col-span-2 space-y-1">
                <div class="w-full">
                  <Select
                    v-model="companyCountryId"
                    :disabled="isSaving || isLoadingParents"
                    @update:model-value="
                      (value) => {
                        const val = value as string
                        companyCountryId = val
                        formData.countryId = val
                        const country = countryOptions.find((c) => c.id === val)
                        if (country) {
                          formData.country = country.name
                        }
                      }
                    "
                  >
                    <SelectTrigger
                      id="country"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="United States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in countryOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-2 space-y-1">
                <div class="w-full">
                  <Select
                    v-model="companyStateId"
                    :disabled="isSaving || isLoadingStates || !companyCountryId"
                    @update:model-value="
                      (value) => {
                        const val = value as string
                        companyStateId = val
                        formData.stateId = val
                        const state = stateOptions.find((s) => s.id === val)
                        if (state) {
                          formData.state = state.name
                        }
                      }
                    "
                  >
                    <SelectTrigger
                      id="state"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="Missouri" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in stateOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-2 space-y-1">
                <div class="w-full">
                  <Input
                    id="cityCode"
                    v-model="formData.cityCode"
                    placeholder="City code"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Carrier Settings Section -->
          <div class="space-y-6">
            <h3 class="text-sm font-bold text-gray-600 uppercase tracking-tight">
              CARRIER SETTINGS
            </h3>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-1">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="exemptDriver"
                    v-model:checked="formData.exemptDriver"
                    :disabled="isSaving"
                  />
                  <Label for="exemptDriver" class="cursor-pointer text-gray-600 font-medium">
                    Exempt driver
                  </Label>
                </div>
              </div>

              <div class="col-span-1">
                <div class="w-full h-11">
                  <Input
                    id="periodStartingTime"
                    v-model="formData.periodStartingTime"
                    type="time"
                    placeholder="24H Period Starting Time"
                    :disabled="isSaving"
                    class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                  />
                </div>
              </div>

              <div class="col-span-1">
                <div class="w-full">
                  <Select v-model="formData.hosRuleId" :disabled="isSaving">
                    <SelectTrigger
                      id="hosRoles"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="HOS Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in hosRolesOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-1">
                <div class="w-full">
                  <Select v-model="formData.cargoTypeId" :disabled="isSaving">
                    <SelectTrigger
                      id="cargoType"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="Cargo Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in cargoTypeOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-1">
                <div class="w-full">
                  <Select v-model="formData.restartId" :disabled="isSaving">
                    <SelectTrigger
                      id="restart"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="Restart" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in restartOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-1">
                <div class="w-full">
                  <Select v-model="formData.restBreakId" :disabled="isSaving">
                    <SelectTrigger
                      id="restBreak"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    >
                      <SelectValue placeholder="Rest Break" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in restBreakOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="col-span-2">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="shortHaulException"
                    v-model:checked="formData.shortHaulException"
                    :disabled="isSaving"
                  />
                  <Label for="shortHaulException" class="cursor-pointer text-gray-600 font-medium"
                    >Shor-Haul Exception</Label
                  >
                </div>
              </div>

              <div class="col-span-1">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="allowYardMoves"
                    v-model:checked="formData.allowYardMoves"
                    :disabled="isSaving"
                  />
                  <Label for="allowYardMoves" class="cursor-pointer text-gray-600 font-medium"
                    >Allow Yard Moves</Label
                  >
                </div>
              </div>

              <div class="col-span-1">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="allowPersonalUse"
                    v-model:checked="formData.allowPersonalUse"
                    :disabled="isSaving"
                  />
                  <Label for="allowPersonalUse" class="cursor-pointer text-gray-600 font-medium"
                    >Allow Personal Use</Label
                  >
                </div>
              </div>

              <div class="col-span-1">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="unlimitedTrailer"
                    v-model:checked="formData.unlimitedTrailer"
                    :disabled="isSaving"
                  />
                  <Label for="unlimitedTrailer" class="cursor-pointer text-gray-600 font-medium">
                    Unlimited trailer
                  </Label>
                </div>
              </div>

              <div class="col-span-1">
                <div
                  class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
                >
                  <Checkbox
                    id="unlimitedShippingDocs"
                    v-model:checked="formData.unlimitedShippingDocs"
                    :disabled="isSaving"
                  />
                  <Label
                    for="unlimitedShippingDocs"
                    class="cursor-pointer text-gray-600 font-medium"
                  >
                    Unlimited shipping dosc
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <!-- Plan Features Section -->
          <div class="col-span-1 lg:col-span-2 border-t border-gray-200 pt-8 space-y-6">
            <h3 class="text-sm font-bold text-gray-600 uppercase tracking-tight">Plan Features</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
              >
                <Checkbox
                  id="allowTracking"
                  v-model:checked="formData.allowTracking"
                  :disabled="isSaving"
                />
                <Label for="allowTracking" class="cursor-pointer text-gray-700 font-medium">
                  Allow Tracking
                </Label>
              </div>

              <div
                class="flex items-center space-x-3 px-4 py-2 bg-[#F7F7F7] border border-[#DBDBDB] cursor-pointer rounded-md transition-colors h-11"
              >
                <Checkbox
                  id="allowIFTA"
                  v-model:checked="formData.allowIFTA"
                  :disabled="isSaving"
                />
                <Label for="allowIFTA" class="cursor-pointer text-gray-700 font-medium">
                  Allow IFTA
                </Label>
              </div>
            </div>
          </div>

          <!-- Terminals Section -->
          <div class="col-span-1 lg:col-span-2 border-t border-gray-200 pt-8">
            <div
              v-for="(terminal, index) in company.terminals"
              :key="terminal.id"
              class="space-y-6 mb-8"
            >
              <h3 class="text-sm font-bold text-gray-900 uppercase tracking-tight">
                {{ terminal.name }}
              </h3>
              <div class="grid grid-cols-2 gap-4 max-w-200">
                <div class="col-span-2">
                  <div class="w-full">
                    <Input
                      :id="`terminal-timezone-${index}`"
                      v-model="terminal.timeZone"
                      placeholder="Carrier Time Zone"
                      :disabled="isSaving"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-sm focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    />
                  </div>
                </div>

                <div class="col-span-1">
                  <div class="w-full">
                    <Input
                      :id="`terminal-address-${index}`"
                      v-model="terminal.address"
                      placeholder="Carrier Address"
                      :disabled="isSaving"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    />
                  </div>
                </div>

                <div class="col-span-1">
                  <div class="w-full">
                    <Input
                      :id="`terminal-address2-${index}`"
                      placeholder="Carrier Address"
                      :disabled="isSaving"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    />
                  </div>
                </div>

                <div class="col-span-1">
                  <div class="w-full">
                    <Select
                      :model-value="terminal.country"
                      @update:model-value="
                        (value) => {
                          const val = value as string
                          terminal.country = val
                          const country = countryOptions.find((c) => c.id === val || c.name === val)
                          if (country) {
                            terminal.country = country.name
                          }
                        }
                      "
                      :disabled="isSaving || isLoadingParents"
                    >
                      <SelectTrigger
                        :id="`terminal-country-${index}`"
                        class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                      >
                        <SelectValue placeholder="United States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="option in countryOptions"
                          :key="option.id"
                          :value="option.id"
                        >
                          {{ option.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div class="col-span-1">
                  <div class="w-full">
                    <Select
                      :model-value="terminal.state"
                      @update:model-value="
                        (value) => {
                          const val = value as string
                          const state = stateOptions.find((s) => s.id === val || s.name === val)
                          if (state) {
                            terminal.state = state.name
                          }
                        }
                      "
                      :disabled="isSaving || isLoadingStates || !terminal.country"
                    >
                      <SelectTrigger
                        :id="`terminal-state-${index}`"
                        class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                      >
                        <SelectValue placeholder="Pennsylvania" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="option in stateOptions"
                          :key="option.id"
                          :value="option.id"
                        >
                          {{ option.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div class="col-span-2 text-sm">
                  <div class="w-full">
                    <Input
                      :id="`terminal-city-${index}`"
                      v-model="terminal.cityCode"
                      placeholder="City code"
                      :disabled="isSaving"
                      class="w-full border-[#E5E7EB] bg-white text-gray-800 placeholder:text-gray-400 rounded-[4px] focus:ring-0 focus:border-[#9CA3AF] focus:outline-none shadow-none h-11"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Add New Terminal Button -->
            <div class="flex justify-start mt-6">
              <Button
                type="button"
                @click="openAddTerminalModal"
                class="bg-[#1A1A1A] hover:bg-black text-white px-6 h-11 rounded-md flex items-center gap-2"
                :disabled="isSaving"
              >
                <span class="text-xl">+</span>
                Add New Terminal
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Add Terminal Modal -->
    <TerminalModal
      :open="isTerminalModalOpen"
      :terminal-count="company.terminals.length"
      @close="closeTerminalModal"
      @save="handleAddTerminal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCompany } from '@/modules/Company/composables/useCompany'
import type { CompanyFormData, TerminalFormData } from '@/modules/Company/types'
import TerminalModal from '@/modules/Company/components/CTerminalModal.vue'

const router = useRouter()
const {
  company,
  isLoading,
  isSaving,
  timeZoneOptions,
  countryOptions,
  stateOptions,
  hosRolesOptions,
  cargoTypeOptions,
  restartOptions,
  restBreakOptions,
  isLoadingParents,
  isLoadingStates,
  selectedCountryId,
  selectedStateId,
  loadCompany,
  updateCompany,
  addTerminal,
  initializeData,
} = useCompany()

const formData = ref<CompanyFormData>({
  carrierName: '',
  dotNumber: '',
  timeZone: '',
  timeZoneId: '',
  phoneNumber: '',
  email: '',
  address: '',
  address2: '',
  country: '',
  countryId: '',
  state: '',
  stateId: '',
  cityCode: '',
  zipCode: '',
  exemptDriver: false,
  periodStartingTime: '',
  hosRoles: '',
  hosRuleId: '',
  cargoType: '',
  cargoTypeId: '',
  restart: '',
  restartId: '',
  restBreak: '',
  restBreakId: '',
  shortHaulException: false,
  allowPersonalUse: false,
  allowYardMoves: false,
  unlimitedShippingDocs: false,
  unlimitedTrailer: false,
  isAllowedSleep: true,
  allowTracking: false,
  allowIFTA: false,
})

const isTerminalModalOpen = ref(false)
const companyCountryId = ref<string>('')
const companyStateId = ref<string>('')

// Watch for country changes to filter states
watch(
  () => companyCountryId.value,
  (newCountryId) => {
    selectedCountryId.value = newCountryId
    // Reset state when country changes
    if (companyStateId.value) {
      const stateExists = stateOptions.value.some((s) => s.id === companyStateId.value)
      if (!stateExists) {
        companyStateId.value = ''
        formData.value.state = ''
      }
    }
  }
)

// Watch for stateOptions changes to update state ID when options load
watch(
  () => stateOptions.value,
  () => {
    if (formData.value.state && !companyStateId.value) {
      const state = stateOptions.value.find((s) => s.name === formData.value.state)
      if (state) {
        companyStateId.value = state.id
      }
    }
  }
)

// Load form data from company
watch(
  () => company.value,
  (companyData) => {
    if (companyData && companyData.carrierId) {
      formData.value = {
        carrierName: companyData.carrierName,
        dotNumber: companyData.dotNumber,
        timeZone: companyData.timeZone,
        timeZoneId: companyData.timeZoneId,
        phoneNumber: companyData.phoneNumber || '',
        email: companyData.email || '',
        address: companyData.address,
        address2: companyData.address2 || '',
        country: companyData.country,
        countryId: companyData.countryId,
        state: companyData.state,
        stateId: companyData.stateId,
        cityCode: companyData.cityCode,
        zipCode: companyData.zipCode || '',
        exemptDriver: companyData.exemptDriver,
        periodStartingTime: companyData.periodStartingTime,
        hosRoles: companyData.hosRoles,
        hosRuleId: companyData.hosRuleId,
        cargoType: companyData.cargoType,
        cargoTypeId: companyData.cargoTypeId,
        restart: companyData.restart,
        restartId: companyData.restartId,
        restBreak: companyData.restBreak,
        restBreakId: companyData.restBreakId,
        shortHaulException: companyData.shortHaulException,
        allowPersonalUse: companyData.allowPersonalUse,
        allowYardMoves: companyData.allowYardMoves,
        unlimitedShippingDocs: companyData.unlimitedShippingDocs,
        unlimitedTrailer: companyData.unlimitedTrailer,
        isAllowedSleep: companyData.isAllowedSleep ?? true,
        allowTracking: companyData.allowTracking,
        allowIFTA: companyData.allowIFTA,
      }
      // Set country/state IDs
      if (companyData.countryId) {
        companyCountryId.value = companyData.countryId
        selectedCountryId.value = companyData.countryId
      }
      if (companyData.stateId) {
        companyStateId.value = companyData.stateId
      }
    }
  },
  { immediate: true }
)

const handleSave = async () => {
  try {
    await updateCompany(formData.value)
    router.push({ name: 'Company' })
  } catch (error) {
    console.error('Error saving company:', error)
  }
}

const goBack = () => {
  router.push({ name: 'Company' })
}

const openAddTerminalModal = () => {
  isTerminalModalOpen.value = true
}

const closeTerminalModal = () => {
  isTerminalModalOpen.value = false
}

const handleAddTerminal = async (terminalData: TerminalFormData) => {
  const previousTerminals = [...company.value.terminals]
  try {
    await addTerminal(terminalData)
    await updateCompany(formData.value)
    closeTerminalModal()
  } catch (error) {
    company.value.terminals = previousTerminals
    console.error('Error adding terminal:', error)
  }
}

onMounted(async () => {
  await initializeData()
  await loadCompany()
  // Set initial country/state IDs if company data exists
  if (company.value.country) {
    const country = countryOptions.value.find((c) => c.name === company.value.country)
    if (country) {
      companyCountryId.value = country.id
      selectedCountryId.value = country.id
    }
  }
  if (company.value.state) {
    const state = stateOptions.value.find((s) => s.name === company.value.state)
    if (state) {
      companyStateId.value = state.id
    }
  }
})
</script>
