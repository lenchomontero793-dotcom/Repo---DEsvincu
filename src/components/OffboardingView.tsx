import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, UserMinus, X } from 'lucide-react';
import type { OffboardingRecord } from '../types';

interface OffboardingViewProps {
  offboardings: OffboardingRecord[];
  searchQuery: string;
  canWrite: boolean;
  onRevokePlatform: (offboardingId: string, platformId: string) => Promise<void>;
  onRequestRevokeAll: (record: OffboardingRecord) => void;
  onStartOffboarding: () => void;
}

export function OffboardingView({
  offboardings,
  searchQuery,
  canWrite,
  onRevokePlatform,
  onRequestRevokeAll,
  onStartOffboarding,
}: OffboardingViewProps) {
  const [tab, setTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: offboardings.filter((o) => o.status === 'En proceso').length,
      completed: offboardings.filter((o) => o.status === 'Completado').length,
      all: offboardings.length,
    }),
    [offboardings],
  );

  const visibleList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return offboardings.filter((o) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'pending' && o.status === 'En proceso') ||
        (tab === 'completed' && o.status === 'Completado');
      const matchesSearch =
        !q ||
        o.userName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.rut.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [offboardings, tab, searchQuery]);

  const handleSingleRevoke = async (offboardingId: string, platformId: string) => {
    const key = `${offboardingId}:${platformId}`;
    setBusyPlatform(key);
    try {
      await onRevokePlatform(offboardingId, platformId);
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#141413]">Bajas y desvinculaciones</h2>
          <p className="text-xs text-[#5E5D57] mt-0.5">
            Consolida desvinculaciones desde RRHH y revoca accesos pendientes en cada plataforma integrada.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={onStartOffboarding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#B93535] text-white hover:bg-[#9B2A2A] whitespace-nowrap shrink-0"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>Registrar baja</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1F1E1D]/15">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'pending'
              ? 'border-[#185FA5] text-[#185FA5]'
              : 'border-transparent text-[#5E5D57] hover:text-[#141413]'
          }`}
        >
          Pendientes ({counts.pending})
        </button>
        <button
          type="button"
          onClick={() => setTab('completed')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'completed'
              ? 'border-[#185FA5] text-[#185FA5]'
              : 'border-transparent text-[#5E5D57] hover:text-[#141413]'
          }`}
        >
          Completadas ({counts.completed})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'all'
              ? 'border-[#185FA5] text-[#185FA5]'
              : 'border-transparent text-[#5E5D57] hover:text-[#141413]'
          }`}
        >
          Todas ({counts.all})
        </button>
      </div>

      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
        {visibleList.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5E5D57]">
            No hay registros de desvinculación en esta vista.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F5F4ED] border-b border-[#1F1E1D]/10 text-[11px] font-semibold text-[#5E5D57]">
                  <th className="py-2.5 px-4">Usuario / Email</th>
                  <th className="py-2.5 px-4">Fecha baja</th>
                  <th className="py-2.5 px-4">Motivo</th>
                  <th className="py-2.5 px-4">Accesos por revocar</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1E1D]/10">
                {visibleList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#141413]">{rec.userName}</div>
                      <div className="text-[11px] text-[#73726C]">
                        {rec.email} · <span className="font-mono-tabular">{rec.rut}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-tabular text-[#3D3D3A] tabular-nums">
                      {rec.offboardDate}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#3D3D3A]">{rec.reason}</td>
                    <td className="py-3 px-4">
                      {rec.pendingPlatforms.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2E6B1E]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Todos revocados ({rec.revokedPlatforms.length})</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {rec.pendingPlatforms.map((pid) => {
                            const isBusy = busyPlatform === `${rec.id}:${pid}`;
                            return canWrite ? (
                              <button
                                key={pid}
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleSingleRevoke(rec.id, pid)}
                                title={`Revocar acceso en ${pid}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#F7D6D6] text-[11px] font-medium transition-colors whitespace-nowrap"
                              >
                                <span>{pid}</span>
                                <X className="w-3 h-3" />
                              </button>
                            ) : (
                              <span
                                key={pid}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-[#FCEBEB] text-[#A32D2D] text-[11px] font-medium whitespace-nowrap"
                              >
                                {pid}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {rec.status === 'En proceso' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#993C1D]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>En proceso</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E6B1E]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completado</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {rec.status === 'En proceso' ? (
                        canWrite ? (
                          <button
                            type="button"
                            onClick={() => onRequestRevokeAll(rec)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#B93535] text-white hover:bg-[#9B2A2A] whitespace-nowrap"
                          >
                            Revocar todos
                          </button>
                        ) : (
                          <span className="text-xs text-[#73726C]">Solo lectura</span>
                        )
                      ) : (
                        <span className="text-xs text-[#73726C]">Finalizado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
