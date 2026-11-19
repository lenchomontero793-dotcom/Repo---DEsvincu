import { useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, Settings, Wrench } from 'lucide-react';
import type { Platform, User } from '../types';
import { formatRelativeTime } from '../utils/formatters';
import { PlatformBadge } from './StatusLabel';

interface PlatformsViewProps {
  platforms: Platform[];
  users: User[];
  onSyncPlatform: (platformId: string) => Promise<void>;
  onConfigurePlatform: (platform: Platform) => void;
  onAddPlatform: () => void;
}

export function PlatformsView({
  platforms,
  users,
  onSyncPlatform,
  onConfigurePlatform,
  onAddPlatform,
}: PlatformsViewProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (platformId: string) => {
    setSyncingId(platformId);
    try {
      await onSyncPlatform(platformId);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#141413]">Plataformas integradas</h2>
          <p className="text-xs text-[#5E5D57] mt-0.5">
            Conecta sistemas corporativos (SAP, Salesforce, Office 365, ERP/HCM propios) para sincronizar identidades y validar accesos.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddPlatform}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva integración</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => {
          const activeAccounts = users.filter((u) =>
            u.accounts.some((a) => a.platformId === platform.id && a.status === 'Activo'),
          ).length;
          const pendingRevoke = users.filter((u) =>
            u.accounts.some((a) => a.platformId === platform.id && a.status === 'Pendiente revocar'),
          ).length;
          const isSyncing = syncingId === platform.id;

          return (
            <div
              key={platform.id}
              className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformBadge platform={platform} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#141413] truncate">
                        {platform.name}
                      </div>
                      <div className="text-[11px] text-[#73726C]">
                        {platform.type} · {platform.syncMode}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 ${
                      platform.status === 'Operativo'
                        ? 'text-[#2E6B1E]'
                        : 'text-[#854F0B]'
                    }`}
                  >
                    {platform.status === 'Operativo' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5" />
                    )}
                    <span>{platform.status}</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] text-[#5E5D57]">Cuentas activas</div>
                    <div className="text-2xl font-semibold text-[#141413] tabular-nums mt-0.5">
                      {activeAccounts}
                    </div>
                  </div>
                  {pendingRevoke > 0 && (
                    <div className="text-right">
                      <div className="text-[11px] text-[#993C1D]">Por revocar</div>
                      <div className="text-base font-semibold text-[#B93535] tabular-nums">
                        {pendingRevoke}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-[#1F1E1D]/10 text-[11px] text-[#73726C] space-y-1">
                  <div className="truncate font-mono-tabular" title={platform.endpoint}>
                    {platform.endpoint}
                  </div>
                  <div>
                    Sincronizado {formatRelativeTime(platform.lastSyncAt)}
                    {platform.requiredForActive && ' · Obligatoria para activos'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleSync(platform.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413] disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onConfigurePlatform(platform)}
                  title={`Configurar ${platform.name}`}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413]"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
