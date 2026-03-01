import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MapView } from '@/components/map/MapView'

const filterSchema = z.object({
  budget: z.coerce.number().optional(),
  days: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: filterSchema,
  component: MapPage,
})

function MapPage() {
  return <MapView />
}
