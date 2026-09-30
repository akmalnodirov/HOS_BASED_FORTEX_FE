import { calculateDistance } from './mapUtils'

export const chunkArray = (array: any, size: any) => {
  const results = []
  for (let i = 0; i < array.length; i += size) {
    var segment = array.slice(i, Math.min(i + size, array.length))
    if (segment.length > 0) results.push(segment)
  }
  return results
}

export const precomputePathDistances = (pathPoints: any[]) => {
  if (!pathPoints || pathPoints.length < 2) {
    return {
      path: [],
      segmentLengths: [],
      cumulativeLengths: [0],
      totalDistance: 0,
      milestones: [0],
    }
  }

  const segLens: number[] = []
  const cumLens: number[] = [0]
  let totalDist = 0

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const dist = calculateDistance(pathPoints[i], pathPoints[i + 1])
    segLens.push(dist)
    totalDist += dist
    cumLens.push(totalDist)
  }

  return {
    path: pathPoints,
    segmentLengths: segLens,
    cumulativeLengths: cumLens,
    totalDistance: totalDist,
    milestones: cumLens.slice(),
  }
}

export const removeDuplicatePoints = (points: any[], minDistanceMeters: number = 10): any[] => {
  if (!points || points.length === 0) return []

  const uniquePoints = [points[0]] // Always keep first point

  for (let i = 1; i < points.length; i++) {
    const prev = uniquePoints[uniquePoints.length - 1]
    const current = points[i]

    // Calculate distance in meters
    const dist = calculateDistance(prev, current)

    // Only add if distance is greater than minimum
    if (dist > minDistanceMeters) {
      uniquePoints.push(current)
    }
  }

  return uniquePoints
}
