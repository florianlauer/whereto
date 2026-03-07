import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { calculateMatch, hasActiveFilters } from '@/lib/scoring'
import type { Filters } from '@/lib/scoring'
import type { POI } from '@/lib/data'
import { MONTHS_LETTER, MONTHS_FULL, MATCH_CONFIG } from '@/lib/constants'
import { WishlistCounter } from './WishlistCounter'

type Props = {
  countryCode: string
  filters: Filters
  onClose: () => void
  isInComparison?: boolean
  onCompare?: () => void
  onOpenTripSummary?: () => void
}

export function DestinationPanel({ countryCode, filters, onClose, isInComparison = false, onCompare, onOpenTripSummary }: Props) {
  const [visible, setVisible] = useState(false)
  const countries = useAppStore((s) => s.countries)
  const pois = useAppStore((s) => s.pois)
  const wishlistItems = useAppStore((s) => s.wishlistItems)
  const addToWishlist = useAppStore((s) => s.addToWishlist)
  const removeFromWishlist = useAppStore((s) => s.removeFromWishlist)
  const clearWishlist = useAppStore((s) => s.clearWishlist)

  const country = countries[countryCode]
  const countryPois = pois[countryCode] ?? []
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  // Focus the panel on mount for keyboard accessibility
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function togglePoi(poi: POI) {
    const isChecked = wishlistItems.some((i) => i.poiId === poi.id)
    if (isChecked) {
      removeFromWishlist(poi.id)
    } else {
      addToWishlist({ poiId: poi.id, countryCode, daysMin: poi.daysMin })
    }
  }

  if (!country) return null

  const filtersActive = hasActiveFilters(filters)
  const matchLevel = filtersActive ? calculateMatch(country, filters) : null
  const match = matchLevel && matchLevel !== 'no-data' ? MATCH_CONFIG[matchLevel] : null

  const flightsUrl = `https://www.google.com/flights#search;t=${countryCode}`

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={country ? `Détails de ${country.name}` : 'Détails destination'}
      tabIndex={-1}
      className={[
        'fixed right-0 top-0 bottom-0 z-20 flex w-[380px] max-w-full flex-col',
        'border-l border-white/10 bg-[#0a0b0f]/96 shadow-[−8px_0_40px_rgba(0,0,0,0.6)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'focus:outline-none',
        visible ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Match accent bar — couleur dynamique en haut du panel */}
      {match && (
        <div className={`h-[2px] w-full ${match.dot.replace('bg-', 'bg-')} opacity-80`}
          style={{
            background: match.dot.includes('green') ? 'linear-gradient(90deg, #22c55e, transparent)' :
                        match.dot.includes('yellow') ? 'linear-gradient(90deg, #eab308, transparent)' :
                        'linear-gradient(90deg, #ef4444, transparent)'
          }}
        />
      )}
      {!match && <div className="h-[2px] w-full bg-white/5" />}

      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          {country.region && (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
              {country.region}
            </p>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
            {country.name}
          </h2>
          {match && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${match.border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${match.dot}`} />
              <span className={`text-xs font-medium ${match.text}`}>{match.label}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-4 shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Contenu scrollable avec fade-out bas */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 pb-4 scrollbar-none">

          {/* Stats — rangées horizontales */}
          <div className="mb-5 divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
            <StatRow
              label="Budget / jour"
              value={`${country.dailyBudgetLow}€`}
              valueAlt={`${country.dailyBudgetHigh}€`}
              hint="low → high"
            />
            <StatRow
              label="Durée idéale"
              value={`${country.recommendedDaysMin}j`}
              valueAlt={`${country.recommendedDaysMax}j`}
              hint="min → max"
            />
            <StatRow
              label="Sécurité"
              value={
                <span className="flex gap-0.5" role="img" aria-label={`Sécurité ${country.safetyScore} sur 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`text-sm leading-none ${i < country.safetyScore ? 'text-amber-400' : 'text-white/10'}`}
                    >
                      ●
                    </span>
                  ))}
                </span>
              }
            />
          </div>

          {/* Saison — barre calendrier */}
          <div className="mb-5">
            <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
              Meilleure saison
            </p>
            <div className="grid grid-cols-12 gap-0.5">
              {MONTHS_LETTER.map((m, i) => {
                const isBest = country.bestMonths.includes(i + 1)
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={[
                        'h-7 w-full rounded-sm transition-colors',
                        isBest ? 'bg-green-500/70' : 'bg-white/5',
                      ].join(' ')}
                    />
                    <span className={`text-[9px] leading-none ${isBest ? 'text-green-400' : 'text-gray-600'}`}>
                      {m}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* POIs */}
          {countryPois.length > 0 && (
            <div className="mb-5">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
                Points d'intérêt
              </p>
              <ul className="space-y-1">
                {countryPois.map((poi) => {
                  const isChecked = wishlistItems.some((i) => i.poiId === poi.id)
                  return (
                    <li
                      key={poi.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onClick={() => togglePoi(poi)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePoi(poi) } }}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-green-500 bg-green-500/20">
                            <svg width="10" height="10" viewBox="0 0 10 10">
                              <path d="M2 5l2.5 2.5L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          </span>
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/20" />
                        )}
                        <span className={`truncate text-sm transition-colors ${isChecked ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                          {poi.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-gray-600">
                        {poi.daysMin === poi.daysMax ? `${poi.daysMin}j` : `${poi.daysMin}–${poi.daysMax}j`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* CTA Comparer */}
          {onCompare && (
            <button
              onClick={onCompare}
              className={[
                'group mb-2 flex w-full items-center justify-between rounded-xl px-4 py-3.5',
                'border transition-all',
                isInComparison
                  ? 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span className={[
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm',
                  isInComparison ? 'bg-blue-500/20' : 'bg-white/10',
                ].join(' ')}>
                  ⚖️
                </span>
                <div>
                  <p className={`text-sm font-medium ${isInComparison ? 'text-blue-300' : 'text-white'}`}>
                    {isInComparison ? 'Dans la comparaison' : 'Comparer'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isInComparison ? 'Cliquer pour retirer' : 'Ajouter à la comparaison'}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform group-hover:translate-x-0.5 ${isInComparison ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* CTA Google Flights */}
          <a
            href={flightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              'group mb-2 flex w-full items-center justify-between rounded-xl px-4 py-3.5',
              'border border-white/10 bg-white/5',
              'transition-all hover:border-white/20 hover:bg-white/10',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
                ✈
              </span>
              <div>
                <p className="text-sm font-medium text-white">Voir les vols</p>
                <p className="text-xs text-gray-500">Google Flights</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Fade-out bas */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-[#0a0b0f]/96 to-transparent" />
      </div>

      <WishlistCounter
        onClear={clearWishlist}
        onOpen={() => onOpenTripSummary?.()}
      />

      {/* Disclaimer */}
      <div className="px-6 py-3 border-t border-white/5">
        <p className="text-center text-[10px] text-gray-600">
          Estimations indicatives · données {country.dataYear}
        </p>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  valueAlt,
  hint,
}: {
  label: string
  value: React.ReactNode
  valueAlt?: string
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between bg-white/2 px-4 py-3">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-medium text-white tabular-nums">{value}</span>
        {valueAlt && (
          <>
            <span className="text-xs text-gray-600">→</span>
            <span className="text-sm font-medium text-white tabular-nums">{valueAlt}</span>
          </>
        )}
        {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
      </div>
    </div>
  )
}
