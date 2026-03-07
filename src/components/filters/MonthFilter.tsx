import { RangeSlider } from "./RangeSlider";
import { MONTHS_SHORT } from "@/lib/constants";
const MONTH_MIN = 1;
const MONTH_MAX = 12;

type Props = {
  monthFrom: number | undefined;
  monthTo: number | undefined;
  onChange: (from: number | undefined, to: number | undefined) => void;
  style?: React.CSSProperties;
};

export function MonthFilter({ monthFrom, monthTo, onChange, style }: Props) {
  const sliderFrom = monthFrom ?? MONTH_MIN;
  const sliderTo = monthTo ?? MONTH_MAX;

  function handleChange([newFrom, newTo]: [number, number]) {
    onChange(newFrom === MONTH_MIN ? undefined : newFrom, newTo === MONTH_MAX ? undefined : newTo);
  }

  return (
    <div
      style={style}
      className="absolute top-full z-20 mt-1 w-64 rounded-lg border border-white/10 bg-gray-950/90 p-4 shadow-xl backdrop-blur-xl"
    >
      <RangeSlider
        min={MONTH_MIN}
        max={MONTH_MAX}
        step={1}
        value={[sliderFrom, sliderTo]}
        onValueChange={handleChange}
        labelMin={MONTHS_SHORT[sliderFrom - 1]}
        labelMax={MONTHS_SHORT[sliderTo - 1]}
      />
    </div>
  );
}
