import { redirect } from 'next/navigation';
import { verifyAdminCaller, getAdminPaymentSettings } from '@/app/actions/admin';
import { AjustesClient } from './AjustesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminAjustesPage() {
  const auth = await verifyAdminCaller();
  if (auth.error || !auth.supabase) {
    redirect('/iniciar-sesion');
  }

  const { settings } = await getAdminPaymentSettings();

  const fallbackSettings = {
    enabled: false,
    bankName: '',
    accountHolder: '',
    clabe: '',
    instructions: '',
  };

  return <AjustesClient initialSettings={settings || fallbackSettings} />;
}
