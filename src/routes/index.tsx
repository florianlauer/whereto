import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MapView } from "@/components/map/MapView";
import { FilterBar } from "@/components/filters/FilterBar";
import { MatchBadge } from "@/components/filters/MatchBadge";
import type { Filters } from "@/lib/scoring";

const filterSchema = z.object({
  // Mode simple
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  daysMin: z.coerce.number().optional(),
  daysMax: z.coerce.number().optional(),
  // Mode voyage
  tripBudget: z.coerce.number().optional(),
  tripDaysMin: z.coerce.number().optional(),
  tripDaysMax: z.coerce.number().optional(),
  // Partagé
  monthFrom: z.coerce.number().min(1).max(12).optional(),
  monthTo: z.coerce.number().min(1).max(12).optional(),
});

export type AppSearch = z.infer<typeof filterSchema>;

export const Route = createFileRoute("/")({
  validateSearch: filterSchema,
  component: MapPage,
});

function computeFilters(search: AppSearch): Filters {
  if (search.tripBudget !== undefined) {
    const minDays = search.tripDaysMin ?? 7;
    const effectiveBudgetMax =
      search.tripBudget >= 10000 ? undefined : Math.round(search.tripBudget / minDays);
    return {
      budgetMax: effectiveBudgetMax,
      daysMin: search.tripDaysMin,
      daysMax: search.tripDaysMax,
      monthFrom: search.monthFrom,
      monthTo: search.monthTo,
    };
  }
  return {
    budgetMin: search.budgetMin,
    budgetMax: search.budgetMax,
    daysMin: search.daysMin,
    daysMax: search.daysMax,
    monthFrom: search.monthFrom,
    monthTo: search.monthTo,
  };
}

function MapPage() {
  const search = Route.useSearch();
  const filters = computeFilters(search);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <FilterBar search={search} />
      <MapView filters={filters} />
      <MatchBadge filters={filters} />
    </div>
  );
}
