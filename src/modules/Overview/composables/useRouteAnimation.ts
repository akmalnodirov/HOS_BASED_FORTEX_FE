import { reactive, ref, onBeforeUnmount } from 'vue'
import { calculateBearing, calculateDistance } from '../utils/mapUtils'
import { precomputePathDistances } from '../utils/routeUtils'
import {
  DEFAULT_SPEED_MS,
  MINIMUM_SPEED_MS,
  MINIMUM_DISTANCE_THRESHOLD,
  TRACKING_UPDATE_PERIOD,
} from '@/utils/constants'

export const useRouteAnimation = () => {
  // Animation configuration
  const ANIMATION_CONFIG = {
    DEFAULT_SPEED_MS,
    MINIMUM_SPEED_MS,
    MINIMUM_DISTANCE_THRESHOLD,
    TRACKING_UPDATE_PERIOD,
  }

  const truckHeading = ref<number>(0)

  const animationState = reactive({
    path: [] as any[], // Current route path points
    segmentLengths: [] as number[], // Distance of each segment
    cumulativeLengths: [] as number[], // Cumulative distances
    totalDistance: 0, // Total route distance
    currentDistance: 0, // Current traveled distance
    allowedDistance: 0, // How far we can travel (from backend)
    isAnimating: false,
    animationSpeed: ANIMATION_CONFIG.DEFAULT_SPEED_MS, // meters per second, will be dynamic
    lastTimestamp: 0,
    rafHandle: null as number | null,
    legStartDist: 0, // distance at the beginning of current leg
    lastUnlockTime: null as number | null,
    nextUnlockTime: null as number | null,
    TRACKING_UPDATE_PERIOD: ANIMATION_CONFIG.TRACKING_UPDATE_PERIOD,
  })

  /**
   * Get interpolated position at a specific distance along the route
   */
  const getPositionAtDistance = (distance: number): any => {
    if (!animationState.path.length) return null

    // Clamp distance to valid range
    // distance = Math.max(0, Math.min(distance, animationState.totalDistance));
    // Use slightly less than total distance to avoid index out of bounds on exact match
    const safeTotalDistance = Math.max(0, animationState.totalDistance - 0.001)
    distance = Math.max(0, Math.min(distance, safeTotalDistance))

    // Binary search to find current segment
    const cumLens = animationState.cumulativeLengths
    let lo = 0,
      hi = cumLens.length - 1

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (cumLens[mid] < distance) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }

    const segmentIndex = Math.max(1, lo) - 1
    const nextIndex = segmentIndex + 1

    if (nextIndex >= animationState.path.length) {
      return animationState.path[animationState.path.length - 1]
    }

    // Interpolate within segment
    const segmentStart = cumLens[segmentIndex]
    const segmentLength = animationState.segmentLengths[segmentIndex] || 1e-6
    const segmentProgress = Math.max(0, Math.min(1, (distance - segmentStart) / segmentLength))

    const p1 = animationState.path[segmentIndex]
    const p2 = animationState.path[nextIndex]

    return {
      lat: p1.lat + (p2.lat - p1.lat) * segmentProgress,
      lng: p1.lng + (p2.lng - p1.lng) * segmentProgress,
    }
  }

  /**
   * Calculate truck heading (direction) based on movement along the route
   */
  const calculateHeading = (currentPos: any, lookAheadDistance = 10): number => {
    // Look ahead logic
    const lookAheadDist = Math.min(
      animationState.currentDistance + lookAheadDistance,
      animationState.totalDistance
    )
    const lookAheadPos = getPositionAtDistance(lookAheadDist)

    // If positions are too close or invalid, keep old heading
    if (
      !lookAheadPos ||
      (Math.abs(lookAheadPos.lat - currentPos.lat) < 0.000001 &&
        Math.abs(lookAheadPos.lng - currentPos.lng) < 0.000001)
    ) {
      return truckHeading.value
    }

    return calculateBearing(currentPos, lookAheadPos)
  }

  /**
   * Animation frame callback
   */
  const animationFrame = (timestamp: number, updateCallback: (pos: any) => void) => {
    if (!animationState.isAnimating) return

    const deltaTime = animationState.lastTimestamp
      ? (timestamp - animationState.lastTimestamp) / 1000
      : 0
    animationState.lastTimestamp = timestamp

    // Progress at constant speed
    const maxMovement = animationState.animationSpeed * deltaTime
    animationState.currentDistance = Math.min(
      animationState.currentDistance + maxMovement,
      animationState.allowedDistance
    )

    const currentPos = getPositionAtDistance(animationState.currentDistance)
    if (currentPos) {
      // Calculate and update heading
      const heading = calculateHeading(currentPos)
      truckHeading.value = heading

      // Call callback to update UI/Map
      updateCallback(currentPos)
    }

    // Continue animation
    if (animationState.currentDistance < animationState.totalDistance) {
      animationState.rafHandle = requestAnimationFrame((t) => animationFrame(t, updateCallback))
    } else {
      console.log('🏁 Animation completed')
      animationState.isAnimating = false
      animationState.rafHandle = null
    }
  }

  /**
   * Start the truck animation
   */
  const startAnimation = (updateCallback: (pos: any) => void) => {
    // Stop any existing animation
    stopAnimation()

    if (animationState.path.length === 0) {
      console.warn('⚠️ Cannot start animation: no path defined')
      return
    }

    animationState.isAnimating = true
    animationState.lastTimestamp = 0
    animationState.legStartDist = 0
    animationState.currentDistance = 0
    animationState.allowedDistance = animationState.totalDistance
    animationState.lastUnlockTime = null
    animationState.nextUnlockTime = null

    animationState.rafHandle = requestAnimationFrame((t) => animationFrame(t, updateCallback))
    console.log('🎬 Animation started')
  }

  /**
   * Stop the truck animation
   */
  const stopAnimation = () => {
    if (animationState.rafHandle) {
      cancelAnimationFrame(animationState.rafHandle)
      animationState.rafHandle = null
    }
    animationState.isAnimating = false
  }

  /**
   * Update animation path with new route points
   */
  const updateAnimationPath = (pathPoints: any[]) => {
    if (!pathPoints || pathPoints.length < 2) return

    const result = precomputePathDistances(pathPoints)
    Object.assign(animationState, result)
  }

  // Cleanup on unmount to prevent memory leaks
  onBeforeUnmount(() => {
    stopAnimation()
  })

  return {
    truckHeading,
    animationState,
    startAnimation,
    stopAnimation,
    updateAnimationPath,
    ANIMATION_CONFIG,
  }
}
