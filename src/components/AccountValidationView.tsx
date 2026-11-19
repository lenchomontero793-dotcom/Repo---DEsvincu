import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Minus, Search, ShieldCheck } from 'lucide-react';
import type { Platform, User } from '../types';
import { PlatformBadge, UserStatusLabel } from './StatusLabel';

interface AccountValidationViewProps {
  users: User[];
  platforms: Platform[];
  searchQuery: string;
  canWrite: boolean;
  onTogglePlatform: (userId: string, platformId: string, enable: boolean) => Promise<void>;
  onInspectUser: (userId: string) => void;
}

export function AccountValidationView({
  users,
  platforms,
  searchQuery,
  canWrite,
  onTogglePlatform,
  onInspectUser,
}: AccountValidationViewProps) {
  const [batchLookup, setBatchLookup] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const batchTokens = useMemo(() => {
    return batchLookup
      .split(/[\n,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }, [batchLookup]);

  const visibleUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesGlobal =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rut.toLowerCase().includes(q);
      const matchesBatch =
        batchTokens.length === 0 ||
        batchTokens.some(
          (tok) =>
            u.email.toLowerCase().includes(tok) ||
            u.rut.toLowerCase().includes(tok) ||
            u.name.toLowerCase().includes(tok),
        );
      return matchesGlobal && matchesBatch;
    });
  }, [users, searchQuery, batchTokens]);

  const handleCellClick = async (user: User, platformId: string, hasAccount: boolean) => {
    const key = `${user.id}:${platformId}`;
    setBusyKey(key);
    try {
      await onTogglePlatform(user.id, platformId, !hasAccount);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[#141413]">
            Validación cruzada de cuentas por plataforma
          </h2>
          <p className="text-xs text-[#5E5D57] mt-0.5">
            Verifica exactamente en qué plataformas tiene cuenta cada colaborador y habilita o revoca accesos directamente desde la matriz.
          </p>
        </div>
      </div>

      {/* Individual or Batch Validator */}
      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3D3D3A]">
            <ShieldCheck className="w-4 h-4 text-[#185FA5]" />
            <span>Validador rápido (por nombre, email o lista de RUTs separados por coma o salto de línea)</span>
          </div>
          {batchLookup && (
            <button
              type="button"
              onClick={() => setBatchLookup('')}
              className="text-xs text-[#185FA5] hover:underline"
            >
              Mostrar todos ({users.length})
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[#73726C] absolute left-3 top-2.5" />
          <textarea
            rows={2}
            value={batchLookup}
            onChange={(e) => setBatchLookup(e.target.value)}
            placeholder="Ej: a.garcia@empresa.com, 17.114.508-2, p.ramos@empresa.com..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-[#FAF9F5] text-[#141413] outline-none focus:border-[#378ADD] resize-none"
          />
        </div>
      </div>

      {/* Cross-Platform Matrix */}
      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#F5F4ED] border-b border-[#1F1E1D]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5E5D57]">
          <span className="tabular-nums font-medium">
            {visibleUsers.length} usuarios evaluados frente a {platforms.length} plataformas
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#2E6B1E]">
              <Check className="w-3.5 h-3.5" /> Activo
            </span>
            <span className="inline-flex items-center gap-1 text-[#993C1D]">
              <AlertTriangle className="w-3.5 h-3.5" /> Pendiente revocar
            </span>
            <span className="inline-flex items-center gap-1 text-[#73726C]">
              <Minus className="w-3.5 h-3.5" /> Sin cuenta (clic para habilitar)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#1F1E1D]/10 bg-[#FAF9F5]">
                <th className="py-2.5 px-4 font-semibold text-[#5E5D57] min-w-[210px]">
                  Usuario / Estado maestro
                </th>
                {platforms.map((pl) => (
                  <th key={pl.id} className="py-2.5 px-3 text-center font-semibold text-[#5E5D57] min-w-[110px]">
                    <div className="inline-flex flex-col items-center gap-1">
                      <PlatformBadge platform={pl} />
                      <span className="text-[11px] text-[#3D3D3A] whitespace-nowrap">{pl.name}</span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-4 text-right font-semibold text-[#5E5D57]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1E1D]/10">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FAF9F5] transition-colors">
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => onInspectUser(user.id)}
                      className="text-left group"
                    >
                      <div className="font-medium text-[#141413] group-hover:text-[#185FA5]">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-[#73726C] mt-0.5 flex items-center gap-2">
                        <span className="font-mono-tabular">{user.rut}</span>
                        <span>·</span>
                        <UserStatusLabel status={user.status} />
                      </div>
                    </button>
                  </td>
                  {platforms.map((pl) => {
                    const acc = user.accounts.find((a) => a.platformId === pl.id);
                    const isBusy = busyKey === `${user.id}:${pl.id}`;
                    const isRevokePending = acc?.status === 'Pendiente revocar';

                    return (
                      <td key={pl.id} className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={isBusy || !canWrite}
                          onClick={() => {
                            if (canWrite) void handleCellClick(user, pl.id, Boolean(acc));
                          }}
                          title={
                            !canWrite
                              ? acc
                                ? `${acc.username} (${acc.role}) — Modo solo lectura`
                                : `Sin cuenta en ${pl.name}`
                              : acc
                              ? `${acc.username} (${acc.role}) — Clic para revocar`
                              : `Sin cuenta en ${pl.name} — Clic para habilitar`
                          }
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                            !canWrite ? 'cursor-default' : ''
                          } ${
                            isBusy
                              ? 'opacity-50 cursor-wait bg-[#F3F2EC] text-[#5E5D57]'
                              : isRevokePending
                              ? 'bg-[#FAECE7] text-[#993C1D] hover:bg-[#F5D6CC]'
                              : acc
                              ? 'bg-[#EAF3DE] text-[#2E6B1E] hover:bg-[#DCEACA]'
                              : 'bg-[#F5F4ED] text-[#73726C] hover:bg-[#E8E6DC] hover:text-[#141413]'
                          }`}
                        >
                          {isRevokePending ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Revocar</span>
                            </>
                          ) : acc ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <Minus className="w-3 h-3" />
                              <span>Sin cuenta</span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-[#141413] tabular-nums">
                    {user.accounts.length}/{platforms.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
