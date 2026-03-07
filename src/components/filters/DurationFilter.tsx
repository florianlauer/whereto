import { RangeSlider } from "./RangeSlider";

const DAYS_MIN = 1;
const DAYS_MAX = 90;

type Props = {
  daysMin: number | undefined;
  daysMax: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  style?: React.CSSProperties;
};

export function DurationFilter({ daysMin, daysMax, onChange, style }: Props) {
  const sliderMin = daysMin ?? DAYS_MIN;
  const sliderMax = daysMax ?? DAYS_MAX;

  function handleChange([newMin, newMax]: [number, number]) {
    onChange(newMin === DAYS_MIN ? undefined : newMin, newMax === DAYS_MAX ? undefined : newMax);
  }

  return (
    <div
      style={style}
      className="absolute top-full z-20 mt-1 w-64 rounded-lg border border-white/10 bg-gray-950/90 p-4 shadow-xl backdrop-blur-xl"
    >
      <RangeSlider
        min={DAYS_MIN}
        max={DAYS_MAX}
        step={1}
        value={[sliderMin, sliderMax]}
        onValueChange={handleChange}
        labelMin={`${sliderMin}j`}
        labelMax={sliderMax >= DAYS_MAX ? "90j+" : `${sliderMax}j`}
      />
    </div>
  );
}
