import { inject, type InjectionKey, type ShallowRef } from 'vue'
import {
  LngLatBounds,
  setWorkerUrl,
  type Map as MapLibreMap,
  type LayerSpecification,
  type PaddingOptions,
  type StyleSpecification,
} from 'maplibre-gl'
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

export interface MapPosition {
  lat: number
  lng: number
}

export interface MapViewport {
  west: number
  south: number
  east: number
  north: number
}

export const mapInjectionKey: InjectionKey<ShallowRef<MapLibreMap | null>> = Symbol('map')

export function injectMap() {
  const map = inject(mapInjectionKey)?.value
  if (!map) throw new Error('Map overlays must be rendered inside CMap')
  return map
}

export const BASEMAP_SOURCE_ID = 'protomaps'

const MAP_ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">Protomaps</a> © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'

let mapRuntimeReady = false

export function prepareMapRuntime() {
  if (mapRuntimeReady) return
  setWorkerUrl(workerUrl)
  mapRuntimeReady = true
}

function mapDataBaseUrl() {
  const configured = String(import.meta.env.VITE_MAP_DATA_URL || '').trim()
  const base =
    configured || `${String(import.meta.env.VITE_APP_BASE_URL || '').replace(/\/+$/, '')}/map-data`
  return new URL(base.replace(/\/+$/, ''), window.location.href).href
}

export type MapType = 'map' | 'satellite' | 'terrain'

export const SATELLITE_SOURCE_ID = 'satellite'
export const TERRAIN_SOURCE_ID = 'terrain-dem'
export const BASE_SOURCE_IDS = new Set([BASEMAP_SOURCE_ID, SATELLITE_SOURCE_ID, TERRAIN_SOURCE_ID])

const SATELLITE_TILES_URL = String(import.meta.env.VITE_MAP_SATELLITE_TILES_URL || '').trim()
const TERRAIN_DEM_URL = String(import.meta.env.VITE_MAP_TERRAIN_DEM_URL || '').trim()

const ALL_MAP_TYPE_OPTIONS: { id: MapType; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]

export const MAP_TYPE_OPTIONS = ALL_MAP_TYPE_OPTIONS.filter(
  (option) =>
    (option.id !== 'satellite' || SATELLITE_TILES_URL) &&
    (option.id !== 'terrain' || TERRAIN_DEM_URL)
)

const BASE_LAYER_SOURCE_LAYERS = new Set(['earth', 'landcover', 'landuse', 'water'])
const SATELLITE_LINE_SOURCE_LAYERS = new Set(['roads', 'boundaries'])
const SATELLITE_EXCLUDED_LAYERS = new Set(['roads_runway', 'roads_taxiway'])

const SATELLITE_MINOR_ROAD = 'rgba(255, 255, 255, 0.45)'
const SATELLITE_MAJOR_ROAD = 'rgba(255, 255, 255, 0.7)'
const SATELLITE_HIGHWAY = 'rgba(255, 214, 102, 0.85)'
const SATELLITE_LABEL = '#ffffff'
const SATELLITE_LABEL_MUTED = '#e6e6e6'
const SATELLITE_LABEL_HALO = 'rgba(0, 0, 0, 0.85)'

function satelliteFlavor(): Flavor {
  return {
    ...namedFlavor('dark'),
    other: SATELLITE_MINOR_ROAD,
    minor_service: SATELLITE_MINOR_ROAD,
    minor_a: SATELLITE_MINOR_ROAD,
    minor_b: SATELLITE_MINOR_ROAD,
    link: SATELLITE_MAJOR_ROAD,
    major: SATELLITE_MAJOR_ROAD,
    highway: SATELLITE_HIGHWAY,
    tunnel_other: SATELLITE_MINOR_ROAD,
    tunnel_minor: SATELLITE_MINOR_ROAD,
    tunnel_link: SATELLITE_MAJOR_ROAD,
    tunnel_major: SATELLITE_MAJOR_ROAD,
    tunnel_highway: SATELLITE_HIGHWAY,
    bridges_other: SATELLITE_MINOR_ROAD,
    bridges_minor: SATELLITE_MINOR_ROAD,
    bridges_link: SATELLITE_MAJOR_ROAD,
    bridges_major: SATELLITE_MAJOR_ROAD,
    bridges_highway: SATELLITE_HIGHWAY,
    boundaries: '#d9d9d9',
    roads_label_minor: SATELLITE_LABEL_MUTED,
    roads_label_minor_halo: SATELLITE_LABEL_HALO,
    roads_label_major: SATELLITE_LABEL,
    roads_label_major_halo: SATELLITE_LABEL_HALO,
    ocean_label: '#a8c8ec',
    subplace_label: SATELLITE_LABEL_MUTED,
    subplace_label_halo: SATELLITE_LABEL_HALO,
    city_label: SATELLITE_LABEL,
    city_label_halo: SATELLITE_LABEL_HALO,
    state_label: SATELLITE_LABEL_MUTED,
    state_label_halo: SATELLITE_LABEL_HALO,
    country_label: SATELLITE_LABEL,
    address_label: SATELLITE_LABEL_MUTED,
    address_label_halo: SATELLITE_LABEL_HALO,
  }
}

function sourceLayer(layer: LayerSpecification) {
  return 'source-layer' in layer ? String(layer['source-layer'] || '') : ''
}

function satelliteOverlayLayer(layer: LayerSpecification) {
  if (SATELLITE_EXCLUDED_LAYERS.has(layer.id)) return false
  if (layer.type === 'symbol') return true
  return layer.type === 'line' && SATELLITE_LINE_SOURCE_LAYERS.has(sourceLayer(layer))
}

function hillshadeLayer(dark: boolean): LayerSpecification {
  return {
    id: 'terrain-hillshade',
    type: 'hillshade',
    source: TERRAIN_SOURCE_ID,
    paint: dark
      ? {
          'hillshade-exaggeration': 0.45,
          'hillshade-shadow-color': '#000000',
          'hillshade-highlight-color': 'rgba(255, 255, 255, 0.12)',
          'hillshade-accent-color': '#000000',
        }
      : {
          'hillshade-exaggeration': 0.3,
          'hillshade-shadow-color': '#5c5c5c',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#8a8a8a',
        },
  }
}

function withHillshade(baseLayers: LayerSpecification[], dark: boolean) {
  const lastBaseIndex = baseLayers.reduce(
    (last, layer, index) =>
      layer.type !== 'symbol' && BASE_LAYER_SOURCE_LAYERS.has(sourceLayer(layer)) ? index : last,
    0
  )
  return [
    ...baseLayers.slice(0, lastBaseIndex + 1),
    hillshadeLayer(dark),
    ...baseLayers.slice(lastBaseIndex + 1),
  ]
}

export function buildMapStyle(dark: boolean, type: MapType = 'map'): StyleSpecification {
  const base = mapDataBaseUrl()
  const satellite = type === 'satellite' && !!SATELLITE_TILES_URL
  const terrain = type === 'terrain' && !!TERRAIN_DEM_URL
  const flavorName = satellite || dark ? 'dark' : 'white'
  const sources: StyleSpecification['sources'] = {
    [BASEMAP_SOURCE_ID]: {
      type: 'vector',
      tiles: [`${base}/tiles/na/{z}/{x}/{y}.mvt`],
      minzoom: 0,
      maxzoom: 15,
      attribution: MAP_ATTRIBUTION,
    },
  }
  let styleLayers: LayerSpecification[]
  if (satellite) {
    sources[SATELLITE_SOURCE_ID] = {
      type: 'raster',
      tiles: [SATELLITE_TILES_URL],
      tileSize: 256,
      maxzoom: 16,
      attribution: 'USGS The National Map',
    }
    styleLayers = [
      { id: 'satellite-imagery', type: 'raster', source: SATELLITE_SOURCE_ID },
      ...layers(BASEMAP_SOURCE_ID, satelliteFlavor(), { lang: 'en' }).filter(satelliteOverlayLayer),
    ]
  } else {
    styleLayers = layers(BASEMAP_SOURCE_ID, namedFlavor(flavorName), { lang: 'en' })
    if (terrain) {
      sources[TERRAIN_SOURCE_ID] = {
        type: 'raster-dem',
        tiles: [TERRAIN_DEM_URL],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
        attribution: 'Mapzen/AWS Terrain Tiles',
      }
      styleLayers = withHillshade(styleLayers, dark)
    }
  }
  return {
    version: 8,
    glyphs: `${base}/assets/fonts/{fontstack}/{range}.pbf`,
    sprite: `${base}/assets/sprites/v4/${flavorName}`,
    sources,
    layers: styleLayers,
  }
}

export function positionsBounds(positions: MapPosition[]) {
  if (!positions.length) return null
  const bounds = new LngLatBounds()
  positions.forEach((position) => bounds.extend(position))
  return bounds
}

export function mapViewport(map: MapLibreMap): MapViewport | null {
  const bounds = map.getBounds()
  const viewport = {
    west: Math.max(-180, bounds.getWest()),
    south: Math.max(-90, bounds.getSouth()),
    east: Math.min(180, bounds.getEast()),
    north: Math.min(90, bounds.getNorth()),
  }
  return [viewport.west, viewport.south, viewport.east, viewport.north].every(Number.isFinite)
    ? viewport
    : null
}

export function mapMarkerInfoPadding(map: MapLibreMap): PaddingOptions {
  const container = map.getContainer()
  const width = container.clientWidth || 650
  const height = container.clientHeight || 288
  const horizontal = Math.min(245, Math.floor(width * 0.37))
  return {
    top: Math.min(190, Math.floor(height * 0.65)),
    right: horizontal,
    bottom: 30,
    left: horizontal,
  }
}

export async function svgToMapImage(svg: string, width: number, height: number, pixelRatio = 2) {
  const image = new Image(width * pixelRatio, height * pixelRatio)
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return context.getImageData(0, 0, canvas.width, canvas.height)
}
