import { useState } from 'react'
import { GeoJsonLayer } from '@deck.gl/layers'
import { useAppStore } from '@/stores/appStore'
import type { Feature } from 'geojson'
import type { PickingInfo } from '@deck.gl/core'
import type { MapStyle } from './MapStyleToggle'

// Dark mode colors
const COLOR_DATA_NEUTRAL: [number, number, number, number] = [99, 102, 120, 178]
const COLOR_NO_DATA: [number, number, number, number] = [42, 45, 62, 255]
const COLOR_HOVER: [number, number, number, number] = [140, 145, 170, 220]

// Satellite mode: more transparent overlay to let imagery show through
const COLOR_DATA_SATELLITE: [number, number, number, number] = [99, 102, 120, 80]
const COLOR_NO_DATA_SATELLITE: [number, number, number, number] = [0, 0, 0, 0]
const COLOR_HOVER_SATELLITE: [number, number, number, number] = [255, 255, 255, 60]

export type HoverInfo = {
  object: Feature
  x: number
  y: number
  name: string
} | null

export function useCountriesLayer(mapStyle: MapStyle = 'dark'): {
  layer: GeoJsonLayer | null
  hoverInfo: HoverInfo
} {
  const countries = useAppStore((s) => s.countries)
  const geojson = useAppStore((s) => s.geojson)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null)

  if (!geojson) return { layer: null, hoverInfo: null }

  const isSatellite = mapStyle === 'satellite'

  const layer = new GeoJsonLayer({
    id: 'countries-layer',
    data: geojson,
    pickable: true,
    stroked: true,
    filled: true,
    lineWidthMinPixels: isSatellite ? 0.8 : 0.5,
    getLineColor: isSatellite
      ? ([255, 255, 255, 60] as [number, number, number, number])
      : ([60, 60, 80, 180] as [number, number, number, number]),
    getLineWidth: 1,
    getFillColor: (feature: Feature) => {
      const iso = feature.properties?.iso_a2 as string | undefined
      const hasData = iso && countries[iso]
      if (hoverInfo?.object === feature) {
        return isSatellite ? COLOR_HOVER_SATELLITE : COLOR_HOVER
      }
      if (!hasData) return isSatellite ? COLOR_NO_DATA_SATELLITE : COLOR_NO_DATA
      return isSatellite ? COLOR_DATA_SATELLITE : COLOR_DATA_NEUTRAL
    },
    updateTriggers: {
      getFillColor: [hoverInfo?.object, mapStyle],
      getLineColor: [mapStyle],
      lineWidthMinPixels: [mapStyle],
    },
    onHover: (info: PickingInfo<Feature>) => {
      const feature = info.object
      const iso = feature?.properties?.iso_a2 as string | undefined
      if (feature && iso && countries[iso]) {
        setHoverInfo({
          object: feature,
          x: info.x,
          y: info.y,
          name: countries[iso]!.name,
        })
      } else {
        setHoverInfo(null)
      }
    },
  })

  return { layer, hoverInfo }
}
