import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadStaticData } from '../data'

const mockCountries = {
  GE: {
    code: 'GE',
    name: 'Géorgie',
    region: 'Caucasus',
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

const mockPois = {
  GE: [
    { id: 'ge-tbilisi', name: 'Tbilissi', daysMin: 2, daysMax: 3, type: 'city' as const },
  ],
}

const mockGeojson = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { iso_a2: 'GE', name: 'Georgia' }, geometry: null },
  ],
}

function mockFetch(responses: Record<string, object | null>) {
  return vi.fn((url: string) => {
    const key = Object.keys(responses).find((k) => url.includes(k))
    const data = key ? responses[key] : null
    if (data === null) {
      return Promise.resolve({ ok: false, status: 404 } as Response)
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response)
  })
}

describe('loadStaticData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('AC-2/AC-3: fetches 3 files in parallel and returns merged data', async () => {
    global.fetch = mockFetch({
      'countries.json': mockCountries,
      'pois.json': mockPois,
      'countries.geojson': mockGeojson,
    })

    const data = await loadStaticData()

    expect(data.countries).toEqual(mockCountries)
    expect(data.pois).toEqual(mockPois)
    expect(data.geojson).toEqual(mockGeojson)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('AC-4: throws when countries.json fails', async () => {
    global.fetch = mockFetch({
      'countries.json': null,
      'pois.json': mockPois,
      'countries.geojson': mockGeojson,
    })

    await expect(loadStaticData()).rejects.toThrow('Failed to load countries.json: 404')
  })

  it('AC-4: throws when pois.json fails', async () => {
    global.fetch = mockFetch({
      'countries.json': mockCountries,
      'pois.json': null,
      'countries.geojson': mockGeojson,
    })

    await expect(loadStaticData()).rejects.toThrow('Failed to load pois.json: 404')
  })

  it('AC-4: throws when countries.geojson fails', async () => {
    global.fetch = mockFetch({
      'countries.json': mockCountries,
      'pois.json': mockPois,
      'countries.geojson': null,
    })

    await expect(loadStaticData()).rejects.toThrow('Failed to load countries.geojson: 404')
  })

  it('returns correct shape with all required country fields', async () => {
    global.fetch = mockFetch({
      'countries.json': mockCountries,
      'pois.json': mockPois,
      'countries.geojson': mockGeojson,
    })

    const { countries } = await loadStaticData()
    const ge = countries['GE']

    expect(ge).toHaveProperty('code')
    expect(ge).toHaveProperty('name')
    expect(ge).toHaveProperty('dailyBudgetMid')
    expect(ge).toHaveProperty('bestMonths')
    expect(ge).toHaveProperty('recommendedDaysMin')
    expect(ge).toHaveProperty('recommendedDaysMax')
    expect(ge).toHaveProperty('safetyScore')
    expect(Array.isArray(ge!.bestMonths)).toBe(true)
  })
})
