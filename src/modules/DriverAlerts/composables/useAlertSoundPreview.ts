import { onBeforeUnmount } from 'vue'
import { AlertMusicType, type AlertSound } from '@/modules/DriverAlerts/types'

export const ALERT_SOUNDS: AlertSound[] = [
  { type: AlertMusicType.Silent, label: 'Silent', bars: 1, src: null },
  {
    type: AlertMusicType.HighVolume,
    label: 'High volume',
    bars: 2,
    src: '/sounds/alert_high_volume.mp3',
  },
  { type: AlertMusicType.Loud, label: 'Loud', bars: 3, src: '/sounds/alert_loud.mp3' },
  { type: AlertMusicType.Noisy, label: 'Noisy', bars: 4, src: '/sounds/alert_noisy.mp3' },
  { type: AlertMusicType.Thunder, label: 'Thunder', bars: 5, src: '/sounds/alert_thunder.mp3' },
]

export function useAlertSoundPreview() {
  let audio: HTMLAudioElement | null = null

  const stop = () => {
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const play = (sound: AlertSound) => {
    stop()
    if (!sound.src) return
    audio ??= new Audio()
    audio.src = sound.src
    audio.play().catch(() => undefined)
  }

  onBeforeUnmount(() => {
    stop()
    audio = null
  })

  return { play, stop }
}
