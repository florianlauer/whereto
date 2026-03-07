import * as Slider from "@radix-ui/react-slider";

type Props = {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  labelMin: string;
  labelMax: string;
};

export function RangeSlider({ min, max, step, value, onValueChange, labelMin, labelMax }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs">
        <span className="font-mono text-white">{labelMin}</span>
        <span className="font-mono text-white">{labelMax}</span>
      </div>
      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onValueChange(v as [number, number])}
        minStepsBetweenThumbs={1}
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-gray-700">
          <Slider.Range className="absolute h-full rounded-full bg-green-500" />
        </Slider.Track>
        <Slider.Thumb
          aria-label="Minimum"
          className="block h-4 w-4 cursor-grab rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:cursor-grabbing"
        />
        <Slider.Thumb
          aria-label="Maximum"
          className="block h-4 w-4 cursor-grab rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:cursor-grabbing"
        />
      </Slider.Root>
    </div>
  );
}
