import { useState, useEffect, useRef } from 'react'
import { Map, useControl, type MapRef } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer } from '@deck.gl/core'
import { useCountriesLayer } from './useCountriesLayer'
import { CountryTooltip } from './CountryTooltip'
import { MapStyleToggle, type MapStyle } from './MapStyleToggle'
import { DestinationPanel } from '@/components/destination/DestinationPanel'
import { ComparisonDrawer } from '@/components/destination/ComparisonDrawer'
import { TripSummaryPanel } from '@/components/destination/TripSummaryPanel'
import type { Filters } from '@/lib/scoring'
import { toast } from 'sonner'

const INITIAL_VIEW_STATE = {
  longitude: 15,
  latitude: 20,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
}

const DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

const ESRI_SOURCE = {
  type: 'raster' as const,
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
  tileSize: 256,
  attribution: '© Esri, Maxar, Earthstar Geographics',
}

// Labels partagés entre les deux modes — style satellite (blanc + halo noir)
// text-field : coalesce name:en → name:latin → name pour afficher en alphabet latin
// Legacy filter syntax MapLibre pour compatibilité maximale
const LATIN_LABEL = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]

const SHARED_LABEL_LAYERS = [
  {
    id: 'place_other',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['!in', 'class', 'country', 'state', 'city', 'town', 'village'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 10 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 },
  },
  {
    id: 'place_village',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', 'class', 'village'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 10 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 },
  },
  {
    id: 'place_town',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', 'class', 'town'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 11 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 },
  },
  {
    id: 'place_city',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['in', 'class', 'city', 'city_large'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 13 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.5 },
  },
  {
    id: 'place_state',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', 'class', 'state'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 11 },
    paint: { 'text-color': '#cccccc', 'text-halo-color': '#000000', 'text-halo-width': 1 },
  },
  {
    id: 'place_country',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', 'class', 'country'],
    layout: { 'text-field': LATIN_LABEL, 'text-size': 12 },
    paint: { 'text-color': '#eeeeee', 'text-halo-color': '#000000', 'text-halo-width': 1.5 },
  },
]

type BuiltStyles = { dark: object; satellite: object }

// Cache module-level — fetch unique du dark style par session
let cachedStyles: BuiltStyles | null = null

// Construit les deux styles en partageant les mêmes SHARED_LABEL_LAYERS
// Dark : fond vectoriel OpenFreeMap (sans ses place_* natifs) + labels partagés
// Satellite : fond raster ESRI + labels partagés
function useMapStyles() {
  const [styles, setStyles] = useState<BuiltStyles | null>(cachedStyles)

  useEffect(() => {
    if (cachedStyles) return
    fetch(DARK_STYLE_URL)
      .then((r) => r.json())
      .then((darkStyle) => {
        const nonLabelLayers = darkStyle.layers.filter(
          (l: { id: string }) => !l.id.startsWith('place'),
        )
        const built: BuiltStyles = {
          dark: {
            ...darkStyle,
            layers: [...nonLabelLayers, ...SHARED_LABEL_LAYERS],
          },
          satellite: {
            version: 8,
            glyphs: darkStyle.glyphs,
            sources: {
              esri: ESRI_SOURCE,
              openmaptiles: darkStyle.sources.openmaptiles,
            },
            layers: [
              { id: 'esri-satellite', type: 'raster', source: 'esri' },
              ...SHARED_LABEL_LAYERS,
            ],
          },
        }
        cachedStyles = built
        setStyles(built)
      })
  }, [])

  return styles
}

function DeckGLOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true, layers }),
  )
  overlay.setProps({ layers })
  return null
}

type Props = {
  filters?: Filters
}

export function MapView({ filters = {} }: Props) {
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark')
  const [is3D, setIs3D] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [comparisonList, setComparisonList] = useState<string[]>([])
  const [tripSummaryOpen, setTripSummaryOpen] = useState(false)

  function toggleComparison(code: string) {
    setComparisonList((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code)
      if (prev.length >= 3) {
        toast('Destination la plus ancienne retirée', { duration: 2500 })
        return [...prev.slice(1), code]
      }
      return [...prev, code]
    })
  }
  const mapRef = useRef<MapRef>(null)
  const styles = useMapStyles()
  const { layer, hoverInfo } = useCountriesLayer(mapStyle, filters, setSelectedCountryCode)

  const resolvedStyle = styles ? styles[mapStyle] : DARK_STYLE_URL

  function toggle3D() {
    const next = !is3D
    setIs3D(next)
    const map = mapRef.current?.getMap()
    if (!map) return
    if (next) {
      map.dragRotate.enable()
      map.easeTo({ pitch: 50, duration: 600 })
    } else {
      map.dragRotate.disable()
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 })
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapStyle={resolvedStyle as any}
        cursor={hoverInfo ? 'pointer' : 'grab'}
        maxPitch={is3D ? 85 : 0}
        onLoad={() => mapRef.current?.getMap().dragRotate.disable()}
      >
        <DeckGLOverlay layers={layer ? [layer] : []} />
      </Map>
      {hoverInfo && !selectedCountryCode && (
        <CountryTooltip x={hoverInfo.x} y={hoverInfo.y} name={hoverInfo.name} />
      )}
      {selectedCountryCode && (
        <DestinationPanel
          countryCode={selectedCountryCode}
          filters={filters}
          onClose={() => setSelectedCountryCode(null)}
          isInComparison={comparisonList.includes(selectedCountryCode)}
          onCompare={() => toggleComparison(selectedCountryCode)}
          onOpenTripSummary={() => setTripSummaryOpen(true)}
        />
      )}
      {tripSummaryOpen && (
        <TripSummaryPanel onClose={() => setTripSummaryOpen(false)} />
      )}
      <ComparisonDrawer
        codes={comparisonList}
        filters={filters}
        onRemove={(code) => setComparisonList((prev) => prev.filter((c) => c !== code))}
        onClearAll={() => setComparisonList([])}
      />
      <div className={[
        'absolute right-4 z-10 flex gap-2 transition-all duration-300',
        comparisonList.length > 0 ? 'top-20' : 'bottom-8',
      ].join(' ')}>
        <button
          onClick={toggle3D}
          title={is3D ? 'Passer en vue 2D' : 'Passer en vue 3D'}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900/90 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-gray-800/90"
        >
          <span>{is3D ? '2D' : '3D'}</span>
        </button>
        <MapStyleToggle
          current={mapStyle}
          onToggle={() => setMapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'))}
        />
      </div>
    </div>
  )
}
