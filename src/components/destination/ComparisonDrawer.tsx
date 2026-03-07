import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { calculateMatch, hasActiveFilters } from '@/lib/scoring'
import type { Filters } from '@/lib/scoring'
import { MONTHS_LETTER, MONTHS_FULL, MATCH_CONFIG } from '@/lib/constants'

type Props = {
  codes: string[]
  filters: Filters
  onRemove: (code: string) => void
  onClearAll: () => void
}

export function ComparisonDrawer({ codes, filters, onRemove, onClearAll }: Props) {
  const [visible, setVisible] = useState(false)
  const [rendered, setRendered] = useState(false)
  // Garde les derniers codes connus pour que le contenu reste visible pendant l'animation de sortie
  const lastCodesRef = useRef(codes)
  if (codes.length > 0) lastCodesRef.current = codes
  const displayCodes = lastCodesRef.current

  const countries = useAppStore((s) => s.countries)
  const wishlistItems = useAppStore((s) => s.wishlistItems)
  const hasItems = codes.length > 0

  useEffect(() => {
    if (hasItems) {
      setRendered(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
      const id = setTimeout(() => setRendered(false), 310)
      return () => clearTimeout(id)
    }
  }, [hasItems])

  if (!rendered) return null

  const filtersActive = hasActiveFilters(filters)
  const smCols = displayCodes.length === 1 ? 'sm:grid-cols-1' : displayCodes.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
  const cols = `grid-cols-1 ${smCols}`

  // Calcul des "meilleurs" pour highlight — seulement si 2+ colonnes
  const validCountries = displayCodes.map((c) => countries[c]).filter(Boolean)
  const bestBudget = validCountries.length > 1 ? Math.min(...validCountries.map((c) => c!.dailyBudgetLow)) : null
  const bestSafety = validCountries.length > 1 ? Math.max(...validCountries.map((c) => c!.safetyScore)) : null

  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-10',
        'bg-[#0a0b0f]/96 backdrop-blur-xl backdrop-saturate-[180%]',
        'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      {/* Accent bar top */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1, transparent)' }} />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
            Comparaison
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-white">
            {codes.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-600 transition hover:text-white"
          >
            Tout effacer
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className={`grid ${cols} divide-y divide-white/10 sm:divide-y-0 sm:divide-x max-h-[30vh] sm:max-h-[38vh] overflow-y-auto scrollbar-none`}>
        {displayCodes.map((code) => {
          const country = countries[code]
          if (!country) return null

          const matchLevel = filtersActive ? calculateMatch(country, filters) : null
          const match = matchLevel && matchLevel !== 'no-data' ? MATCH_CONFIG[matchLevel] : null
          const wishlisted = wishlistItems.filter((i) => i.countryCode === code)

          return (
            <div key={code} className="relative px-4 py-3">
              {/* Remove button */}
              <button
                onClick={() => onRemove(code)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-white/10 hover:text-white"
                aria-label={`Retirer ${country.name}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M8 2L2 8M2 2l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Country name */}
              <div className="mb-2 pr-4">
                {country.region && (
                  <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-gray-600">
                    {country.region}
                  </p>
                )}
                <p className="text-sm font-semibold text-white">{country.name}</p>
              </div>

              {/* Match badge */}
              {match && (
                <div className="mb-2 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${match.dot}`} />
                  <span className={`text-[11px] font-medium ${match.text}`}>{match.label}</span>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-1">
                <StatLine
                  label="Budget/j"
                  value={`${country.dailyBudgetLow}€ – ${country.dailyBudgetHigh}€`}
                  best={bestBudget !== null && country.dailyBudgetLow === bestBudget}
                />
                <StatLine
                  label="Durée"
                  value={`${country.recommendedDaysMin} – ${country.recommendedDaysMax}j`}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Sécurité</span>
                  <span className="flex gap-0.5" role="img" aria-label={`Sécurité ${country.safetyScore} sur 5`}>
                    {Array.from({ length: 5 }, (_, i) => {
                      const filled = i < country.safetyScore
                      const isBest = bestSafety !== null && country.safetyScore === bestSafety
                      return (
                        <span
                          key={i}
                          aria-hidden="true"
                          className={`text-[10px] leading-none ${filled ? (isBest ? 'text-green-400' : 'text-amber-400') : 'text-white/10'}`}
                        >
                          ●
                        </span>
                      )
                    })}
                  </span>
                </div>
                {/* Best months — compact bar */}
                <div className="flex gap-px pt-0.5">
                  {MONTHS_LETTER.map((m, i) => {
                    const isBest = country.bestMonths.includes(i + 1)
                    return (
                      <div
                        key={i}
                        title={MONTHS_FULL[i]}
                        className={`h-1.5 flex-1 rounded-full ${isBest ? 'bg-green-500/60' : 'bg-white/5'}`}
                      />
                    )
                  })}
                </div>
                {wishlisted.length > 0 && (
                  <p className="text-xs text-gray-500">
                    🧳 {wishlisted.length} POI{wishlisted.length > 1 ? 's' : ''} en wishlist
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatLine({ label, value, best }: { label: string; value: string; best?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${best ? 'text-green-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}
