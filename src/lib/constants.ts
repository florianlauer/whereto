import type { MatchLevel } from './scoring'

/** Single-letter month labels (for compact displays like month bars) */
export const MONTHS_LETTER = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

/** Short month labels in French */
export const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'] as const

/** Full month names for accessible tooltips */
export const MONTHS_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

/** Match level display config — colors and labels */
export const MATCH_CONFIG: Record<MatchLevel, { label: string; dot: string; border: string; text: string }> = {
  great:     { label: 'Idéal',      dot: 'bg-green-400',  border: 'border-green-500/40',  text: 'text-green-400' },
  good:      { label: 'Compatible', dot: 'bg-yellow-400', border: 'border-yellow-500/40', text: 'text-yellow-400' },
  poor:      { label: 'Difficile',  dot: 'bg-red-400',    border: 'border-red-500/40',    text: 'text-red-400' },
  'no-data': { label: '',           dot: '',              border: '',                     text: '' },
}
