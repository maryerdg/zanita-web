import {
  getOfficialDeliveryPoints,
  getKitchenBaseLocation,
  getDeliveryPricingRules,
  getDeliverySurcharges,
} from '@/app/actions/admin'
import DeliveryClient from './DeliveryClient'

export const dynamic = 'force-dynamic'

export default async function DeliveryAdminPage() {
  const [pointsRes, kitchenRes, pricingRes, surchargesRes] = await Promise.all([
    getOfficialDeliveryPoints(),
    getKitchenBaseLocation(),
    getDeliveryPricingRules(),
    getDeliverySurcharges(),
  ])

  return (
    <DeliveryClient
      initialPoints={pointsRes.points || []}
      initialKitchen={
        kitchenRes.location || {
          label: 'Taller Zanita Tijuana',
          latitude: null,
          longitude: null,
        }
      }
      initialPricingRules={pricingRes.rules || []}
      initialSurcharges={surchargesRes.surcharges || []}
    />
  )
}
