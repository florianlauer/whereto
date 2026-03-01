import { useState } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { useCountriesLayer } from './useCountriesLayer'
import { CountryTooltip } from './CountryTooltip'
import { MapStyleToggle, type MapStyle } from './MapStyleToggle'

const INITIAL_VIEW_STATE = {
  longitude: 15,
  latitude: 20,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
}

// ESRI World Imagery — tuiles raster satellite publiques, sans clé API
// Production : remplacer par Stadia Alidade Satellite (https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg)
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    esri: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri-satellite', type: 'raster' as const, source: 'esri' }],
}

const MAP_STYLES: Record<MapStyle, string | typeof SATELLITE_STYLE> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  satellite: SATELLITE_STYLE,
}

export function MapView() {
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark')
  const { layer, hoverInfo } = useCountriesLayer(mapStyle)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layer ? [layer] : []}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Map mapStyle={MAP_STYLES[mapStyle] as any} />
      </DeckGL>
      {hoverInfo && (
        <CountryTooltip x={hoverInfo.x} y={hoverInfo.y} name={hoverInfo.name} />
      )}
      <MapStyleToggle
        current={mapStyle}
        onToggle={() => setMapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'))}
      />
    </div>
  )
}
