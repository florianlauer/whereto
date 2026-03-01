import { describe, it, expect } from 'vitest'
import {
  calculateMatch,
  hasActiveFilters,
  countMatches,
  MATCH_COLORS,
} from '../scoring'
import type { Country } from '../data'
import type { Filters } from '../scoring'

const makeCountry = (overrides: Partial<Country> = {}): Country => ({
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
  ...overrides,
})

describe('calculateMatch', () => {
  it('returns no-data when dailyBudgetMid is 0', () => {
    expect(calculateMatch(makeCountry({ dailyBudgetMid: 0 }), {})).toBe('no-data')
  })

  it('returns great when no filters are set (AC-5: neutral state)', () => {
    // No filters = all criteria pass = great
    expect(calculateMatch(makeCountry(), {})).toBe('great')
  })

  it('AC-1: returns great when budget matches (mid within range)', () => {
    expect(calculateMatch(makeCountry({ dailyBudgetMid: 30 }), { budgetMax: 50 })).toBe('great')
  })

  it('AC-1: returns good (not poor) when only budget fails — other 2 criteria pass (no filter)', () => {
    // budget ✗, season = no filter → pass, duration = no filter → pass → score=2 → good
    expect(calculateMatch(makeCountry({ dailyBudgetMid: 80 }), { budgetMax: 50 })).toBe('good')
  })

  it('AC-2: returns great when all 3 criteria match', () => {
    const filters: Filters = { budgetMax: 50, daysMin: 10, daysMax: 10, monthFrom: 5, monthTo: 5 }
    expect(calculateMatch(makeCountry(), filters)).toBe('great')
  })

  it('AC-2: returns good when exactly 2 criteria match', () => {
    // budget ✓, month ✓, days ✗ (requesting 3–3j, rec 7–14j, no overlap)
    const filters: Filters = { budgetMax: 50, daysMin: 3, daysMax: 3, monthFrom: 5, monthTo: 5 }
    expect(calculateMatch(makeCountry(), filters)).toBe('good')
  })

  it('AC-2: returns poor when 1 criterion matches', () => {
    // budget ✓, month ✗, days ✗
    const filters: Filters = { budgetMax: 50, daysMin: 3, daysMax: 3, monthFrom: 1, monthTo: 1 }
    expect(calculateMatch(makeCountry(), filters)).toBe('poor')
  })

  it('AC-2: returns poor when 0 criteria match', () => {
    const filters: Filters = { budgetMax: 10, daysMin: 3, daysMax: 3, monthFrom: 1, monthTo: 1 }
    expect(calculateMatch(makeCountry(), filters)).toBe('poor')
  })

  it('season match: month in bestMonths returns match', () => {
    expect(calculateMatch(makeCountry({ bestMonths: [6, 7, 8] }), { monthFrom: 7, monthTo: 7 })).toBe('great')
  })

  it('season match: month not in bestMonths returns good — other 2 criteria pass (no filter)', () => {
    // month ✗, budget = no filter → pass, duration = no filter → pass → score=2 → good
    expect(calculateMatch(makeCountry({ bestMonths: [6, 7, 8] }), { monthFrom: 1, monthTo: 1 })).toBe('good')
  })

  it('duration match: exact min boundary matches (overlap)', () => {
    // requesting [7,7], rec [7,14]: 7 <= 14 && 7 >= 7 → true
    const filters: Filters = { daysMin: 7, daysMax: 7 }
    expect(calculateMatch(makeCountry({ recommendedDaysMin: 7, recommendedDaysMax: 14 }), filters)).toBe('great')
  })

  it('duration match: exact max boundary matches (overlap)', () => {
    // requesting [14,14], rec [7,14]: 14 <= 14 && 14 >= 7 → true
    const filters: Filters = { daysMin: 14, daysMax: 14 }
    expect(calculateMatch(makeCountry({ recommendedDaysMin: 7, recommendedDaysMax: 14 }), filters)).toBe('great')
  })

  it('duration match: below min returns good — other 2 criteria pass (no filter)', () => {
    // requesting [6,6], rec [7,14]: 6 <= 14 ✓ but 6 >= 7? No → no overlap
    const filters: Filters = { daysMin: 6, daysMax: 6 }
    expect(calculateMatch(makeCountry({ recommendedDaysMin: 7, recommendedDaysMax: 14 }), filters)).toBe('good')
  })

  it('duration match: overlapping range matches', () => {
    // requesting [5,10], rec [7,14]: 5 <= 14 && 10 >= 7 → true
    const filters: Filters = { daysMin: 5, daysMax: 10 }
    expect(calculateMatch(makeCountry({ recommendedDaysMin: 7, recommendedDaysMax: 14 }), filters)).toBe('great')
  })

  it('duration match: non-overlapping range fails', () => {
    // requesting [15,20], rec [7,14]: 15 <= 14? No → no overlap
    const filters: Filters = { daysMin: 15, daysMax: 20 }
    expect(calculateMatch(makeCountry({ recommendedDaysMin: 7, recommendedDaysMax: 14 }), filters)).toBe('good')
  })

  it('budget match: budgetMin filters out cheap destinations', () => {
    // dailyBudgetMid=10, budgetMin=50 → 10 >= 50? No → fail
    expect(calculateMatch(makeCountry({ dailyBudgetMid: 10 }), { budgetMin: 50 })).toBe('good')
  })

  it('budget match: range includes mid', () => {
    // dailyBudgetMid=40, range [20,100] → 40 >= 20 && 40 <= 100 → true
    expect(calculateMatch(makeCountry({ dailyBudgetMid: 40 }), { budgetMin: 20, budgetMax: 100 })).toBe('great')
  })

  it('season match: range includes a bestMonth', () => {
    // bestMonths [4,5,6,9,10], range [5,7]: month 5 ∈ [5,7] → true
    expect(calculateMatch(makeCountry(), { monthFrom: 5, monthTo: 7 })).toBe('great')
  })

  it('season match: only monthFrom set — open upper bound', () => {
    // bestMonths [4,5,6,9,10], monthFrom=9: months 9,10 ≥ 9 → true
    expect(calculateMatch(makeCountry(), { monthFrom: 9 })).toBe('great')
  })
})

describe('hasActiveFilters', () => {
  it('returns false when all undefined', () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it('returns true when budgetMax set', () => {
    expect(hasActiveFilters({ budgetMax: 50 })).toBe(true)
  })

  it('returns true when budgetMin set', () => {
    expect(hasActiveFilters({ budgetMin: 30 })).toBe(true)
  })

  it('returns true when only monthFrom set', () => {
    expect(hasActiveFilters({ monthFrom: 6 })).toBe(true)
  })

  it('returns true when daysMin set', () => {
    expect(hasActiveFilters({ daysMin: 5 })).toBe(true)
  })

  it('returns true when multiple set', () => {
    expect(hasActiveFilters({ budgetMax: 50, daysMin: 5, daysMax: 10, monthFrom: 6 })).toBe(true)
  })
})

describe('countMatches', () => {
  const countries = {
    GE: makeCountry({ code: 'GE', dailyBudgetMid: 30 }),
    FR: makeCountry({ code: 'FR', dailyBudgetMid: 120 }),
    TH: makeCountry({ code: 'TH', dailyBudgetMid: 45, bestMonths: [11, 12, 1] }),
  }

  it('returns 0 when no filters active', () => {
    expect(countMatches(countries, {})).toBe(0)
  })

  it('AC-6: counts great + good countries (single filter: over-budget → good, not poor)', () => {
    // budgetMax=50: GE (30 ✓→great), TH (45 ✓→great), FR (120 ✗ but season+dur pass→good)
    expect(countMatches(countries, { budgetMax: 50 })).toBe(3)
  })

  it('AC-6: returns 0 only when no filters active', () => {
    expect(countMatches(countries, {})).toBe(0)
  })

  it('AC-6: poor when all 3 filters active and all fail → excluded', () => {
    // budgetMax=10 ✗, days=[3,3] no overlap with [7,14] ✗, month=[1,1] not in [4,5,6,9,10] ✗ → poor
    expect(
      countMatches(
        { GE: makeCountry() },
        { budgetMax: 10, daysMin: 3, daysMax: 3, monthFrom: 1, monthTo: 1 },
      ),
    ).toBe(0)
  })
})

describe('MATCH_COLORS', () => {
  it('great color is #22C55E at 220 alpha', () => {
    expect(MATCH_COLORS.great).toEqual([34, 197, 94, 220])
  })

  it('good color is #EAB308 at 220 alpha', () => {
    expect(MATCH_COLORS.good).toEqual([234, 179, 8, 220])
  })

  it('poor color is #EF4444 at 100 alpha (40%)', () => {
    expect(MATCH_COLORS.poor).toEqual([239, 68, 68, 100])
  })

  it('no-data color is #2A2D3E opaque', () => {
    expect(MATCH_COLORS['no-data']).toEqual([42, 45, 62, 255])
  })
})
