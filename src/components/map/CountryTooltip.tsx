type Props = {
  x: number
  y: number
  name: string
}

export function CountryTooltip({ x, y, name }: Props) {
  return (
    <div
      style={{ position: 'absolute', left: x + 12, top: y - 28, pointerEvents: 'none' }}
      className="rounded bg-gray-900/90 px-2 py-1 text-xs text-white shadow"
    >
      {name}
    </div>
  )
}
