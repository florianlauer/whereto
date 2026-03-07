import * as Slider from "@radix-ui/react-slider";

const BUDGET_MIN = 100;
const BUDGET_MAX = 10000;
const DAYS_MIN = 1;
const DAYS_MAX = 90;

const thumbClass =
  "block h-4 w-4 cursor-grab rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:cursor-grabbing";

type Props = {
  tripBudget: number;
  tripDaysMin: number;
  tripDaysMax: number;
  onChange: (budget: number, daysMin: number, daysMax: number) => void;
  style?: React.CSSProperties;
};

export function VoyageFilter({ tripBudget, tripDaysMin, tripDaysMax, onChange, style }: Props) {
  const dailyMax = Math.round(tripBudget / tripDaysMin);
  const dailyMin = tripDaysMax >= DAYS_MAX ? null : Math.round(tripBudget / tripDaysMax);

  const budgetLabel =
    tripBudget >= BUDGET_MAX ? "10 000€+" : `${tripBudget.toLocaleString("fr-FR")}€`;
  const daysLabel =
    tripDaysMin === tripDaysMax ? `${tripDaysMin}j` : `${tripDaysMin}–${tripDaysMax}j`;
  const dailyLabel = dailyMin ? `≈ ${dailyMin}€ – ${dailyMax}€/jour` : `≈ ${dailyMax}€/jour max`;

  return (
    <div
      style={style}
      className="absolute top-full z-20 mt-1 w-72 rounded-lg border border-white/10 bg-gray-950/90 p-4 shadow-xl backdrop-blur-xl"
    >
      {/* Budget total */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-gray-400">Budget total</span>
          <span className="font-mono text-white">{budgetLabel}</span>
        </div>
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={50}
          value={[tripBudget]}
          onValueChange={([v]) => onChange(v, tripDaysMin, tripDaysMax)}
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-gray-700">
            <Slider.Range className="absolute h-full rounded-full bg-green-500" />
          </Slider.Track>
          <Slider.Thumb aria-label="Budget total" className={thumbClass} />
        </Slider.Root>
      </div>

      {/* Durée du séjour */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-gray-400">Durée du séjour</span>
          <span className="font-mono text-white">{daysLabel}</span>
        </div>
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          min={DAYS_MIN}
          max={DAYS_MAX}
          step={1}
          value={[tripDaysMin, tripDaysMax]}
          onValueChange={([min, max]) => onChange(tripBudget, min, max)}
          minStepsBetweenThumbs={1}
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-gray-700">
            <Slider.Range className="absolute h-full rounded-full bg-green-500" />
          </Slider.Track>
          <Slider.Thumb aria-label="Durée minimum" className={thumbClass} />
          <Slider.Thumb aria-label="Durée maximum" className={thumbClass} />
        </Slider.Root>
      </div>

      {/* Budget/jour calculé */}
      <div className="rounded-md bg-green-500/10 px-3 py-2 text-center text-xs font-medium text-green-400">
        {dailyLabel}
      </div>
    </div>
  );
}
