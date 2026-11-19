import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { AccountValidationView } from './components/AccountValidationView';
import { ConsolidationView } from './components/ConsolidationView';
import { DashboardView } from './components/DashboardView';
import { LoginPortal } from './components/LoginPortal';
import {
  ConfirmModal,
  NewOffboardingModal,
  NewUserModal,
  PlatformModal,
  ReportPreviewModal,
  UserDetailModal,
} from './components/Modals';
import { MyProfileView } from './components/MyProfileView';
import { OffboardingView } from './components/OffboardingView';
import { PlatformsView } from './components/PlatformsView';
import { ReportsView, buildReportData, type ReportType } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';
import type {
  AppStateResponse,
  AuthSession,
  ConsolidationPreviewItem,
  ConsolidationPreviewResponse,
  OffboardingRecord,
  Platform,
  PortalRole,
  SystemSettings,
  User,
} from './types';
import { downloadCsv, parseCsvText } from './utils/formatters';
import {
  ROLE_LABELS,
  canManageSystem,
  canManageUsers,
  getAllowedPages,
  getDefaultPage,
  type NavPage,
} from './utils/rbac';

const TOKEN_STORAGE_KEY = 'usersync_session_token';

interface ToastState {
  message: string;
  tone: 'success' | 'error';
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [state, setState] = useState<AppStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<NavPage>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Active modals
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [offboardModalUser, setOffboardModalUser] = useState<User | null | undefined>(undefined);
  const [platformModalState, setPlatformModalState] = useState<{
    open: boolean;
    platform?: Platform | null;
  }>({ open: false });
  const [previewReportType, setPreviewReportType] = useState<ReportType | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSession(null);
    setState(null);
    setInspectUserId(null);
    setShowNewUserModal(false);
    setOffboardModalUser(undefined);
    setPlatformModalState({ open: false });
    setPreviewReportType(null);
    setConfirmState(null);
  }, []);

  // Verify saved token on boot
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setAuthChecking(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          clearSession();
          return;
        }
        const data = (await res.json()) as { user: AuthSession['user'] };
        setSession({ token: savedToken, user: data.user });
        setPage(getDefaultPage(data.user.portalRole));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [clearSession]);

  const fetchState = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/state', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          clearSession();
          return;
        }
        if (!res.ok) throw new Error('Error al cargar la base de datos.');
        const data = (await res.json()) as AppStateResponse;
        setState(data);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error de conexión con el servidor.',
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [clearSession, showToast],
  );

  useEffect(() => {
    if (session?.token) {
      void fetchState(session.token);
    }
  }, [session?.token, fetchState]);

  const handleLoginSuccess = (newSession: AuthSession) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newSession.token);
    setSession(newSession);
    setPage(getDefaultPage(newSession.user.portalRole));
    setSearchQuery('');
    showToast(`Bienvenido, ${newSession.user.name} (${ROLE_LABELS[newSession.user.portalRole]}).`);
  };

  const handleLogout = async () => {
    if (session?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
        });
      } catch {
        // ignore network error on logout
      }
    }
    clearSession();
  };

  const apiMutate = async (
    url: string,
    method: 'POST' | 'PATCH' | 'PUT',
    body?: unknown,
    successMessage?: string,
  ): Promise<boolean> => {
    if (!session?.token) return false;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) {
        clearSession();
        return false;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'No se pudo completar la operación.', 'error');
        return false;
      }
      setState(data as AppStateResponse);
      if (successMessage) showToast(successMessage, 'success');
      return true;
    } catch {
      showToast('Error de red al comunicarse con el servidor.', 'error');
      return false;
    }
  };

  const handleCreateUser = async (payload: {
    name: string;
    email: string;
    rut: string;
    dept: string;
    position: string;
    portalRole: PortalRole;
    password?: string;
    platformIds: string[];
  }) => {
    return apiMutate('/api/users', 'POST', payload, `Usuario ${payload.name} creado y consolidado.`);
  };

  const handleUpdateUser = async (userId: string, patch: Partial<User>) => {
    await apiMutate(`/api/users/${userId}`, 'PATCH', patch, 'Ficha de usuario actualizada.');
  };

  const handleTogglePlatform = async (userId: string, platformId: string, enable: boolean) => {
    await apiMutate(
      `/api/users/${userId}/toggle-platform`,
      'POST',
      { platformId, enable },
      enable ? `Acceso habilitado en ${platformId}.` : `Acceso revocado en ${platformId}.`,
    );
  };

  const handleStartOffboarding = async (userId: string, reason: string, offboardDate: string) => {
    return apiMutate(
      '/api/offboardings',
      'POST',
      { userId, reason, offboardDate },
      'Proceso de baja iniciado. Accesos marcados para revocación.',
    );
  };

  const handleRevokePlatformInOffboarding = async (offboardingId: string, platformId: string) => {
    await apiMutate(
      `/api/offboardings/${offboardingId}/revoke`,
      'POST',
      { platformId },
      `Acceso ${platformId} revocado correctamente.`,
    );
  };

  const handleRequestRevokeAll = (record: OffboardingRecord) => {
    setConfirmState({
      title: 'Confirmar revocación total de accesos',
      message: `¿Confirmas revocar inmediatamente los ${record.pendingPlatforms.length} accesos pendientes (${record.pendingPlatforms.join(', ')}) para ${record.userName}? Esta acción marcará su desvinculación como completada.`,
      confirmLabel: 'Revocar todos los accesos',
      danger: true,
      onConfirm: async () => {
        await apiMutate(
          `/api/offboardings/${record.id}/revoke`,
          'POST',
          { all: true },
          `Todos los accesos de ${record.userName} han sido revocados.`,
        );
      },
    });
  };

  const handleSyncPlatform = async (platformId: string) => {
    await apiMutate(
      `/api/platforms/${platformId}/sync`,
      'POST',
      undefined,
      `Sincronización ${platformId} completada.`,
    );
  };

  const handleSavePlatform = async (payload: Partial<Platform>, isEdit: boolean) => {
    if (isEdit && payload.id) {
      return apiMutate(
        `/api/platforms/${encodeURIComponent(payload.id)}`,
        'PATCH',
        payload,
        `Configuración de ${payload.name} guardada.`,
      );
    }
    return apiMutate(
      '/api/platforms',
      'POST',
      payload,
      `Plataforma ${payload.name} integrada al directorio.`,
    );
  };

  const handlePreviewConsolidation = async (
    platformId: string,
    rawText: string,
  ): Promise<ConsolidationPreviewResponse | null> => {
    if (!session?.token) return null;
    const rows = parseCsvText(rawText);
    try {
      const res = await fetch('/api/consolidate/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ platformId, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error al analizar los registros.', 'error');
        return null;
      }
      return data as ConsolidationPreviewResponse;
    } catch {
      showToast('Error al procesar el cruce de datos.', 'error');
      return null;
    }
  };

  const handleCommitConsolidation = async (platformId: string, items: ConsolidationPreviewItem[]) => {
    await apiMutate(
      '/api/consolidate/commit',
      'POST',
      { platformId, items },
      `Base de datos consolidada desde ${platformId}.`,
    );
  };

  const handleSaveSettings = async (settings: SystemSettings) => {
    await apiMutate('/api/settings', 'PUT', settings, 'Configuración del sistema guardada.');
  };

  const handleRequestReset = () => {
    setConfirmState({
      title: 'Restablecer datos iniciales',
      message:
        'Se restaurará el directorio corporativo, plataformas y bajas al estado inicial de demostración. ¿Deseas continuar?',
      confirmLabel: 'Restablecer datos',
      danger: true,
      onConfirm: async () => {
        await apiMutate('/api/reset', 'POST', undefined, 'Base de datos restablecida.');
      },
    });
  };

  const handleQuickExport = () => {
    if (!state) return;
    const built = buildReportData('inventario', {
      users: state.users,
      platforms: state.platforms,
      offboardings: state.offboardings,
      inconsistencies: state.inconsistencies,
      auditLogs: state.auditLogs,
    });
    downloadCsv(built.filename, built.headers, built.rows);
    showToast(`Inventario exportado (${built.filename}).`);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6">
        <div className="text-sm text-[#5E5D57]">Verificando sesión corporativa...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }

  const role = session.user.portalRole;
  const allowedPages = getAllowedPages(role);
  const canWrite = canManageUsers(role);
  const isAdmin = canManageSystem(role);

  const handleNavClick = (target: NavPage) => {
    if (allowedPages.includes(target)) {
      setPage(target);
    }
    setMobileMenuOpen(false);
  };

  const pendingOffboardings = state?.offboardings.filter((o) => o.status === 'En proceso') ?? [];
  const inspectedUser = state?.users.find((u) => u.id === inspectUserId) ?? null;

  const navGroups: {
    section: string;
    items: { id: NavPage; label: string; icon: typeof LayoutDashboard; count?: number }[];
  }[] = [
    {
      section: 'Principal',
      items: [
        { id: 'mi-perfil', label: 'Mi perfil y accesos', icon: UserCheck },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'usuarios', label: 'Usuarios', icon: Users },
        {
          id: 'bajas',
          label: 'Bajas y desvinc.',
          icon: UserMinus,
          count: pendingOffboardings.length || undefined,
        },
      ],
    },
    {
      section: 'Plataformas',
      items: [
        { id: 'validacion', label: 'Validar cuentas', icon: ShieldCheck },
        { id: 'consolidar', label: 'Consolidar BD', icon: Database },
        { id: 'plataformas', label: 'Plataformas', icon: Plug },
        { id: 'reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
    {
      section: 'Sistema',
      items: [{ id: 'configuracion', label: 'Configuración', icon: Settings }],
    },
  ];

  const renderSidebarContent = () => (
    <>
      <div className="px-4 pb-4 pt-1 border-b border-[#1F1E1D]/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#185FA5] text-white flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[#141413] leading-tight">UserSync</h1>
            <p className="text-[11px] text-[#5E5D57]">Gestión de identidades</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((i) => allowedPages.includes(i.id));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.section} className="mb-2">
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[#73726C] tracking-wider uppercase">
                {group.section}
              </div>
              <div className="px-2 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#E6F1FB] text-[#0C447C] font-semibold'
                          : 'text-[#3D3D3A] hover:bg-[#F3F2EC] hover:text-[#141413]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.count !== undefined && (
                        <span className="text-[11px] font-mono-tabular font-semibold text-[#A32D2D] tabular-nums">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Authenticated User & Role Card */}
      <div className="px-3 pt-3 border-t border-[#1F1E1D]/10 space-y-2.5">
        <div className="px-2">
          <div className="text-xs font-semibold text-[#141413] truncate">{session.user.name}</div>
          <div className="text-[11px] text-[#5E5D57] truncate">{session.user.email}</div>
          <div className="text-[11px] font-medium text-[#185FA5] mt-1">
            {ROLE_LABELS[role]}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#1F1E1D]/15 text-xs font-medium text-[#3D3D3A] hover:bg-[#F3F2EC] hover:text-[#141413] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#FAF9F5] text-[#141413]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] shrink-0 bg-white border-r border-[#1F1E1D]/15 flex-col py-4 no-print">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <aside className="w-[240px] h-full bg-white border-r border-[#1F1E1D]/15 flex flex-col py-4">
            <div className="px-4 pb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded border border-[#1F1E1D]/15"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="bg-white border-b border-[#1F1E1D]/15 px-4 md:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden p-2 rounded-lg border border-[#1F1E1D]/15 text-[#3D3D3A]"
            >
              <Menu className="w-4 h-4" />
            </button>

            {role !== 'USER' ? (
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#73726C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuario, RUT, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-lg border border-[#1F1E1D]/15 bg-[#FAF9F5] text-[#141413] outline-none focus:border-[#378ADD] focus:bg-white transition-colors"
                />
              </div>
            ) : (
              <div className="text-xs font-medium text-[#5E5D57]">
                Portal personal · {session.user.dept} · {session.user.position}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {role === 'AUDITOR' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#5E5D57] mr-2 whitespace-nowrap">
                <Eye className="w-3.5 h-3.5 text-[#185FA5]" />
                <span>Solo lectura</span>
              </span>
            )}
            {role !== 'USER' && (
              <button
                type="button"
                onClick={handleQuickExport}
                disabled={!state}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 bg-white hover:bg-[#F3F2EC] text-[#141413] whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowNewUserModal(true)}
                disabled={!state}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#185FA5] hover:bg-[#144D87] text-white whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo usuario</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Offboarding Alert Banner (Admin / RRHH / Auditor) */}
        {state && role !== 'USER' && pendingOffboardings.length > 0 && (
          <div className="bg-[#FAEEDA] border-b border-[#BA7517]/30 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#633806] no-print">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#BA7517] shrink-0" />
              <span>
                <strong className="tabular-nums">{pendingOffboardings.length}</strong>{' '}
                {pendingOffboardings.length === 1
                  ? 'usuario en proceso de desvinculación pendiente'
                  : 'usuarios en proceso de desvinculación pendientes'}{' '}
                de revocar accesos en plataformas corporativas.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleNavClick('bajas')}
              className="px-3 py-1 text-xs font-medium rounded-md bg-white border border-[#BA7517]/40 hover:bg-[#FAF9F5] text-[#633806] whitespace-nowrap shrink-0"
            >
              Ver ahora
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {loading || !state ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-24 rounded-lg bg-[#ECEAE1] animate-pulse" />
                ))}
              </div>
              <div className="h-64 rounded-xl bg-[#ECEAE1] animate-pulse" />
            </div>
          ) : (
            <>
              {page === 'mi-perfil' && state.users[0] && (
                <MyProfileView
                  user={state.users[0]}
                  platforms={state.platforms}
                  offboarding={state.offboardings[0]}
                />
              )}
              {page === 'dashboard' && allowedPages.includes('dashboard') && (
                <DashboardView
                  users={state.users}
                  platforms={state.platforms}
                  offboardings={state.offboardings}
                  inconsistencies={state.inconsistencies}
                  auditLogs={state.auditLogs}
                  onInspectUser={(uid) => setInspectUserId(uid)}
                  onNavigate={(target) => {
                    if (allowedPages.includes(target)) handleNavClick(target);
                  }}
                />
              )}
              {page === 'usuarios' && allowedPages.includes('usuarios') && (
                <UsersView
                  users={state.users}
                  platforms={state.platforms}
                  inconsistencies={state.inconsistencies}
                  searchQuery={searchQuery}
                  canWrite={canWrite}
                  onInspectUser={(uid) => setInspectUserId(uid)}
                  onNewUser={() => setShowNewUserModal(true)}
                />
              )}
              {page === 'validacion' && allowedPages.includes('validacion') && (
                <AccountValidationView
                  users={state.users}
                  platforms={state.platforms}
                  searchQuery={searchQuery}
                  canWrite={canWrite}
                  onTogglePlatform={handleTogglePlatform}
                  onInspectUser={(uid) => setInspectUserId(uid)}
                />
              )}
              {page === 'consolidar' && allowedPages.includes('consolidar') && (
                <ConsolidationView
                  platforms={state.platforms}
                  onPreview={handlePreviewConsolidation}
                  onCommit={handleCommitConsolidation}
                />
              )}
              {page === 'bajas' && allowedPages.includes('bajas') && (
                <OffboardingView
                  offboardings={state.offboardings}
                  searchQuery={searchQuery}
                  canWrite={canWrite}
                  onRevokePlatform={handleRevokePlatformInOffboarding}
                  onRequestRevokeAll={handleRequestRevokeAll}
                  onStartOffboarding={() => setOffboardModalUser(null)}
                />
              )}
              {page === 'plataformas' && allowedPages.includes('plataformas') && (
                <PlatformsView
                  platforms={state.platforms}
                  users={state.users}
                  onSyncPlatform={handleSyncPlatform}
                  onConfigurePlatform={(pl) => setPlatformModalState({ open: true, platform: pl })}
                  onAddPlatform={() => setPlatformModalState({ open: true, platform: null })}
                />
              )}
              {page === 'reportes' && allowedPages.includes('reportes') && (
                <ReportsView
                  users={state.users}
                  platforms={state.platforms}
                  offboardings={state.offboardings}
                  inconsistencies={state.inconsistencies}
                  auditLogs={state.auditLogs}
                  onPreviewReport={(type) => setPreviewReportType(type)}
                  onNotify={(msg) => showToast(msg)}
                />
              )}
              {page === 'configuracion' && allowedPages.includes('configuracion') && (
                <SettingsView
                  settings={state.settings}
                  onSave={handleSaveSettings}
                  onRequestReset={handleRequestReset}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {state && inspectedUser && (
        <UserDetailModal
          user={inspectedUser}
          platforms={state.platforms}
          canWrite={canWrite}
          canAssignAdminRole={isAdmin}
          onClose={() => setInspectUserId(null)}
          onTogglePlatform={handleTogglePlatform}
          onUpdateUser={handleUpdateUser}
          onStartOffboarding={(u) => setOffboardModalUser(u)}
        />
      )}

      {state && showNewUserModal && canWrite && (
        <NewUserModal
          platforms={state.platforms}
          canAssignAdminRole={isAdmin}
          onClose={() => setShowNewUserModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {state && offboardModalUser !== undefined && canWrite && (
        <NewOffboardingModal
          users={state.users}
          preselectedUser={offboardModalUser}
          onClose={() => setOffboardModalUser(undefined)}
          onSubmit={handleStartOffboarding}
        />
      )}

      {platformModalState.open && isAdmin && (
        <PlatformModal
          platform={platformModalState.platform}
          onClose={() => setPlatformModalState({ open: false })}
          onSave={handleSavePlatform}
        />
      )}

      {state && previewReportType && allowedPages.includes('reportes') && (
        <ReportPreviewModal
          reportType={previewReportType}
          users={state.users}
          platforms={state.platforms}
          offboardings={state.offboardings}
          inconsistencies={state.inconsistencies}
          auditLogs={state.auditLogs}
          onClose={() => setPreviewReportType(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium no-print ${
            toast.tone === 'error'
              ? 'bg-[#FCEBEB] border-[#A32D2D]/30 text-[#A32D2D]'
              : 'bg-[#141413] border-[#141413] text-white'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#7AD7B4] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
