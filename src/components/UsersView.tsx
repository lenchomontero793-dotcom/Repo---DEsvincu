import { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Inconsistency, Platform, User } from '../types';
import { PlatformBadge, UserStatusLabel } from './StatusLabel';
import { ROLE_LABELS } from '../utils/rbac';

interface UsersViewProps {
  users: User[];
  platforms: Platform[];
  inconsistencies: Inconsistency[];
  searchQuery: string;
  canWrite: boolean;
  onInspectUser: (userId: string) => void;
  onNewUser: () => void;
}

export function UsersView({
  users,
  platforms,
  inconsistencies,
  searchQuery,
  canWrite,
  onInspectUser,
  onNewUser,
}: UsersViewProps) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [onlyInconsistent, setOnlyInconsistent] = useState(false);

  const inconsistentUserIds = useMemo(
    () => new Set(inconsistencies.map((i) => i.userId)),
    [inconsistencies],
  );

  const departments = useMemo(
    () => Array.from(new Set(users.map((u) => u.dept))).sort(),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rut.toLowerCase().includes(q) ||
        u.dept.toLowerCase().includes(q);
      const matchesStatus = !filterStatus || u.status === filterStatus;
      const matchesDept = !filterDept || u.dept === filterDept;
      const matchesPlatform =
        !filterPlatform || u.accounts.some((a) => a.platformId === filterPlatform);
      const matchesInc = !onlyInconsistent || inconsistentUserIds.has(u.id);
      return matchesQuery && matchesStatus && matchesDept && matchesPlatform && matchesInc;
    });
  }, [users, searchQuery, filterStatus, filterDept, filterPlatform, onlyInconsistent, inconsistentUserIds]);

  const resetFilters = () => {
    setFilterStatus('');
    setFilterDept('');
    setFilterPlatform('');
    setOnlyInconsistent(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#141413]">Directorio consolidado de usuarios</h2>
          <p className="text-xs text-[#5E5D57] mt-0.5 tabular-nums">
            Mostrando {filteredUsers.length} de {users.length} identidades empresariales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-md border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso de baja">En proceso de baja</option>
          </select>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs px-3 py-2 rounded-md border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          >
            <option value="">Todos los departamentos</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-xs px-3 py-2 rounded-md border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          >
            <option value="">Todas las plataformas</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyInconsistent((prev) => !prev)}
            className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              onlyInconsistent
                ? 'bg-[#FAEEDA] border-[#BA7517] text-[#633806]'
                : 'bg-white border-[#1F1E1D]/20 text-[#3D3D3A] hover:bg-[#F3F2EC]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solo inconsistencias</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[#5E5D57]">
              No hay usuarios que coincidan con los filtros seleccionados.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#1F1E1D]/20 hover:bg-[#F3F2EC]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={onNewUser}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#185FA5] text-white hover:bg-[#144D87]"
                >
                  Crear usuario
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F5F4ED] border-b border-[#1F1E1D]/10 text-[11px] font-semibold text-[#5E5D57]">
                  <th className="py-2.5 px-4">Nombre / RUT</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Depto.</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4">Plataformas</th>
                  <th className="py-2.5 px-4">Último acceso</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1E1D]/10">
                {filteredUsers.map((user) => {
                  const hasInconsistency = inconsistentUserIds.has(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#141413]">{user.name}</span>
                          {hasInconsistency && (
                            <span title="Usuario con inconsistencia de acceso">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#BA7517] shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#73726C]">
                          {user.rut} · {user.position}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#5E5D57]">{user.email}</td>
                      <td className="py-2.5 px-4 text-xs text-[#3D3D3A]">
                        <div>{user.dept}</div>
                        <div className="text-[10px] text-[#73726C]">
                          {ROLE_LABELS[user.portalRole] ?? 'Colaborador'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <UserStatusLabel status={user.status} />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {user.accounts.length === 0 ? (
                            <span className="text-xs text-[#73726C]">Sin accesos</span>
                          ) : (
                            user.accounts.map((acc) => {
                              const pl = platforms.find((p) => p.id === acc.platformId);
                              if (!pl) return null;
                              return (
                                <PlatformBadge
                                  key={acc.platformId}
                                  platform={pl}
                                  dimmed={acc.status === 'Pendiente revocar'}
                                />
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#5E5D57] tabular-nums">
                        {user.lastAccess}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectUser(user.id)}
                          className="px-3 py-1 text-xs font-medium rounded-md border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413] whitespace-nowrap"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
