import { getCustomersList } from '@/app/actions/admin'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersAdminPage() {
  const { customers, error } = await getCustomersList()

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm">
        Error al cargar clientes: {error}
      </div>
    )
  }

  return <UsersClient initialCustomers={customers || []} />
}
