import { getAdminCatalogData } from '@/app/actions/admin-catalog'
import CatalogoClient from './CatalogoClient'

export const dynamic = 'force-dynamic'

export default async function AdminCatalogPage() {
  const result = await getAdminCatalogData()

  if (result.error || !result.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="font-serif text-xl font-bold">No pudimos cargar el catálogo</h1>
        <p className="mt-1 text-sm">{result.error || 'Intenta nuevamente.'}</p>
      </div>
    )
  }

  return <CatalogoClient initialData={result.data} />
}
