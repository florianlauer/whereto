import type { Country } from './data'

export type MatchLevel = 'great' | 'good' | 'poor' | 'no-data'

export type Filters = {
  budgetMin?: number // €/jour
  budgetMax?: number // €/jour
  daysMin?: number // durée séjour
  daysMax?: number // durée séjour
  monthFrom?: number // 1–12
  monthTo?: number // 1–12
}

export const MATCH_COLORS: Record<MatchLevel, [number, number, number, number]> = {
  great: [34, 197, 94, 220], // #22C55E
  good: [234, 179, 8, 220], // #EAB308
  poor: [239, 68, 68, 100], // #EF4444 @ 40%
  'no-data': [42, 45, 62, 255], // #2A2D3E
}

// Semi-transparent versions for satellite mode
export const MATCH_COLORS_SATELLITE: Record<MatchLevel, [number, number, number, number]> = {
  great: [34, 197, 94, 140],
  good: [234, 179, 8, 140],
  poor: [239, 68, 68, 60],
  'no-data': [0, 0, 0, 0],
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.budgetMin !== undefined ||
    filters.budgetMax !== undefined ||
    filters.daysMin !== undefined ||
    filters.daysMax !== undefined ||
    filters.monthFrom !== undefined ||
    filters.monthTo !== undefined
  )
}

export function calculateMatch(country: Country, filters: Filters): MatchLevel {
  if (!country.dailyBudgetMid) return 'no-data'

  // Budget: active if budgetMin or budgetMax defined
  const budgetActive = filters.budgetMin !== undefined || filters.budgetMax !== undefined
  const budgetMatch =
    !budgetActive ||
    ((filters.budgetMin === undefined || country.dailyBudgetMid >= filters.budgetMin) &&
      (filters.budgetMax === undefined || country.dailyBudgetMid <= filters.budgetMax))

  // Duration: overlap — daysMin <= recMax && daysMax >= recMin
  const durationActive = filters.daysMin !== undefined || filters.daysMax !== undefined
  const durationMatch =
    !durationActive ||
    ((filters.daysMin === undefined || filters.daysMin <= country.recommendedDaysMax) &&
      (filters.daysMax === undefined || filters.daysMax >= country.recommendedDaysMin))

  // Season: a month of bestMonths is in [monthFrom..monthTo]
  const seasonActive = filters.monthFrom !== undefined || filters.monthTo !== undefined
  const seasonMatch =
    !seasonActive ||
    country.bestMonths.some(
      (m) =>
        (filters.monthFrom === undefined || m >= filters.monthFrom) &&
        (filters.monthTo === undefined || m <= filters.monthTo),
    )

  const score = [budgetMatch, seasonMatch, durationMatch].filter(Boolean).length
  if (score === 3) return 'great'
  if (score === 2) return 'good'
  return 'poor'
}

export function countMatches(
  countries: Record<string, Country>,
  filters: Filters,
): number {
  if (!hasActiveFilters(filters)) return 0
  return Object.values(countries).filter((c) => {
    const level = calculateMatch(c, filters)
    return level === 'great' || level === 'good'
  }).length
}
