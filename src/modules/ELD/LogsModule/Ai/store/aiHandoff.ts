import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface AiHandoffRequest {
  driverId: string
  fromDate: string
  toDate: string
  text: string
}

/** Carries the launcher's request to the AI tab without putting it in the URL. */
export const useAiHandoffStore = defineStore('aiHandoff', () => {
  const pending = ref<AiHandoffRequest | null>(null)

  function set(request: AiHandoffRequest) {
    pending.value = { ...request }
  }

  function peek(driverId: string) {
    return pending.value?.driverId === driverId ? pending.value.text : null
  }

  /** Returns the text once and forgets it; call only after the message was sent. */
  function take(driverId: string) {
    const text = peek(driverId)
    if (text !== null) pending.value = null
    return text
  }

  return { pending, set, peek, take }
})
