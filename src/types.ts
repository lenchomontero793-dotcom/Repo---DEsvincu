export type UserStatus = 'Activo' | 'Inactivo' | 'Pendiente' | 'En proceso de baja';

export type PortalRole = 'IT_ADMIN' | 'RRHH_MANAGER' | 'AUDITOR' | 'USER';

export type PlatformStatus = 'Operativo' | 'Mantenimiento' | 'Desconectado';

export type PlatformType = 'ERP' | 'CRM' | 'Productividad' | 'RRHH' | 'Web' | 'Propia' | 'Otro';

export interface Platform {
  id: string;
  name: string;
  abbr: string;
  colorHex: string;
  type: PlatformType;
  status: PlatformStatus;
  lastSyncAt: string;
  endpoint: string;
  syncMode: 'Automática' | 'Manual' | 'Webhook';
  requiredForActive: boolean;
}

export interface PlatformAccount {
  platformId: string;
  username: string;
  role: string;
  status: 'Activo' | 'Suspendido' | 'Pendiente revocar';
  lastAccess: string;
}

export interface User {
  id: string;
  rut: string;
  name: string;
  email: string;
  dept: string;
  position: string;
  status: UserStatus;
  portalRole: PortalRole;
  accounts: PlatformAccount[];
  lastAccess: string;
  sourceMaster: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  rut: string;
  dept: string;
  position: string;
  status: UserStatus;
  portalRole: PortalRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface OffboardingRecord {
  id: string;
  userId: string;
  userName: string;
  email: string;
  rut: string;
  dept: string;
  offboardDate: string;
  reason: string;
  pendingPlatforms: string[];
  revokedPlatforms: string[];
  status: 'En proceso' | 'Completado';
  completedAt?: string;
}

export interface Inconsistency {
  id: string;
  userId: string;
  userName: string;
  email: string;
  rut: string;
  issue: string;
  platforms: string[];
  priority: 'Alta' | 'Media';
  type: 'BAJA_CON_ACCESO' | 'INACTIVO_CON_ACCESO' | 'FALTA_PLATAFORMA_BASE' | 'SIN_ORIGEN_RRHH';
}

export interface AuditEvent {
  id: string;
  action:
    | 'user_created'
    | 'access_granted'
    | 'access_revoked'
    | 'offboarding_started'
    | 'offboarding_completed'
    | 'platform_synced'
    | 'consolidation'
    | 'inconsistency_alert'
    | 'settings_updated'
    | 'auth_login';
  text: string;
  actor: string;
  timestamp: string;
}

export interface SystemSettings {
  syncFrequency: 'Cada hora' | 'Cada 6 horas' | 'Diaria (02:00 AM)' | 'Manual';
  alertEmail: string;
  graceDays: number;
  authMode: 'LDAP / Active Directory' | 'OAuth 2.0' | 'SAML 2.0';
  adminRoles: string;
  autoFlagOffboarding: boolean;
}

export interface AppStateResponse {
  platforms: Platform[];
  users: User[];
  offboardings: OffboardingRecord[];
  auditLogs: AuditEvent[];
  settings: SystemSettings;
  inconsistencies: Inconsistency[];
}

export interface ConsolidationRowInput {
  rut?: string;
  name: string;
  email: string;
  dept?: string;
  position?: string;
  status?: string;
  username?: string;
  role?: string;
  reason?: string;
  offboardDate?: string;
}

export interface ConsolidationPreviewItem {
  email: string;
  rut: string;
  name: string;
  dept: string;
  position: string;
  incomingStatus: UserStatus;
  action: 'CREAR_USUARIO' | 'VINCULAR_CUENTA' | 'CONSOLIDAR_BAJA' | 'ACTUALIZAR_ESTADO' | 'SIN_CAMBIOS';
  detail: string;
  existingUserId?: string;
  username: string;
  role: string;
  reason?: string;
  offboardDate?: string;
}

export interface ConsolidationPreviewResponse {
  platformId: string;
  totalRows: number;
  summary: {
    newUsers: number;
    linkedAccounts: number;
    offboardingsDetected: number;
    statusUpdates: number;
    unchanged: number;
  };
  items: ConsolidationPreviewItem[];
}
