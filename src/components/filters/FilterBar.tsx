import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BudgetFilter } from './BudgetFilter'
import { DurationFilter } from './DurationFilter'
import { MonthFilter } from './MonthFilter'
import { VoyageFilter } from './VoyageFilter'
import { MONTHS_SHORT } from '@/lib/constants'
import type { AppSearch } from '@/routes/index'

// Defaults when entering voyage mode
const TRIP_BUDGET_DEFAULT = 2000
const TRIP_DAYS_MIN_DEFAULT = 7
const TRIP_DAYS_MAX_DEFAULT = 14

type Panel = 'budget' | 'duration' | 'month' | 'voyage'

type Props = {
  search: AppSearch
}

export function FilterBar({ search }: Props) {
  const navigate = useNavigate()
  const [openPanel, setOpenPanel] = useState<Panel | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const budgetBtnRef = useRef<HTMLButtonElement>(null)
  const durationBtnRef = useRef<HTMLButtonElement>(null)
  const monthBtnRef = useRef<HTMLButtonElement>(null)
  const voyageBtnRef = useRef<HTMLButtonElement>(null)

  const isVoyageMode = search.tripBudget !== undefined
  const isActive =
    isVoyageMode ||
    search.budgetMin !== undefined ||
    search.budgetMax !== undefined ||
    search.daysMin !== undefined ||
    search.daysMax !== undefined ||
    search.monthFrom !== undefined ||
    search.monthTo !== undefined

  useEffect(() => {
    if (!openPanel) return
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPanel(null)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPanel])

  function updateSearch(updates: Partial<AppSearch>) {
    void navigate({
      to: '/',
      search: (prev) => ({ ...prev, ...updates }),
      replace: true,
    })
  }

  function resetFilters() {
    void navigate({ to: '/', search: {}, replace: true })
    setOpenPanel(null)
  }

  function enterVoyageMode() {
    void navigate({
      to: '/',
      search: (prev) => ({
        monthFrom: prev.monthFrom,
        monthTo: prev.monthTo,
        tripBudget: TRIP_BUDGET_DEFAULT,
        tripDaysMin: TRIP_DAYS_MIN_DEFAULT,
        tripDaysMax: TRIP_DAYS_MAX_DEFAULT,
      }),
      replace: true,
    })
  }

  function exitVoyageMode() {
    void navigate({
      to: '/',
      search: (prev) => ({
        monthFrom: prev.monthFrom,
        monthTo: prev.monthTo,
      }),
      replace: true,
    })
    setOpenPanel(null)
  }

  function togglePanel(panel: Panel) {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  function panelLeft(ref: React.RefObject<HTMLButtonElement | null>, panelWidth = 256) {
    if (!ref.current || !barRef.current) return 0
    const left = ref.current.offsetLeft
    const maxLeft = window.innerWidth - panelWidth - 16
    return Math.max(8, Math.min(left, maxLeft))
  }

  // --- Label helpers ---
  function budgetLabel() {
    const { budgetMin, budgetMax } = search
    if (!budgetMin && !budgetMax) return 'Budget'
    const minStr = `${budgetMin ?? 10}€`
    const maxStr = budgetMax ? `${budgetMax}€` : '500€+'
    return `${minStr}–${maxStr}`
  }

  function durationLabel() {
    const { daysMin, daysMax } = search
    if (!daysMin && !daysMax) return 'Durée'
    const minStr = `${daysMin ?? 1}j`
    const maxStr = daysMax ? `${daysMax}j` : '90j+'
    return `${minStr}–${maxStr}`
  }

  function monthLabel() {
    const { monthFrom, monthTo } = search
    if (!monthFrom && !monthTo) return 'Mois'
    const fromStr = MONTHS_SHORT[(monthFrom ?? 1) - 1]
    const toStr = MONTHS_SHORT[(monthTo ?? 12) - 1]
    return monthFrom === monthTo ? fromStr : `${fromStr}–${toStr}`
  }

  function voyageLabel() {
    const budget = search.tripBudget!
    const dMin = search.tripDaysMin ?? TRIP_DAYS_MIN_DEFAULT
    const dMax = search.tripDaysMax ?? TRIP_DAYS_MAX_DEFAULT
    const budgetStr = budget >= 10000 ? '10k€+' : `${budget.toLocaleString('fr-FR')}€`
    const daysStr = dMin === dMax ? `${dMin}j` : `${dMin}–${dMax}j`
    return `${budgetStr} · ${daysStr}`
  }

  // --- Style helpers ---
  const budgetActive = search.budgetMin !== undefined || search.budgetMax !== undefined
  const durationActive = search.daysMin !== undefined || search.daysMax !== undefined
  const monthActive = search.monthFrom !== undefined || search.monthTo !== undefined

  function btnClass(active: boolean, open: boolean) {
    return [
      'flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition',
      active || open
        ? 'border-green-500/50 text-green-400'
        : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white',
    ].join(' ')
  }

  return (
    <div
      ref={barRef}
      className="absolute left-0 right-0 top-0 z-10 border-b border-white/5 bg-gray-950/70 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3.5">
        <img src="/logo.png" alt="whereto" className="hidden h-10 w-auto shrink-0 sm:block" />

        <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none sm:gap-3">
          {isVoyageMode ? (
            <>
              {/* Mode voyage : bouton unique Mon voyage */}
              <button
                ref={voyageBtnRef}
                onClick={() => togglePanel('voyage')}
                className={btnClass(true, openPanel === 'voyage')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l-1.4 1.4 3 3-1 3-3-1-1.4 1.4L1.8 22l1.4 1.4 3-1 3 3 1.4-1.4-1-3 3-1 3 3 1.4-1.4z"/>
                </svg>
                {voyageLabel()}
              </button>

              {/* Mois reste disponible */}
              <button
                ref={monthBtnRef}
                onClick={() => togglePanel('month')}
                className={btnClass(monthActive, openPanel === 'month')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 0 0 20" /><path d="M12 2c-4 4-4 12 0 20" /><path d="M2 12h10" /><path d="M12 7a5 5 0 0 1 5 5" />
                </svg>
                {monthLabel()}
              </button>

              {/* Toggle retour mode simple */}
              <button
                onClick={exitVoyageMode}
                className="text-xs text-gray-500 transition hover:text-gray-300"
                title="Retour aux filtres détaillés"
              >
                ← Détail
              </button>
            </>
          ) : (
            <>
              {/* Mode simple : Budget + Durée + Mois */}
              <button
                ref={budgetBtnRef}
                onClick={() => togglePanel('budget')}
                className={btnClass(budgetActive, openPanel === 'budget')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><path d="M14.5 9a3.5 3 0 1 0 0 6H9" /><path d="M9 9h6" />
                </svg>
                {budgetLabel()}
              </button>

              <button
                ref={durationBtnRef}
                onClick={() => togglePanel('duration')}
                className={btnClass(durationActive, openPanel === 'duration')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {durationLabel()}
              </button>

              <button
                ref={monthBtnRef}
                onClick={() => togglePanel('month')}
                className={btnClass(monthActive, openPanel === 'month')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 0 0 20" /><path d="M12 2c-4 4-4 12 0 20" /><path d="M2 12h10" /><path d="M12 7a5 5 0 0 1 5 5" />
                </svg>
                {monthLabel()}
              </button>

              {/* Toggle vers mode voyage */}
              <button
                onClick={enterVoyageMode}
                className="flex items-center gap-1 text-xs text-gray-500 transition hover:text-gray-300"
                title="Planifier avec un budget voyage global"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l-1.4 1.4 3 3-1 3-3-1-1.4 1.4L1.8 22l1.4 1.4 3-1 3 3 1.4-1.4-1-3 3-1 3 3 1.4-1.4z"/>
                </svg>
                Voyage
              </button>
            </>
          )}
        </div>

        {isActive && (
          <button
            onClick={resetFilters}
            title="Réinitialiser tous les filtres"
            className="shrink-0 rounded border border-white/10 px-2 py-1 text-xs text-gray-400 transition hover:border-white/20 hover:text-white"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Panels — en dehors du container pour éviter le clipping overflow */}
      {!isVoyageMode && openPanel === 'budget' && (
        <BudgetFilter
          style={{ left: panelLeft(budgetBtnRef) }}
          budgetMin={search.budgetMin}
          budgetMax={search.budgetMax}
          onChange={(min, max) => updateSearch({ budgetMin: min, budgetMax: max })}
        />
      )}
      {!isVoyageMode && openPanel === 'duration' && (
        <DurationFilter
          style={{ left: panelLeft(durationBtnRef) }}
          daysMin={search.daysMin}
          daysMax={search.daysMax}
          onChange={(min, max) => updateSearch({ daysMin: min, daysMax: max })}
        />
      )}
      {openPanel === 'month' && (
        <MonthFilter
          style={{ left: panelLeft(monthBtnRef) }}
          monthFrom={search.monthFrom}
          monthTo={search.monthTo}
          onChange={(from, to) => updateSearch({ monthFrom: from, monthTo: to })}
        />
      )}
      {isVoyageMode && openPanel === 'voyage' && (
        <VoyageFilter
          style={{ left: panelLeft(voyageBtnRef, 288) }}
          tripBudget={search.tripBudget!}
          tripDaysMin={search.tripDaysMin ?? TRIP_DAYS_MIN_DEFAULT}
          tripDaysMax={search.tripDaysMax ?? TRIP_DAYS_MAX_DEFAULT}
          onChange={(budget, dMin, dMax) =>
            updateSearch({ tripBudget: budget, tripDaysMin: dMin, tripDaysMax: dMax })
          }
        />
      )}
    </div>
  )
}
