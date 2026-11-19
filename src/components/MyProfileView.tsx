import { AlertTriangle, CheckCircle2, MinusCircle, ShieldCheck } from 'lucide-react';
import type { OffboardingRecord, Platform, User } from '../types';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../utils/rbac';
import { PlatformBadge, UserStatusLabel } from './StatusLabel';

interface MyProfileViewProps {
  user: User;
  platforms: Platform[];
  offboarding?: OffboardingRecord;
}

export function MyProfileView({ user, platforms, offboarding }: MyProfileViewProps) {
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-[16px] font-semibold text-[#141413]">Mi ficha y accesos corporativos</h2>
        <p className="text-xs text-[#5E5D57] mt-0.5">
          Consulta tu identidad consolidada y verifica en qué plataformas empresariales cuentas con acceso activo.
        </p>
      </div>

      {offboarding && offboarding.status === 'En proceso' && (
        <div className="p-4 rounded-xl bg-[#FAEEDA] border border-[#BA7517]/30 flex items-start gap-3 text-xs text-[#633806]">
          <AlertTriangle className="w-4 h-4 text-[#BA7517] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Proceso de desvinculación en curso</div>
            <div className="mt-0.5">
              Fecha registrada: <span className="font-mono-tabular">{offboarding.offboardDate}</span> · Motivo:{' '}
              {offboarding.reason}. Los accesos pendientes serán revocados por TI.
            </div>
          </div>
        </div>
      )}

      {/* Identity Summary */}
      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1F1E1D]/10">
          <div>
            <div className="text-base font-semibold text-[#141413]">{user.name}</div>
            <div className="text-xs text-[#5E5D57] mt-0.5">
              {user.email} · <span className="font-mono-tabular">{user.rut}</span>
            </div>
          </div>
          <UserStatusLabel status={user.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[#73726C]">Departamento y cargo</div>
            <div className="font-medium text-[#141413] mt-0.5">
              {user.dept} · {user.position}
            </div>
          </div>
          <div>
            <div className="text-[#73726C]">Rol en portal UserSync</div>
            <div className="font-medium text-[#185FA5] mt-0.5 inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{ROLE_LABELS[user.portalRole]}</span>
            </div>
            <div className="text-[11px] text-[#73726C] mt-0.5">
              {ROLE_DESCRIPTIONS[user.portalRole]}
            </div>
          </div>
          <div>
            <div className="text-[#73726C]">Cuentas activas</div>
            <div className="font-semibold text-base font-mono-tabular text-[#141413] mt-0.5 tabular-nums">
              {user.accounts.length} de {platforms.length} plataformas
            </div>
          </div>
        </div>
      </div>

      {/* Platform Accounts List */}
      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1E1D]/10 bg-[#F5F4ED]">
          <h3 className="text-sm font-semibold text-[#141413]">Estado de cuentas por plataforma</h3>
        </div>
        <div className="divide-y divide-[#1F1E1D]/10">
          {platforms.map((pl) => {
            const acc = user.accounts.find((a) => a.platformId === pl.id);
            return (
              <div
                key={pl.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformBadge platform={pl} size="md" dimmed={!acc} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#141413]">{pl.name}</div>
                    <div className="text-xs text-[#73726C]">
                      {pl.type} ·{' '}
                      {acc ? (
                        <span className="font-mono-tabular text-[#3D3D3A]">
                          {acc.username} ({acc.role})
                        </span>
                      ) : (
                        'Sin cuenta asignada'
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {acc ? (
                    acc.status === 'Pendiente revocar' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#993C1D]">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Pendiente de revocación</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E6B1E]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cuenta activa</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#73726C]">
                      <MinusCircle className="w-4 h-4" />
                      <span>Sin acceso</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
