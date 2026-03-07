import { useAppStore } from "@/stores/appStore";
import { countMatches, hasActiveFilters } from "@/lib/scoring";
import type { Filters } from "@/lib/scoring";

type Props = {
  filters: Filters;
};

export function MatchBadge({ filters }: Props) {
  const countries = useAppStore((s) => s.countries);
  const isActive = hasActiveFilters(filters);

  if (!isActive) {
    return (
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] truncate rounded-full bg-gray-950/80 px-4 py-2.5 text-center text-xs text-gray-400 backdrop-blur-sm sm:px-5 sm:text-sm">
        Définissez votre budget pour découvrir les destinations
      </div>
    );
  }

  const count = countMatches(countries, filters);

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] truncate rounded-full bg-gray-950/80 px-4 py-2.5 text-center text-xs text-white backdrop-blur-sm sm:px-5 sm:text-sm">
      <span className="font-bold text-green-400">{count}</span> destination{count !== 1 ? "s" : ""}{" "}
      correspondent à vos critères
    </div>
  );
}
