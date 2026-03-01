export type MapStyle = 'dark' | 'satellite'

type Props = {
  current: MapStyle
  onToggle: () => void
}

export function MapStyleToggle({ current, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={current === 'dark' ? 'Passer en vue satellite' : 'Passer en vue sombre'}
      className="absolute bottom-8 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-gray-900/90 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-gray-800/90"
    >
      {current === 'dark' ? (
        <>
          <span>🛰️</span>
          <span>Satellite</span>
        </>
      ) : (
        <>
          <span>🗺️</span>
          <span>Carte</span>
        </>
      )}
    </button>
  )
}
