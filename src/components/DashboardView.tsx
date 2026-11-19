import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import type { AuditEvent, Inconsistency, OffboardingRecord, Platform, User } from '../types';
import { formatRelativeTime } from '../utils/formatters';

interface DashboardViewProps {
  users: User[];
  platforms: Platform[];
  offboardings: OffboardingRecord[];
  inconsistencies: Inconsistency[];
  auditLogs: AuditEvent[];
  onInspectUser: (userId: string) => void;
  onNavigate: (page: 'usuarios' | 'bajas' | 'plataformas' | 'validacion') => void;
}

function renderAuditIcon(action: AuditEvent['action']) {
  switch (action) {
    case 'user_created':
    case 'access_granted':
      return <UserPlus className="w-4 h-4 text-[#2E6B1E] shrink-0 mt-0.5" />;
    case 'access_revoked':
    case 'offboarding_started':
    case 'offboarding_completed':
      return <UserMinus className="w-4 h-4 text-[#B93535] shrink-0 mt-0.5" />;
    case 'inconsistency_alert':
      return <AlertTriangle className="w-4 h-4 text-[#BA7517] shrink-0 mt-0.5" />;
    case 'platform_synced':
    case 'consolidation':
      return <RefreshCw className="w-4 h-4 text-[#378ADD] shrink-0 mt-0.5" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-[#6B6A64] shrink-0 mt-0.5" />;
  }
}

export function DashboardView({
  users,
  platforms,
  offboardings,
  inconsistencies,
  auditLogs,
  onInspectUser,
  onNavigate,
}: DashboardViewProps) {
  const activeUsersCount = users.filter((u) => u.status === 'Activo').length;
  const pendingOffboardingsCount = offboardings.filter((o) => o.status === 'En proceso').length;
  const operationalPlatformsCount = platforms.filter((p) => p.status === 'Operativo').length;

  const platformCounts = platforms.map((p) => ({
    platform: p,
    count: users.filter((u) => u.accounts.some((a) => a.platformId === p.id)).length,
  }));
  const maxPlatformCount = Math.max(1, ...platformCounts.map((x) => x.count));

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('usuarios')}
          className="text-left bg-[#F3F2EC] hover:bg-[#ECEAE1] transition-colors rounded-lg p-4 border border-[#1F1E1D]/10"
        >
          <div className="text-xs text-[#5E5D57] mb-1">Usuarios activos</div>
          <div className="text-2xl font-semibold text-[#185FA5] tabular-nums">{activeUsersCount}</div>
          <div className="text-[11px] text-[#73726C] mt-1 tabular-nums">
            De {users.length} identidades consolidadas
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('bajas')}
          className="text-left bg-[#F3F2EC] hover:bg-[#ECEAE1] transition-colors rounded-lg p-4 border border-[#1F1E1D]/10"
        >
          <div className="text-xs text-[#5E5D57] mb-1">Desvinculaciones</div>
          <div className="text-2xl font-semibold text-[#B93535] tabular-nums">{offboardings.length}</div>
          <div className="text-[11px] text-[#73726C] mt-1 tabular-nums">
            {pendingOffboardingsCount} con accesos por revocar
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('plataformas')}
          className="text-left bg-[#F3F2EC] hover:bg-[#ECEAE1] transition-colors rounded-lg p-4 border border-[#1F1E1D]/10"
        >
          <div className="text-xs text-[#5E5D57] mb-1">Plataformas integradas</div>
          <div className="text-2xl font-semibold text-[#2E6B1E] tabular-nums">{platforms.length}</div>
          <div className="text-[11px] text-[#73726C] mt-1 tabular-nums">
            {operationalPlatformsCount} operativas · {platforms.length - operationalPlatformsCount} en mantención
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('validacion')}
          className="text-left bg-[#F3F2EC] hover:bg-[#ECEAE1] transition-colors rounded-lg p-4 border border-[#1F1E1D]/10"
        >
          <div className="text-xs text-[#5E5D57] mb-1">Inconsistencias</div>
          <div className="text-2xl font-semibold text-[#BA7517] tabular-nums">{inconsistencies.length}</div>
          <div className="text-[11px] text-[#73726C] mt-1">Requieren validación TI</div>
        </button>
      </div>

      {/* 2-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#141413]">Usuarios por plataforma</h2>
            <button
              type="button"
              onClick={() => onNavigate('validacion')}
              className="text-xs font-medium text-[#185FA5] hover:underline whitespace-nowrap shrink-0"
            >
              Ver matriz completa
            </button>
          </div>
          <div className="space-y-3 flex-1">
            {platformCounts.map(({ platform, count }) => {
              const pct = Math.round((count / maxPlatformCount) * 100);
              return (
                <div key={platform.id} className="flex items-center gap-3">
                  <span className="text-xs text-[#5E5D57] w-28 truncate" title={platform.name}>
                    {platform.name}
                  </span>
                  <div className="flex-1 h-2 bg-[#F3F2EC] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: platform.colorHex }}
                    />
                  </div>
                  <span className="text-xs font-mono-tabular text-[#3D3D3A] w-9 text-right tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#141413]">Actividad reciente</h2>
            <span className="text-xs text-[#73726C]">Últimos eventos</span>
          </div>
          <div className="space-y-3 flex-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5">
                {renderAuditIcon(log.action)}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-[#141413] leading-snug">{log.text}</div>
                  <div className="text-[11px] text-[#73726C] mt-0.5">
                    <span>{log.actor}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatRelativeTime(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inconsistencies Table */}
      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1E1D]/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#BA7517]" />
            <h2 className="text-[15px] font-semibold text-[#141413]">Usuarios con inconsistencias</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('usuarios')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413] whitespace-nowrap shrink-0"
          >
            Ver directorio
          </button>
        </div>

        {inconsistencies.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5E5D57]">
            No se detectan inconsistencias de acceso entre plataformas y directorio maestro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F5F4ED] border-b border-[#1F1E1D]/10 text-[11px] font-semibold text-[#5E5D57]">
                  <th className="py-2.5 px-4">Usuario</th>
                  <th className="py-2.5 px-4">Problema detectado</th>
                  <th className="py-2.5 px-4">Plataformas</th>
                  <th className="py-2.5 px-4">Prioridad</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1E1D]/10">
                {inconsistencies.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#141413]">{inc.userName}</div>
                      <div className="text-[11px] font-mono-tabular text-[#73726C]">{inc.rut}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#3D3D3A]">{inc.issue}</td>
                    <td className="py-3 px-4 text-xs text-[#5E5D57]">
                      {inc.platforms.length > 0 ? inc.platforms.join(' · ') : 'Ninguna'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          inc.priority === 'Alta' ? 'text-[#A32D2D]' : 'text-[#854F0B]'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{inc.priority}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectUser(inc.userId)}
                        className="px-3 py-1 text-xs font-medium rounded-md border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413] whitespace-nowrap"
                      >
                        Validar
                      </button>
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
