import { RangeSlider } from './RangeSlider'

const BUDGET_MIN = 10
const BUDGET_MAX = 500

type Props = {
  budgetMin: number | undefined
  budgetMax: number | undefined
  onChange: (min: number | undefined, max: number | undefined) => void
  style?: React.CSSProperties
}

export function BudgetFilter({ budgetMin, budgetMax, onChange, style }: Props) {
  const sliderMin = budgetMin ?? BUDGET_MIN
  const sliderMax = budgetMax ?? BUDGET_MAX

  function handleChange([newMin, newMax]: [number, number]) {
    onChange(
      newMin === BUDGET_MIN ? undefined : newMin,
      newMax === BUDGET_MAX ? undefined : newMax,
    )
  }

  return (
    <div style={style} className="absolute top-full z-20 mt-1 w-64 rounded-lg border border-white/10 bg-gray-950/90 p-4 shadow-xl backdrop-blur-xl">
      <RangeSlider
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={5}
        value={[sliderMin, sliderMax]}
        onValueChange={handleChange}
        labelMin={`${sliderMin}€`}
        labelMax={sliderMax >= BUDGET_MAX ? '500€+' : `${sliderMax}€`}
      />
    </div>
  )
}
