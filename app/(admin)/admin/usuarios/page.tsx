import { getUsersList } from '@/app/actions/admin'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersAdminPage() {
  const { users, error } = await getUsersList()

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Error al cargar usuarios: {error}
      </div>
    )
  }

  return <UsersClient initialUsers={users || []} />
}
