import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppStore } from '@/stores/appStore'
import { useCountriesLayer } from '../useCountriesLayer'
import type { FeatureCollection } from 'geojson'

const mockGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { iso_a2: 'GE', name: 'Georgia' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
    {
      type: 'Feature',
      properties: { iso_a2: '-99', name: 'Unknown' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
  ],
}

const mockCountries = {
  GE: {
    code: 'GE',
    name: 'Géorgie',
    dailyBudgetLow: 20,
    dailyBudgetMid: 30,
    dailyBudgetHigh: 55,
    bestMonths: [4, 5, 6, 9, 10],
    recommendedDaysMin: 7,
    recommendedDaysMax: 14,
    safetyScore: 4,
    dataYear: 2022,
  },
}

describe('useCountriesLayer', () => {
  beforeEach(() => {
    useAppStore.setState({ countries: {}, pois: {}, geojson: null, wishlistItems: [] })
  })

  it('AC-6: returns null layer when geojson is not loaded', () => {
    const { result } = renderHook(() => useCountriesLayer())
    expect(result.current.layer).toBeNull()
    expect(result.current.hoverInfo).toBeNull()
  })

  it('AC-1/AC-2: returns a GeoJsonLayer when geojson is loaded', () => {
    useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
    const { result } = renderHook(() => useCountriesLayer())
    expect(result.current.layer).not.toBeNull()
    expect(result.current.layer?.id).toBe('countries-layer')
  })

  it('AC-2: getFillColor returns no-data color for unknown iso_a2', () => {
    useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
    const { result } = renderHook(() => useCountriesLayer())
    const layer = result.current.layer!

    const unknownFeature = mockGeojson.features[1]!
    // @ts-expect-error - accessing internal accessor for test
    const color = layer.props.getFillColor(unknownFeature)
    expect(color).toEqual([42, 45, 62, 255])
  })

  it('AC-2: getFillColor returns neutral color for known country', () => {
    useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
    const { result } = renderHook(() => useCountriesLayer())
    const layer = result.current.layer!

    const knownFeature = mockGeojson.features[0]!
    // @ts-expect-error - accessing internal accessor for test
    const color = layer.props.getFillColor(knownFeature)
    expect(color).toEqual([99, 102, 120, 178])
  })

  it('AC-3: hoverInfo is null initially', () => {
    useAppStore.setState({ countries: mockCountries, geojson: mockGeojson })
    const { result } = renderHook(() => useCountriesLayer())
    expect(result.current.hoverInfo).toBeNull()
  })
})
