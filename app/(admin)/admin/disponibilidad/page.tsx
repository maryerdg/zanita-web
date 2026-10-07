import {
  getWeeklyRules,
  getCalendarOverrides,
  getAvailabilityBlocks,
  getOfficialDeliveryPoints,
  getCrossZoneTransitionBuffer,
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

  const [rulesRes, overridesRes, blocksRes, pointsRes, bufferRes] = await Promise.all([
    getWeeklyRules(),
    getCalendarOverrides(),
    getAvailabilityBlocks(),
    getOfficialDeliveryPoints(),
    getCrossZoneTransitionBuffer(),
  ])

  return (
    <AvailabilityClient
      initialRules={rulesRes.rules || []}
      initialOverrides={overridesRes.overrides || []}
      initialBlocks={blocksRes.blocks || []}
      officialPoints={pointsRes.points || []}
      initialBufferMinutes={bufferRes.bufferMinutes ?? 30}
      defaultMode={mode}
      defaultAction={action}
    />
  )
}
