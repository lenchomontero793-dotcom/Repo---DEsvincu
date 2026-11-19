import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Edit3,
  Printer,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  AuditEvent,
  Inconsistency,
  OffboardingRecord,
  Platform,
  PlatformStatus,
  PlatformType,
  PortalRole,
  User,
  UserStatus,
} from '../types';
import { downloadCsv } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/rbac';
import { buildReportData, type ReportType } from './ReportsView';
import { PlatformBadge, UserStatusLabel } from './StatusLabel';

function ModalShell({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white border border-[#1F1E1D]/15 rounded-xl w-full ${
          wide ? 'max-w-4xl' : 'max-w-xl'
        } max-h-[88vh] flex flex-col overflow-hidden shadow-lg`}
      >
        <div className="px-5 py-3.5 border-b border-[#1F1E1D]/10 flex items-center justify-between gap-4 bg-[#FAF9F5]">
          <h2 className="text-[15px] font-semibold text-[#141413] truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 rounded-md border border-[#1F1E1D]/15 hover:bg-[#ECEAE1] text-[#3D3D3A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* 1. USER DETAIL & PLATFORM ACCOUNT VALIDATION MODAL */
export function UserDetailModal({
  user,
  platforms,
  canWrite,
  canAssignAdminRole,
  onClose,
  onTogglePlatform,
  onUpdateUser,
  onStartOffboarding,
}: {
  user: User;
  platforms: Platform[];
  canWrite: boolean;
  canAssignAdminRole: boolean;
  onClose: () => void;
  onTogglePlatform: (userId: string, platformId: string, enable: boolean) => Promise<void>;
  onUpdateUser: (userId: string, patch: Partial<User>) => Promise<void>;
  onStartOffboarding: (user: User) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [rut, setRut] = useState(user.rut);
  const [dept, setDept] = useState(user.dept);
  const [position, setPosition] = useState(user.position);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [portalRole, setPortalRole] = useState<PortalRole>(user.portalRole);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setRut(user.rut);
    setDept(user.dept);
    setPosition(user.position);
    setStatus(user.status);
    setPortalRole(user.portalRole);
  }, [user]);

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateUser(user.id, {
        name,
        email,
        rut,
        dept,
        position,
        status,
        ...(canAssignAdminRole ? { portalRole } : {}),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (platformId: string, enable: boolean) => {
    setBusyPlatform(platformId);
    try {
      await onTogglePlatform(user.id, platformId, enable);
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <ModalShell title={`Validación de usuario · ${user.name}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-[#1F1E1D]/10">
          <div className="w-12 h-12 rounded-full bg-[#E6F1FB] text-[#0C447C] font-semibold text-base flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-[#141413]">{user.name}</div>
            <div className="text-xs text-[#5E5D57]">
              {user.email} · <span className="font-mono-tabular">{user.rut}</span>
            </div>
          </div>
          <UserStatusLabel status={user.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left: Info or Edit Form */}
          <div className="border border-[#1F1E1D]/15 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#5E5D57]">Ficha consolidada</h3>
              {canWrite && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#185FA5] hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar ficha</span>
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">Nombre</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">RUT / ID</label>
                    <input
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular rounded border border-[#1F1E1D]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">Estado</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as UserStatus)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20 bg-white"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso de baja">En proceso de baja</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">Departamento</label>
                    <select
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20 bg-white"
                    >
                      <option value="TI">TI</option>
                      <option value="RRHH">RRHH</option>
                      <option value="Finanzas">Finanzas</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Operaciones">Operaciones</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">Cargo</label>
                    <input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20"
                    />
                  </div>
                </div>
                {canAssignAdminRole && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#5E5D57] mb-1">
                      Rol de acceso en portal UserSync
                    </label>
                    <select
                      value={portalRole}
                      onChange={(e) => setPortalRole(e.target.value as PortalRole)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#1F1E1D]/20 bg-white"
                    >
                      <option value="IT_ADMIN">Administrador TI</option>
                      <option value="RRHH_MANAGER">Gestor RRHH</option>
                      <option value="AUDITOR">Auditor / Seguridad</option>
                      <option value="USER">Colaborador</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs rounded border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-[#185FA5] text-white hover:bg-[#144D87]"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Departamento</span>
                  <span className="font-medium text-[#141413]">{user.dept}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Cargo</span>
                  <span className="font-medium text-[#141413]">{user.position}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Rol en portal</span>
                  <span className="font-medium text-[#185FA5]">
                    {ROLE_LABELS[user.portalRole] ?? 'Colaborador'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Origen maestro</span>
                  <span className="font-medium text-[#141413]">{user.sourceMaster}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Último acceso</span>
                  <span className="font-mono-tabular text-xs text-[#141413]">{user.lastAccess}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5E5D57]">Cuentas vinculadas</span>
                  <span className="font-mono-tabular font-semibold text-[#141413]">
                    {user.accounts.length} de {platforms.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Per-platform Account Validation */}
          <div className="border border-[#1F1E1D]/15 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-[#5E5D57]">
              Validación de cuentas por plataforma
            </h3>
            <div className="space-y-2">
              {platforms.map((pl) => {
                const acc = user.accounts.find((a) => a.platformId === pl.id);
                const isBusy = busyPlatform === pl.id;
                const isPendingRevoke = acc?.status === 'Pendiente revocar';

                return (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FAF9F5] border border-[#1F1E1D]/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlatformBadge platform={pl} dimmed={!acc} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#141413] truncate">{pl.name}</div>
                        <div className="text-[11px] font-mono-tabular text-[#73726C] truncate">
                          {acc ? `${acc.username} · ${acc.role}` : 'Sin cuenta registrada'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {acc ? (
                        <>
                          <span
                            className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                              isPendingRevoke ? 'text-[#993C1D]' : 'text-[#2E6B1E]'
                            }`}
                          >
                            {isPendingRevoke ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>{acc.status}</span>
                          </span>
                          {canWrite && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggle(pl.id, false)}
                              className="px-2 py-1 text-[11px] font-medium rounded border border-[#A32D2D]/30 text-[#A32D2D] hover:bg-[#FCEBEB]"
                            >
                              Revocar
                            </button>
                          )}
                        </>
                      ) : canWrite ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggle(pl.id, true)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-[#185FA5]/30 text-[#185FA5] hover:bg-[#E6F1FB]"
                        >
                          Habilitar
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#73726C]">Sin acceso</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1F1E1D]/10">
          {canWrite && user.status !== 'En proceso de baja' && user.status !== 'Inactivo' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartOffboarding(user);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#B93535] text-white hover:bg-[#9B2A2A]"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Iniciar proceso de baja</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* 2. NEW USER MODAL */
export function NewUserModal({
  platforms,
  canAssignAdminRole,
  onClose,
  onCreate,
}: {
  platforms: Platform[];
  canAssignAdminRole: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    email: string;
    rut: string;
    dept: string;
    position: string;
    portalRole: PortalRole;
    password?: string;
    platformIds: string[];
  }) => Promise<boolean>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState('TI');
  const [position, setPosition] = useState('');
  const [portalRole, setPortalRole] = useState<PortalRole>('USER');
  const [password, setPassword] = useState('UserSync2026!');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Office 365', 'HCM']);
  const [saving, setSaving] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName || !email.trim()) return;
    setSaving(true);
    try {
      const ok = await onCreate({
        name: fullName,
        email: email.trim(),
        rut: rut.trim(),
        dept,
        position: position.trim() || 'Colaborador',
        portalRole,
        password: password.trim() || undefined,
        platformIds: selectedPlatforms,
      });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Nuevo usuario corporativo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Nombre *</label>
            <input
              required
              placeholder="Ej: Ana"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Apellido *</label>
            <input
              required
              placeholder="Ej: García López"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">
              Email corporativo *
            </label>
            <input
              required
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">RUT / ID</label>
            <input
              placeholder="Ej: 18.420.115-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Departamento</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white outline-none focus:border-[#378ADD]"
            >
              <option value="TI">TI</option>
              <option value="RRHH">RRHH</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Ventas">Ventas</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Cargo</label>
            <input
              placeholder="Ej: Analista de Sistemas"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">
              Rol en portal UserSync
            </label>
            <select
              value={portalRole}
              onChange={(e) => setPortalRole(e.target.value as PortalRole)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white outline-none focus:border-[#378ADD]"
            >
              <option value="USER">Colaborador</option>
              <option value="AUDITOR">Auditor / Seguridad</option>
              <option value="RRHH_MANAGER">Gestor RRHH</option>
              {canAssignAdminRole && <option value="IT_ADMIN">Administrador TI</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">
              Contraseña inicial de acceso
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5E5D57] mb-2">
            Plataformas a aprovisionar ({selectedPlatforms.length} seleccionadas)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {platforms.map((pl) => {
              const selected = selectedPlatforms.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => togglePlatform(pl.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs text-left transition-colors ${
                    selected
                      ? 'border-[#185FA5] bg-[#E6F1FB] text-[#0C447C] font-medium'
                      : 'border-[#1F1E1D]/15 bg-[#FAF9F5] text-[#3D3D3A] hover:bg-[#F3F2EC]'
                  }`}
                >
                  <PlatformBadge platform={pl} />
                  <span className="truncate">{pl.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#1F1E1D]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{saving ? 'Creando...' : 'Crear usuario'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 3. NEW OFFBOARDING MODAL */
export function NewOffboardingModal({
  users,
  preselectedUser,
  onClose,
  onSubmit,
}: {
  users: User[];
  preselectedUser?: User | null;
  onClose: () => void;
  onSubmit: (userId: string, reason: string, offboardDate: string) => Promise<boolean>;
}) {
  const candidates = users.filter(
    (u) => u.status !== 'En proceso de baja' && u.status !== 'Inactivo',
  );
  const [userId, setUserId] = useState(preselectedUser?.id || candidates[0]?.id || '');
  const [reason, setReason] = useState('Renuncia voluntaria');
  const [offboardDate, setOffboardDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const selectedUser = users.find((u) => u.id === userId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const ok = await onSubmit(userId, reason, offboardDate);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Registrar baja / desvinculación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#5E5D57] mb-1">Colaborador *</label>
          <select
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white outline-none focus:border-[#378ADD]"
          >
            {candidates.length === 0 && <option value="">No hay usuarios activos disponibles</option>}
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) — {u.accounts.length} cuentas
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Fecha de baja</label>
            <input
              type="date"
              required
              value={offboardDate}
              onChange={(e) => setOffboardDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white outline-none focus:border-[#378ADD]"
            >
              <option value="Renuncia voluntaria">Renuncia voluntaria</option>
              <option value="Término de contrato">Término de contrato</option>
              <option value="Despido">Despido</option>
              <option value="Jubilación">Jubilación</option>
              <option value="Cambio de entidad">Cambio de entidad</option>
            </select>
          </div>
        </div>

        {selectedUser && (
          <div className="p-3 rounded-lg bg-[#FAEEDA] border border-[#BA7517]/30 text-xs text-[#633806] space-y-1">
            <div className="font-semibold">Accesos detectados para revocar:</div>
            <div>
              {selectedUser.accounts.length > 0
                ? selectedUser.accounts.map((a) => a.platformId).join(', ')
                : 'Ninguna cuenta activa registrada.'}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-[#1F1E1D]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !userId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#B93535] text-white hover:bg-[#9B2A2A] disabled:opacity-50"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>{saving ? 'Procesando...' : 'Confirmar inicio de baja'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 4. PLATFORM CREATE / CONFIGURE MODAL */
export function PlatformModal({
  platform,
  onClose,
  onSave,
}: {
  platform?: Platform | null;
  onClose: () => void;
  onSave: (payload: Partial<Platform>, isEdit: boolean) => Promise<boolean>;
}) {
  const isEdit = Boolean(platform);
  const [name, setName] = useState(platform?.name || '');
  const [abbr, setAbbr] = useState(platform?.abbr || '');
  const [type, setType] = useState<PlatformType>(platform?.type || 'Propia');
  const [colorHex, setColorHex] = useState(platform?.colorHex || '#2563EB');
  const [status, setStatus] = useState<PlatformStatus>(platform?.status || 'Operativo');
  const [syncMode, setSyncMode] = useState<Platform['syncMode']>(platform?.syncMode || 'Automática');
  const [endpoint, setEndpoint] = useState(platform?.endpoint || '');
  const [requiredForActive, setRequiredForActive] = useState(
    platform?.requiredForActive || false,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ok = await onSave(
        {
          id: platform?.id || name.trim(),
          name: name.trim(),
          abbr: abbr.trim() || name.trim().slice(0, 2).toUpperCase(),
          type,
          colorHex,
          status,
          syncMode,
          endpoint: endpoint.trim(),
          requiredForActive,
        },
        isEdit,
      );
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? `Configurar ${platform?.name}` : 'Nueva integración de plataforma'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">
              Nombre de la plataforma *
            </label>
            <input
              required
              placeholder="Ej: Intranet Logística"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Sigla</label>
            <input
              maxLength={3}
              placeholder="IL"
              value={abbr}
              onChange={(e) => setAbbr(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Categoría</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PlatformType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white"
            >
              <option value="ERP">ERP</option>
              <option value="CRM">CRM</option>
              <option value="Productividad">Productividad</option>
              <option value="RRHH">RRHH</option>
              <option value="Propia">Plataforma propia</option>
              <option value="Web">Web</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Sincronización</label>
            <select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as Platform['syncMode'])}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white"
            >
              <option value="Automática">Automática</option>
              <option value="Webhook">Webhook</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlatformStatus)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white"
            >
              <option value="Operativo">Operativo</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Desconectado">Desconectado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 items-end">
          <div className="col-span-3">
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">
              Endpoint API / Conector
            </label>
            <input
              placeholder="https://api.plataforma.empresa.local/users"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5E5D57] mb-1">Color</label>
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#1F1E1D]/20 cursor-pointer p-1 bg-white"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#3D3D3A] cursor-pointer">
          <input
            type="checkbox"
            checked={requiredForActive}
            onChange={(e) => setRequiredForActive(e.target.checked)}
          />
          <span>Plataforma obligatoria para todos los empleados activos (genera alerta si falta)</span>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#1F1E1D]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Integrar plataforma'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 5. REPORT PREVIEW MODAL */
export function ReportPreviewModal({
  reportType,
  users,
  platforms,
  offboardings,
  inconsistencies,
  auditLogs,
  onClose,
}: {
  reportType: ReportType;
  users: User[];
  platforms: Platform[];
  offboardings: OffboardingRecord[];
  inconsistencies: Inconsistency[];
  auditLogs: AuditEvent[];
  onClose: () => void;
}) {
  const built = buildReportData(reportType, {
    users,
    platforms,
    offboardings,
    inconsistencies,
    auditLogs,
  });

  return (
    <ModalShell title={built.title} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#5E5D57] tabular-nums">
            Generado el {new Date().toLocaleDateString('es-CL')} · {built.rows.length} filas
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(built.filename, built.headers, built.rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        <div className="border border-[#1F1E1D]/15 rounded-lg overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F4ED] border-b border-[#1F1E1D]/10 text-[11px] font-semibold text-[#5E5D57]">
                {built.headers.map((h) => (
                  <th key={h} className="py-2 px-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1E1D]/10">
              {built.rows.length === 0 ? (
                <tr>
                  <td colSpan={built.headers.length} className="py-8 text-center text-[#5E5D57]">
                    No existen registros para este reporte.
                  </td>
                </tr>
              ) : (
                built.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF9F5]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-[#141413] align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}

/* 6. CUSTOM CONFIRM MODAL */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${danger ? 'text-[#B93535]' : 'text-[#BA7517]'}`}
          />
          <p className="text-sm text-[#3D3D3A] leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50 ${
              danger ? 'bg-[#B93535] hover:bg-[#9B2A2A]' : 'bg-[#185FA5] hover:bg-[#144D87]'
            }`}
          >
            {busy ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
