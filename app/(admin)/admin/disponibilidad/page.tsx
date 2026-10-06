import {
  getWeeklyRules,
  getCalendarOverrides,
  getAvailabilityBlocks,
  getOfficialDeliveryPoints,
} from '@/app/actions/admin'
import AvailabilityClient from './AvailabilityClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    mode?: string
    action?: string
  }>
}

export default async function AvailabilityAdminPage({ searchParams }: PageProps) {
  const params = await searchParams
  const mode = params.mode || 'official_point'
  const action = params.action

  const [rulesRes, overridesRes, blocksRes, pointsRes] = await Promise.all([
    getWeeklyRules(),
    getCalendarOverrides(),
    getAvailabilityBlocks(),
    getOfficialDeliveryPoints(),
  ])

  return (
    <AvailabilityClient
      initialRules={rulesRes.rules || []}
      initialOverrides={overridesRes.overrides || []}
      initialBlocks={blocksRes.blocks || []}
      officialPoints={pointsRes.points || []}
      defaultMode={mode}
      defaultAction={action}
    />
  )
}
