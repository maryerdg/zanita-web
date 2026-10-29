'use client';

import React from 'react';

interface IosInstallGuideProps {
  title?: string;
  step5Text?: string;
  onDismiss?: () => void;
  dismissText?: string;
}

export function IosInstallGuide({
  title = 'Activa las notificaciones en iPhone o iPad',
  step5Text = 'Activa las notificaciones',
  onDismiss,
  dismissText,
}: IosInstallGuideProps) {
  return (
    <div className="bg-[#FAF7F2] border border-[#EBE3D7] rounded-2xl p-5 text-[#261C19] space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#A73832]/10 text-[#A73832]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </span>
          <h4 className="font-serif font-semibold text-base text-[#261C19]">
            {title}
          </h4>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-stone-400 hover:text-stone-600 text-sm font-sans"
            aria-label="Cerrar instrucciones"
          >
            ✕
          </button>
        )}
      </div>

      <p className="text-xs text-stone-600 leading-relaxed font-sans">
        En dispositivos Apple (iOS / iPadOS), las notificaciones web requieren que agregues Zanita a tu pantalla de inicio:
      </p>

      <ol className="text-xs text-stone-700 space-y-2 font-sans list-decimal list-inside pl-1 bg-white/70 p-3 rounded-xl border border-stone-200/60">
        <li>
          Abre <strong>Zanita en Safari</strong>.
        </li>
        <li>
          Toca el botón <strong>Compartir</strong> <span className="inline-block text-[#A73832]">⎋</span> (ícono de cuadro con flecha).
        </li>
        <li>
          Selecciona <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong>.
        </li>
        <li>
          Abre Zanita desde su <strong>ícono en tu pantalla de inicio</strong>.
        </li>
        <li>
          <strong>{step5Text}</strong>.
        </li>
      </ol>

      {onDismiss && dismissText && (
        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#A73832] text-white hover:bg-[#8e2e28] transition-colors"
          >
            {dismissText}
          </button>
        </div>
      )}
    </div>
  );
}
