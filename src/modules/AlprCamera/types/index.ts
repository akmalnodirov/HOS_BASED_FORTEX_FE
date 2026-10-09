export interface AlprLocation {
  longitude: number
  latitude: number
  label: string
}

export interface AlprGeoPoint {
  longitude: number
  latitude: number
}

export interface AlprCameraCluster {
  longitude: number
  latitude: number
  count: number
}

export interface AlprCameraClusterCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: [number, number]
    }
    properties: {
      count: number
    }
  }>
}

export interface AlprMapCamera {
  id: number
  source: string
  displayName: string
  longitude: number
  latitude: number
  bearings: number[]
  bearingConfidence: string
  brand: string | null
  operator: string | null
  zone: string | null
  mount: string | null
}

export interface AlprReverseGeocodeResult {
  label: string | null
}

export interface AlprCameraRouteRequest {
  name: string
  origin: AlprGeoPoint
  destination: AlprGeoPoint
  stops: AlprGeoPoint[]
  radiusMetres: number
  directionalZones: boolean
  departAt: string | null
  checks: {
    cameras: boolean
    bridges: boolean
    truckRestrictions: boolean
    optimizeBlockedSegments: boolean
  }
}

export interface AlprRouteCamera {
  id: number
  longitude: number
  latitude: number
  bearings: number[]
  bearingConfidence: string | null
  chainageMetres: number
  name: string | null
  brand?: string | null
  operator?: string | null
  attempted?: boolean | null
}

export interface AlprCameraRouteCandidate {
  label: string
  isBaseline: boolean
  isRecommended: boolean
  geometry: number[][]
  distanceMetres: number
  durationSeconds: number
  eta: string
  cameraCount: number
  cameras: AlprRouteCamera[]
  avoidedCount: number
  newlyExposedCount: number
  notAttemptedCount: number
  roadSummary: string | null
}

export interface AlprAnalysisWarning {
  code: string
  message: string
}

export interface AlprCameraRouteAnalysisResponse {
  reportId: string | null
  routes: AlprCameraRouteCandidate[]
  rejectedRoutes: AlprCameraRouteCandidate[]
  warnings: AlprAnalysisWarning[]
}

export interface AlprCameraRouteHistoryItem {
  id: string
  name: string
  originLabel: string
  destinationLabel: string
  createdAt: string
  routeCount: number
  recommendedCameraCount: number | null
}

export interface AlprSavedCameraHit {
  cameraId: number
  attempted: boolean
  chainageMetres: number
  longitude: number
  latitude: number
  name: string | null
  brand: string | null
  operator: string | null
  bearings: number[] | null
  bearingConfidence: string | null
}

export interface AlprSavedRouteCandidate {
  label: string
  isBaseline: boolean
  isRecommended: boolean
  geometry: number[][]
  distanceMetres: number
  durationSeconds: number
  eta: string
  cameraCount: number
  newlyExposedCount: number
  notAttemptedCount: number
  avoidedCount: number
  roadSummary: string | null
  hits: AlprSavedCameraHit[]
}

export interface AlprSavedReport {
  id: string
  name: string
  createdAt: string
  originLabel: string
  originLongitude: number
  originLatitude: number
  destinationLabel: string
  destinationLongitude: number
  destinationLatitude: number
  stops: number[][]
  warnings: AlprAnalysisWarning[]
  candidates: AlprSavedRouteCandidate[]
}

export interface AlprCameraRouteHistoryDetail {
  id: string
  name: string
  createdAt: string
  originLabel: string
  originLongitude: number
  originLatitude: number
  destinationLabel: string
  destinationLongitude: number
  destinationLatitude: number
  stops: number[][]
  warnings: AlprAnalysisWarning[]
  routes: AlprCameraRouteCandidate[]
}
