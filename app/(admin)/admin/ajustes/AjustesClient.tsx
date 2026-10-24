'use client';

import React, { useState } from 'react';
import { CreditCard, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveAdminPaymentSettings, type AdminPaymentBankSettings } from '@/app/actions/admin';

export function AjustesClient({
  initialSettings,
}: {
  initialSettings: AdminPaymentBankSettings;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [bankName, setBankName] = useState(initialSettings.bankName);
  const [accountHolder, setAccountHolder] = useState(initialSettings.accountHolder);
  const [clabe, setClabe] = useState(initialSettings.clabe);
  const [instructions, setInstructions] = useState(initialSettings.instructions);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await saveAdminPaymentSettings({
        enabled,
        bankName,
        accountHolder,
        clabe,
        instructions,
      });

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error inesperado al guardar la configuración.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#261C19]">Ajustes de Operación</h1>
        <p className="text-xs sm:text-sm text-[#6E564F]">
          Configuraciones generales del taller y métodos de cobro para clientes.
        </p>
      </div>

      {/* Payment Settings Card */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#F2ECE1] bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#A73832] text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#261C19]">PAGOS POR TRANSFERENCIA</h2>
              <p className="text-[11px] text-[#6E564F]">
                Datos bancarios que se mostrarán al cliente cuando su pedido sea aprobado.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs text-[#261C19]">
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Toggle Enabled */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F2ECE1]">
            <div className="space-y-0.5">
              <label htmlFor="enabledToggle" className="font-bold text-xs text-[#261C19] cursor-pointer">
                Habilitar pagos por transferencia bancaria
              </label>
              <p className="text-[11px] text-[#6E564F]">
                Si está desactivado, los clientes verán que las instrucciones aún no están disponibles.
              </p>
            </div>
            <input
              id="enabledToggle"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 accent-[#A73832] rounded cursor-pointer"
            />
          </div>

          <div className={`space-y-4 transition-opacity ${!enabled ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bankNameInput" className="block text-[11px] font-bold text-[#6E564F] mb-1">
                  Banco {enabled && <span className="text-[#A73832]">*</span>}
                </label>
                <input
                  id="bankNameInput"
                  type="text"
                  maxLength={50}
                  required={enabled}
                  disabled={!enabled}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej. BBVA, Banorte, Santander"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCC4] text-xs bg-white text-[#261C19] focus:outline-none focus:border-[#A73832]"
                />
              </div>

              <div>
                <label htmlFor="accountHolderInput" className="block text-[11px] font-bold text-[#6E564F] mb-1">
                  Titular de la cuenta {enabled && <span className="text-[#A73832]">*</span>}
                </label>
                <input
                  id="accountHolderInput"
                  type="text"
                  maxLength={100}
                  required={enabled}
                  disabled={!enabled}
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nombre de la persona o razón social"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCC4] text-xs bg-white text-[#261C19] focus:outline-none focus:border-[#A73832]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clabeInput" className="block text-[11px] font-bold text-[#6E564F] mb-1">
                CLABE interbancaria o Número de cuenta {enabled && <span className="text-[#A73832]">*</span>}
              </label>
              <input
                id="clabeInput"
                type="text"
                maxLength={30}
                required={enabled}
                disabled={!enabled}
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="18 dígitos de CLABE interbancaria"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCC4] text-xs font-mono bg-white text-[#261C19] focus:outline-none focus:border-[#A73832]"
              />
            </div>

            <div>
              <label htmlFor="instructionsInput" className="block text-[11px] font-bold text-[#6E564F] mb-1">
                Instrucciones adicionales para el cliente
              </label>
              <textarea
                id="instructionsInput"
                rows={3}
                maxLength={500}
                disabled={!enabled}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej. Realiza tu transferencia indicando tu número de pedido como referencia o concepto..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCC4] text-xs bg-white text-[#261C19] focus:outline-none focus:border-[#A73832]"
              />
              <p className="text-[10px] text-[#6E564F] mt-1 text-right">
                {instructions.length} / 500 caracteres
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F2ECE1] flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A73832] hover:bg-[#8E2E28] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
