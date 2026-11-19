import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type {
  AppStateResponse,
  AuditEvent,
  AuthUser,
  ConsolidationPreviewItem,
  ConsolidationPreviewResponse,
  ConsolidationRowInput,
  Inconsistency,
  OffboardingRecord,
  Platform,
  PlatformAccount,
  PortalRole,
  SystemSettings,
  User,
  UserStatus,
} from './src/types.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'usersync-db.json');
const DEFAULT_CORP_PASSWORD = 'UserSync2026!';

interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
}

interface DatabaseData {
  platforms: Platform[];
  users: User[];
  offboardings: OffboardingRecord[];
  auditLogs: AuditEvent[];
  settings: SystemSettings;
  credentials: Record<string, string>;
  sessions: StoredSession[];
}

interface AuthenticatedRequest extends Request {
  authUser?: User;
  authToken?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function minutesAgoIso(mins: number): string {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    rut: user.rut,
    dept: user.dept,
    position: user.position,
    status: user.status,
    portalRole: user.portalRole,
  };
}

function buildSeedData(): DatabaseData {
  const platforms: Platform[] = [
    {
      id: 'SAP',
      name: 'SAP S/4HANA',
      abbr: 'S',
      colorHex: '#1E73BE',
      type: 'ERP',
      status: 'Operativo',
      lastSyncAt: minutesAgoIso(2),
      endpoint: 'https://sap-idm.empresa.local/api/v2/users',
      syncMode: 'Automática',
      requiredForActive: false,
    },
    {
      id: 'Salesforce',
      name: 'Salesforce CRM',
      abbr: 'SF',
      colorHex: '#00A1E0',
      type: 'CRM',
      status: 'Operativo',
      lastSyncAt: minutesAgoIso(5),
      endpoint: 'https://empresa.my.salesforce.com/services/data/v59.0',
      syncMode: 'Automática',
      requiredForActive: false,
    },
    {
      id: 'Office 365',
      name: 'Office 365',
      abbr: 'O',
      colorHex: '#D83B01',
      type: 'Productividad',
      status: 'Operativo',
      lastSyncAt: minutesAgoIso(1),
      endpoint: 'https://graph.microsoft.com/v1.0/users',
      syncMode: 'Automática',
      requiredForActive: true,
    },
    {
      id: 'HCM',
      name: 'HCM Propio',
      abbr: 'H',
      colorHex: '#639922',
      type: 'RRHH',
      status: 'Operativo',
      lastSyncAt: minutesAgoIso(8),
      endpoint: 'https://hcm.empresa.local/api/colaboradores',
      syncMode: 'Automática',
      requiredForActive: true,
    },
    {
      id: 'ERP Propio',
      name: 'ERP Propio',
      abbr: 'E',
      colorHex: '#534AB7',
      type: 'Propia',
      status: 'Operativo',
      lastSyncAt: minutesAgoIso(15),
      endpoint: 'https://erp-interno.empresa.local/api/identidades',
      syncMode: 'Webhook',
      requiredForActive: false,
    },
    {
      id: 'Portal',
      name: 'Portal Clientes',
      abbr: 'P',
      colorHex: '#BA7517',
      type: 'Web',
      status: 'Mantenimiento',
      lastSyncAt: minutesAgoIso(120),
      endpoint: 'https://portal.empresa.com/admin/accounts',
      syncMode: 'Manual',
      requiredForActive: false,
    },
  ];

  const users: User[] = [
    {
      id: 'u-1',
      rut: '16.482.190-4',
      name: 'Ana García López',
      email: 'a.garcia@empresa.com',
      dept: 'TI',
      position: 'Arquitecta de Sistemas',
      status: 'Activo',
      portalRole: 'IT_ADMIN',
      lastAccess: 'Hoy 09:14',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(60),
      accounts: [
        { platformId: 'SAP', username: 'AGARCIA', role: 'Basis Admin', status: 'Activo', lastAccess: 'Hoy 09:10' },
        { platformId: 'Office 365', username: 'a.garcia@empresa.com', role: 'Global Admin', status: 'Activo', lastAccess: 'Hoy 09:14' },
        { platformId: 'HCM', username: '16482190', role: 'Empleado', status: 'Activo', lastAccess: 'Ayer 16:00' },
        { platformId: 'ERP Propio', username: 'agarcia', role: 'Supervisor TI', status: 'Activo', lastAccess: 'Hoy 08:40' },
      ],
    },
    {
      id: 'u-16',
      rut: '17.301.884-2',
      name: 'Carolina Díaz Fuentes',
      email: 'c.diaz@empresa.com',
      dept: 'RRHH',
      position: 'Jefa de Gestión de Personas',
      status: 'Activo',
      portalRole: 'RRHH_MANAGER',
      lastAccess: 'Hoy 10:15',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(35),
      accounts: [
        { platformId: 'HCM', username: '17301884', role: 'Admin Nómina', status: 'Activo', lastAccess: 'Hoy 10:15' },
        { platformId: 'Office 365', username: 'c.diaz@empresa.com', role: 'E3 User', status: 'Activo', lastAccess: 'Hoy 10:05' },
        { platformId: 'SAP', username: 'CDIAZ', role: 'HR Manager', status: 'Activo', lastAccess: 'Ayer 18:10' },
      ],
    },
    {
      id: 'u-10',
      rut: '17.655.310-9',
      name: 'Javier Herrera',
      email: 'j.herrera@empresa.com',
      dept: 'TI',
      position: 'CISO / Seguridad TI',
      status: 'Activo',
      portalRole: 'AUDITOR',
      lastAccess: 'Hoy 09:55',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(25),
      accounts: [
        { platformId: 'SAP', username: 'JHERRERA', role: 'Security Auditor', status: 'Activo', lastAccess: 'Hoy 09:55' },
        { platformId: 'Office 365', username: 'j.herrera@empresa.com', role: 'Security Admin', status: 'Activo', lastAccess: 'Hoy 09:50' },
        { platformId: 'HCM', username: '17655310', role: 'Jefatura', status: 'Activo', lastAccess: 'Hoy 08:30' },
        { platformId: 'ERP Propio', username: 'jherrera', role: 'Auditor', status: 'Activo', lastAccess: 'Ayer 16:50' },
        { platformId: 'Salesforce', username: 'j.herrera@empresa.com', role: 'Compliance', status: 'Activo', lastAccess: 'Hace 2 días' },
        { platformId: 'Portal', username: 'j.herrera@empresa.com', role: 'Admin', status: 'Activo', lastAccess: 'Hace 4 días' },
      ],
    },
    {
      id: 'u-2',
      rut: '18.210.445-K',
      name: 'Carlos Mendoza Ríos',
      email: 'c.mendoza@empresa.com',
      dept: 'Ventas',
      position: 'Ejecutivo Comercial Senior',
      status: 'Activo',
      portalRole: 'USER',
      lastAccess: 'Hoy 08:52',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(90),
      accounts: [
        { platformId: 'Salesforce', username: 'c.mendoza@empresa.com', role: 'Account Exec', status: 'Activo', lastAccess: 'Hoy 08:52' },
        { platformId: 'Office 365', username: 'c.mendoza@empresa.com', role: 'E3 User', status: 'Activo', lastAccess: 'Hoy 08:45' },
        { platformId: 'HCM', username: '18210445', role: 'Empleado', status: 'Activo', lastAccess: 'Hace 4 días' },
      ],
    },
    {
      id: 'u-3',
      rut: '15.903.772-1',
      name: 'María Fernández',
      email: 'm.fernandez@empresa.com',
      dept: 'Finanzas',
      position: 'Contralora Corporativa',
      status: 'Activo',
      portalRole: 'AUDITOR',
      lastAccess: 'Ayer 17:30',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(180),
      accounts: [
        { platformId: 'SAP', username: 'MFERNANDEZ', role: 'FI-CO Approver', status: 'Activo', lastAccess: 'Ayer 17:30' },
        { platformId: 'Office 365', username: 'm.fernandez@empresa.com', role: 'E5 User', status: 'Activo', lastAccess: 'Ayer 17:20' },
        { platformId: 'HCM', username: '15903772', role: 'Jefatura', status: 'Activo', lastAccess: 'Hace 2 días' },
        { platformId: 'ERP Propio', username: 'mfernandez', role: 'Contabilidad', status: 'Activo', lastAccess: 'Ayer 15:10' },
        { platformId: 'Portal', username: 'm.fernandez@empresa.com', role: 'Auditor', status: 'Activo', lastAccess: 'Hace 6 días' },
      ],
    },
    {
      id: 'u-4',
      rut: '17.114.508-2',
      name: 'Roberto Silva',
      email: 'r.silva@empresa.com',
      dept: 'RRHH',
      position: 'Especialista de Nómina',
      status: 'En proceso de baja',
      portalRole: 'USER',
      lastAccess: 'Hace 3 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(200),
      accounts: [
        { platformId: 'SAP', username: 'RSILVA', role: 'HR Payroll', status: 'Pendiente revocar', lastAccess: 'Hace 3 días' },
        { platformId: 'Office 365', username: 'r.silva@empresa.com', role: 'E3 User', status: 'Pendiente revocar', lastAccess: 'Hace 3 días' },
        { platformId: 'HCM', username: '17114508', role: 'Analista RRHH', status: 'Suspendido', lastAccess: 'Hace 4 días' },
      ],
    },
    {
      id: 'u-5',
      rut: '19.340.112-8',
      name: 'Claudia Vargas',
      email: 'c.vargas@empresa.com',
      dept: 'Operaciones',
      position: 'Jefa de Logística',
      status: 'Activo',
      portalRole: 'USER',
      lastAccess: 'Hoy 10:01',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(45),
      accounts: [
        { platformId: 'SAP', username: 'CVARGAS', role: 'MM-WM Manager', status: 'Activo', lastAccess: 'Hoy 10:01' },
        { platformId: 'Office 365', username: 'c.vargas@empresa.com', role: 'E3 User', status: 'Activo', lastAccess: 'Hoy 09:50' },
        { platformId: 'HCM', username: '19340112', role: 'Jefatura', status: 'Activo', lastAccess: 'Ayer 11:00' },
        { platformId: 'ERP Propio', username: 'cvargas', role: 'Bodega Central', status: 'Activo', lastAccess: 'Hoy 09:30' },
      ],
    },
    {
      id: 'u-6',
      rut: '14.772.309-6',
      name: 'Pedro Ramos',
      email: 'p.ramos@empresa.com',
      dept: 'TI',
      position: 'Consultor Externo',
      status: 'Inactivo',
      portalRole: 'USER',
      lastAccess: 'Hace 45 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(300),
      accounts: [
        { platformId: 'Office 365', username: 'p.ramos@empresa.com', role: 'F3 User', status: 'Activo', lastAccess: 'Hace 45 días' },
        { platformId: 'HCM', username: '14772309', role: 'Externo', status: 'Activo', lastAccess: 'Hace 50 días' },
      ],
    },
    {
      id: 'u-7',
      rut: '20.115.689-0',
      name: 'Sofía Torres',
      email: 's.torres@empresa.com',
      dept: 'Ventas',
      position: 'Coordinadora de Cuentas',
      status: 'Activo',
      portalRole: 'USER',
      lastAccess: 'Hoy 11:22',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(30),
      accounts: [
        { platformId: 'Salesforce', username: 's.torres@empresa.com', role: 'Sales Ops', status: 'Activo', lastAccess: 'Hoy 11:22' },
        { platformId: 'Office 365', username: 's.torres@empresa.com', role: 'E3 User', status: 'Activo', lastAccess: 'Hoy 11:10' },
        { platformId: 'HCM', username: '20115689', role: 'Empleado', status: 'Activo', lastAccess: 'Hace 3 días' },
        { platformId: 'Portal', username: 's.torres@empresa.com', role: 'Gestor', status: 'Activo', lastAccess: 'Ayer 16:40' },
      ],
    },
    {
      id: 'u-8',
      rut: '21.094.221-7',
      name: 'Diego Morales',
      email: 'd.morales@empresa.com',
      dept: 'Finanzas',
      position: 'Analista Contable',
      status: 'Pendiente',
      portalRole: 'USER',
      lastAccess: 'Nunca',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(240),
      accounts: [
        { platformId: 'HCM', username: '21094221', role: 'Empleado', status: 'Activo', lastAccess: 'Nunca' },
      ],
    },
    {
      id: 'u-9',
      rut: '16.820.991-5',
      name: 'Laura Soto',
      email: 'l.soto@empresa.com',
      dept: 'Operaciones',
      position: 'Gerente de Operaciones',
      status: 'Activo',
      portalRole: 'USER',
      lastAccess: 'Hoy 07:48',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(110),
      accounts: [
        { platformId: 'SAP', username: 'LSOTO', role: 'Director Ops', status: 'Activo', lastAccess: 'Hoy 07:48' },
        { platformId: 'Office 365', username: 'l.soto@empresa.com', role: 'E5 User', status: 'Activo', lastAccess: 'Hoy 07:40' },
        { platformId: 'HCM', username: '16820991', role: 'Gerencia', status: 'Activo', lastAccess: 'Ayer 18:00' },
        { platformId: 'ERP Propio', username: 'lsoto', role: 'Gerencia', status: 'Activo', lastAccess: 'Hoy 07:35' },
        { platformId: 'Salesforce', username: 'l.soto@empresa.com', role: 'Executive View', status: 'Activo', lastAccess: 'Ayer 14:20' },
      ],
    },
    {
      id: 'u-11',
      rut: '18.540.312-1',
      name: 'Ignacio Pérez',
      email: 'i.perez@empresa.com',
      dept: 'Ventas',
      position: 'Ejecutivo Regional',
      status: 'En proceso de baja',
      portalRole: 'USER',
      lastAccess: 'Hace 8 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(120),
      accounts: [
        { platformId: 'Salesforce', username: 'i.perez@empresa.com', role: 'Sales Rep', status: 'Pendiente revocar', lastAccess: 'Hace 8 días' },
        { platformId: 'ERP Propio', username: 'iperez', role: 'Comercial', status: 'Pendiente revocar', lastAccess: 'Hace 9 días' },
      ],
    },
    {
      id: 'u-12',
      rut: '15.221.840-3',
      name: 'Valentina Cruz',
      email: 'v.cruz@empresa.com',
      dept: 'Finanzas',
      position: 'Analista Tesorería',
      status: 'En proceso de baja',
      portalRole: 'USER',
      lastAccess: 'Hace 11 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(360),
      accounts: [
        { platformId: 'SAP', username: 'VCRUZ', role: 'Treasury Analyst', status: 'Pendiente revocar', lastAccess: 'Hace 11 días' },
      ],
    },
    {
      id: 'u-13',
      rut: '19.882.400-K',
      name: 'Felipe Gutiérrez',
      email: 'f.gutierrez@empresa.com',
      dept: 'Operaciones',
      position: 'Analista de Procesos',
      status: 'En proceso de baja',
      portalRole: 'USER',
      lastAccess: 'Hace 2 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(140),
      accounts: [
        { platformId: 'Office 365', username: 'f.gutierrez@empresa.com', role: 'E3 User', status: 'Pendiente revocar', lastAccess: 'Hace 2 días' },
        { platformId: 'Salesforce', username: 'f.gutierrez@empresa.com', role: 'Read Only', status: 'Pendiente revocar', lastAccess: 'Hace 5 días' },
        { platformId: 'SAP', username: 'FGUTIERREZ', role: 'PM User', status: 'Pendiente revocar', lastAccess: 'Hace 3 días' },
      ],
    },
    {
      id: 'u-14',
      rut: '16.109.420-8',
      name: 'Martín Rojas',
      email: 'm.rojas@empresa.com',
      dept: 'Ventas',
      position: 'Consultor Comercial',
      status: 'Inactivo',
      portalRole: 'USER',
      lastAccess: 'Hace 30 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(1440),
      accounts: [],
    },
    {
      id: 'u-15',
      rut: '17.902.118-5',
      name: 'Daniela Muñoz',
      email: 'd.munoz@empresa.com',
      dept: 'Operaciones',
      position: 'Coordinadora de Turno',
      status: 'Inactivo',
      portalRole: 'USER',
      lastAccess: 'Hace 35 días',
      sourceMaster: 'HCM Propio',
      updatedAt: minutesAgoIso(2880),
      accounts: [],
    },
  ];

  const credentials: Record<string, string> = {};
  const sharedHash = hashPassword(DEFAULT_CORP_PASSWORD);
  for (const user of users) {
    credentials[user.id] = sharedHash;
  }

  const offboardings: OffboardingRecord[] = [
    {
      id: 'off-1',
      userId: 'u-4',
      userName: 'Roberto Silva',
      email: 'r.silva@empresa.com',
      rut: '17.114.508-2',
      dept: 'RRHH',
      offboardDate: '2026-11-15',
      reason: 'Renuncia voluntaria',
      pendingPlatforms: ['SAP', 'Office 365'],
      revokedPlatforms: ['HCM'],
      status: 'En proceso',
    },
    {
      id: 'off-2',
      userId: 'u-11',
      userName: 'Ignacio Pérez',
      email: 'i.perez@empresa.com',
      rut: '18.540.312-1',
      dept: 'Ventas',
      offboardDate: '2026-11-12',
      reason: 'Término de contrato',
      pendingPlatforms: ['Salesforce', 'ERP Propio'],
      revokedPlatforms: ['Office 365', 'HCM'],
      status: 'En proceso',
    },
    {
      id: 'off-3',
      userId: 'u-12',
      userName: 'Valentina Cruz',
      email: 'v.cruz@empresa.com',
      rut: '15.221.840-3',
      dept: 'Finanzas',
      offboardDate: '2026-11-10',
      reason: 'Jubilación',
      pendingPlatforms: ['SAP'],
      revokedPlatforms: ['Office 365', 'HCM', 'ERP Propio'],
      status: 'En proceso',
    },
    {
      id: 'off-4',
      userId: 'u-13',
      userName: 'Felipe Gutiérrez',
      email: 'f.gutierrez@empresa.com',
      rut: '19.882.400-K',
      dept: 'Operaciones',
      offboardDate: '2026-11-16',
      reason: 'Renuncia voluntaria',
      pendingPlatforms: ['Office 365', 'Salesforce', 'SAP'],
      revokedPlatforms: ['HCM'],
      status: 'En proceso',
    },
    {
      id: 'off-5',
      userId: 'u-14',
      userName: 'Martín Rojas',
      email: 'm.rojas@empresa.com',
      rut: '16.109.420-8',
      dept: 'Ventas',
      offboardDate: '2026-10-28',
      reason: 'Renuncia voluntaria',
      pendingPlatforms: [],
      revokedPlatforms: ['Salesforce', 'Office 365', 'HCM'],
      status: 'Completado',
      completedAt: '2026-10-29T11:30:00Z',
    },
    {
      id: 'off-6',
      userId: 'u-15',
      userName: 'Daniela Muñoz',
      email: 'd.munoz@empresa.com',
      rut: '17.902.118-5',
      dept: 'Operaciones',
      offboardDate: '2026-10-20',
      reason: 'Despido',
      pendingPlatforms: [],
      revokedPlatforms: ['SAP', 'Office 365', 'HCM', 'ERP Propio'],
      status: 'Completado',
      completedAt: '2026-10-20T18:10:00Z',
    },
  ];

  const auditLogs: AuditEvent[] = [
    {
      id: 'log-1',
      action: 'access_granted',
      text: 'Ana García López agregada a ERP Propio',
      actor: 'Sistema / Sync',
      timestamp: minutesAgoIso(55),
    },
    {
      id: 'log-2',
      action: 'access_revoked',
      text: 'Ignacio Pérez: acceso Office 365 revocado',
      actor: 'it-admin@empresa.com',
      timestamp: minutesAgoIso(115),
    },
    {
      id: 'log-3',
      action: 'platform_synced',
      text: 'Sincronización SAP S/4HANA completada (16 identidades consolidadas)',
      actor: 'Conector SAP',
      timestamp: minutesAgoIso(135),
    },
    {
      id: 'log-4',
      action: 'inconsistency_alert',
      text: 'Inconsistencia detectada: Pedro Ramos (Inactivo con 2 cuentas activas)',
      actor: 'Motor de Auditoría',
      timestamp: minutesAgoIso(190),
    },
    {
      id: 'log-5',
      action: 'user_created',
      text: 'Diego Morales creado en directorio maestro desde HCM Propio',
      actor: 'RRHH Sync',
      timestamp: minutesAgoIso(240),
    },
  ];

  const settings: SystemSettings = {
    syncFrequency: 'Diaria (02:00 AM)',
    alertEmail: 'it-admin@empresa.com',
    graceDays: 1,
    authMode: 'LDAP / Active Directory',
    adminRoles: 'IT-Admin, RRHH-Manager',
    autoFlagOffboarding: true,
  };

  return { platforms, users, offboardings, auditLogs, settings, credentials, sessions: [] };
}

function migrateDb(db: DatabaseData): boolean {
  let dirty = false;
  if (!db.credentials || typeof db.credentials !== 'object') {
    db.credentials = {};
    dirty = true;
  }
  if (!Array.isArray(db.sessions)) {
    db.sessions = [];
    dirty = true;
  }

  // Ensure Carolina Díaz exists if DB was created before RBAC update
  if (!db.users.some((u) => u.email.toLowerCase() === 'c.diaz@empresa.com')) {
    db.users.splice(1, 0, {
      id: 'u-16',
      rut: '17.301.884-2',
      name: 'Carolina Díaz Fuentes',
      email: 'c.diaz@empresa.com',
      dept: 'RRHH',
      position: 'Jefa de Gestión de Personas',
      status: 'Activo',
      portalRole: 'RRHH_MANAGER',
      lastAccess: 'Hoy 10:15',
      sourceMaster: 'HCM Propio',
      updatedAt: nowIso(),
      accounts: [
        { platformId: 'HCM', username: '17301884', role: 'Admin Nómina', status: 'Activo', lastAccess: 'Hoy 10:15' },
        { platformId: 'Office 365', username: 'c.diaz@empresa.com', role: 'E3 User', status: 'Activo', lastAccess: 'Hoy 10:05' },
        { platformId: 'SAP', username: 'CDIAZ', role: 'HR Manager', status: 'Activo', lastAccess: 'Ayer 18:10' },
      ],
    });
    dirty = true;
  }

  let defaultHash: string | null = null;
  for (const u of db.users) {
    if (!u.portalRole) {
      if (u.email === 'a.garcia@empresa.com') u.portalRole = 'IT_ADMIN';
      else if (u.email === 'c.diaz@empresa.com') u.portalRole = 'RRHH_MANAGER';
      else if (u.email === 'j.herrera@empresa.com' || u.email === 'm.fernandez@empresa.com') u.portalRole = 'AUDITOR';
      else u.portalRole = 'USER';
      dirty = true;
    }
    if (!db.credentials[u.id]) {
      if (!defaultHash) defaultHash = hashPassword(DEFAULT_CORP_PASSWORD);
      db.credentials[u.id] = defaultHash;
      dirty = true;
    }
  }

  return dirty;
}

function readDb(): DatabaseData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = buildSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseData;
    if (migrateDb(parsed)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const seed = buildSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function writeDb(data: DatabaseData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function addAudit(db: DatabaseData, action: AuditEvent['action'], text: string, actor = 'Administrador TI'): void {
  const entry: AuditEvent = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    text,
    actor,
    timestamp: nowIso(),
  };
  db.auditLogs = [entry, ...db.auditLogs].slice(0, 80);
}

function computeInconsistencies(db: DatabaseData): Inconsistency[] {
  const list: Inconsistency[] = [];
  const requiredPlatformIds = db.platforms.filter((p) => p.requiredForActive).map((p) => p.id);

  for (const user of db.users) {
    const activeAccounts = user.accounts.filter((a) => a.status === 'Activo' || a.status === 'Pendiente revocar');

    if (user.status === 'En proceso de baja' && activeAccounts.length > 0) {
      list.push({
        id: `inc-baja-${user.id}`,
        userId: user.id,
        userName: user.name,
        email: user.email,
        rut: user.rut,
        issue: `Accesos activos/pendientes tras inicio de baja (${activeAccounts.length} plataformas)`,
        platforms: activeAccounts.map((a) => a.platformId),
        priority: 'Alta',
        type: 'BAJA_CON_ACCESO',
      });
      continue;
    }

    if (user.status === 'Inactivo' && activeAccounts.length > 0) {
      list.push({
        id: `inc-inact-${user.id}`,
        userId: user.id,
        userName: user.name,
        email: user.email,
        rut: user.rut,
        issue: `Usuario inactivo con cuentas aún activas en ${activeAccounts.length} plataforma(s)`,
        platforms: activeAccounts.map((a) => a.platformId),
        priority: 'Alta',
        type: 'INACTIVO_CON_ACCESO',
      });
      continue;
    }

    if (user.status === 'Activo' || user.status === 'Pendiente') {
      const userPlatformIds = new Set(user.accounts.filter((a) => a.status === 'Activo').map((a) => a.platformId));
      const missingRequired = requiredPlatformIds.filter((reqId) => !userPlatformIds.has(reqId));
      if (missingRequired.length > 0) {
        list.push({
          id: `inc-missing-${user.id}`,
          userId: user.id,
          userName: user.name,
          email: user.email,
          rut: user.rut,
          issue: `Sin acceso a plataformas corporativas obligatorias (${missingRequired.join(', ')})`,
          platforms: Array.from(userPlatformIds),
          priority: 'Media',
          type: 'FALTA_PLATAFORMA_BASE',
        });
      }
      if (!userPlatformIds.has('HCM') && user.accounts.length > 0) {
        list.push({
          id: `inc-nohcm-${user.id}`,
          userId: user.id,
          userName: user.name,
          email: user.email,
          rut: user.rut,
          issue: 'Cuenta activa en sistemas sin ficha vigente en HCM Propio (cuenta huérfana)',
          platforms: Array.from(userPlatformIds),
          priority: 'Alta',
          type: 'SIN_ORIGEN_RRHH',
        });
      }
    }
  }

  return list;
}

function getStateForRole(db: DatabaseData, authUser: User): AppStateResponse {
  if (authUser.portalRole === 'USER') {
    const selfUser = db.users.find((u) => u.id === authUser.id);
    const selfOffboardings = db.offboardings.filter((o) => o.userId === authUser.id);
    return {
      platforms: db.platforms,
      users: selfUser ? [selfUser] : [],
      offboardings: selfOffboardings,
      auditLogs: [],
      settings: db.settings,
      inconsistencies: [],
    };
  }

  return {
    platforms: db.platforms,
    users: db.users,
    offboardings: db.offboardings,
    auditLogs: db.auditLogs,
    settings: db.settings,
    inconsistencies: computeInconsistencies(db),
  };
}

function normalizeStatus(raw?: string): UserStatus {
  const val = (raw || '').trim().toLowerCase();
  if (val.includes('baja') || val.includes('desvinc') || val.includes('offboard') || val.includes('termino')) {
    return 'En proceso de baja';
  }
  if (val.includes('inactivo') || val.includes('inactive') || val.includes('disabled')) {
    return 'Inactivo';
  }
  if (val.includes('pendiente') || val.includes('pending')) {
    return 'Pendiente';
  }
  return 'Activo';
}

function buildUsername(email: string, platformId: string): string {
  const local = email.split('@')[0] || 'usuario';
  if (platformId === 'SAP') {
    return local.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
  }
  if (platformId === 'ERP Propio') {
    return local.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return email.toLowerCase();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sesión no iniciada. Por favor ingresa con tu usuario corporativo.' });
    return;
  }
  const db = readDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    res.status(401).json({ error: 'Sesión expirada o inválida.' });
    return;
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.status === 'Inactivo') {
    res.status(403).json({ error: 'Tu cuenta está inactiva o ha sido desvinculada.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function requireRoles(...roles: PortalRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }
    if (!roles.includes(req.authUser.portalRole)) {
      res.status(403).json({
        error: 'Tu rol de acceso no tiene permisos para ejecutar esta acción.',
      });
      return;
    }
    next();
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  readDb();

  /* --- AUTHENTICATION ENDPOINTS --- */
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      res.status(400).json({ error: 'Ingresa tu correo corporativo y contraseña.' });
      return;
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo o contraseña.' });
      return;
    }

    const storedHash = db.credentials[user.id];
    if (!storedHash || !verifyPassword(password, storedHash)) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo o contraseña.' });
      return;
    }

    if (user.status === 'Inactivo') {
      res.status(403).json({
        error: 'Cuenta inactiva o desvinculada. El acceso al portal ha sido revocado.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.sessions.push({ token, userId: user.id, createdAt: nowIso() });
    if (db.sessions.length > 100) {
      db.sessions = db.sessions.slice(-100);
    }

    user.lastAccess = 'En línea ahora';
    addAudit(db, 'auth_login', `Inicio de sesión en portal (${user.portalRole})`, user.email);
    writeDb(db);

    res.json({ token, user: toAuthUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: toAuthUser(req.authUser!) });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    db.sessions = db.sessions.filter((s) => s.token !== req.authToken);
    writeDb(db);
    res.json({ ok: true });
  });

  /* --- PROTECTED DOMAIN ENDPOINTS --- */
  app.get('/api/state', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/users', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const { name, email, rut, dept, position, status, platformIds, portalRole, password } = req.body as {
      name: string;
      email: string;
      rut?: string;
      dept: string;
      position?: string;
      status?: UserStatus;
      platformIds?: string[];
      portalRole?: PortalRole;
      password?: string;
    };

    if (!name || !email) {
      res.status(400).json({ error: 'Nombre y email son obligatorios.' });
      return;
    }

    const exists = db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'Ya existe un usuario consolidado con ese email.' });
      return;
    }

    let assignedRole: PortalRole = portalRole || 'USER';
    if (assignedRole === 'IT_ADMIN' && req.authUser!.portalRole !== 'IT_ADMIN') {
      assignedRole = 'USER';
    }

    const selectedIds = Array.isArray(platformIds) ? platformIds : [];
    const accounts: PlatformAccount[] = selectedIds.map((pid) => ({
      platformId: pid,
      username: buildUsername(email.trim(), pid),
      role: 'Usuario Estándar',
      status: 'Activo',
      lastAccess: 'Recién aprovisionado',
    }));

    const newUser: User = {
      id: `u-${Date.now()}`,
      rut: (rut || '').trim() || `20.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-K`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      dept: dept || 'TI',
      position: (position || '').trim() || 'Colaborador',
      status: status || 'Activo',
      portalRole: assignedRole,
      accounts,
      lastAccess: 'Nunca',
      sourceMaster: 'Creación Manual',
      updatedAt: nowIso(),
    };

    db.users.unshift(newUser);
    db.credentials[newUser.id] = hashPassword((password || '').trim() || DEFAULT_CORP_PASSWORD);

    addAudit(
      db,
      'user_created',
      `${newUser.name} creado (${assignedRole}) y consolidado en ${accounts.length} plataforma(s)`,
      req.authUser!.email,
    );
    writeDb(db);
    res.status(201).json(getStateForRole(db, req.authUser!));
  });

  app.patch('/api/users/:id', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const { name, email, rut, dept, position, status, portalRole } = req.body as Partial<User>;
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (rut !== undefined) user.rut = rut.trim();
    if (dept !== undefined) user.dept = dept;
    if (position !== undefined) user.position = position.trim();
    if (status !== undefined) user.status = status;
    if (portalRole !== undefined && req.authUser!.portalRole === 'IT_ADMIN') {
      user.portalRole = portalRole;
    }
    user.updatedAt = nowIso();

    addAudit(db, 'access_granted', `Ficha actualizada para ${user.name} (${user.dept})`, req.authUser!.email);
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/users/:id/toggle-platform', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const { platformId, enable, role } = req.body as {
      platformId: string;
      enable: boolean;
      role?: string;
    };

    const platform = db.platforms.find((p) => p.id === platformId);
    if (!platform) {
      res.status(404).json({ error: 'Plataforma no encontrada.' });
      return;
    }

    if (enable) {
      const existing = user.accounts.find((a) => a.platformId === platformId);
      if (existing) {
        existing.status = 'Activo';
        if (role) existing.role = role;
      } else {
        user.accounts.push({
          platformId,
          username: buildUsername(user.email, platformId),
          role: role || 'Usuario Estándar',
          status: 'Activo',
          lastAccess: 'Hoy',
        });
      }
      addAudit(db, 'access_granted', `${user.name}: acceso habilitado en ${platform.name}`, req.authUser!.email);
    } else {
      user.accounts = user.accounts.filter((a) => a.platformId !== platformId);
      const off = db.offboardings.find((o) => o.userId === user.id && o.status === 'En proceso');
      if (off) {
        off.pendingPlatforms = off.pendingPlatforms.filter((p) => p !== platformId);
        if (!off.revokedPlatforms.includes(platformId)) {
          off.revokedPlatforms.push(platformId);
        }
        if (off.pendingPlatforms.length === 0) {
          off.status = 'Completado';
          off.completedAt = nowIso();
          user.status = 'Inactivo';
          addAudit(db, 'offboarding_completed', `Desvinculación completada para ${user.name}`, req.authUser!.email);
        }
      }
      addAudit(db, 'access_revoked', `${user.name}: acceso revocado en ${platform.name}`, req.authUser!.email);
    }

    user.updatedAt = nowIso();
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/offboardings', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const { userId, reason, offboardDate } = req.body as {
      userId: string;
      reason: string;
      offboardDate?: string;
    };

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const existingOpen = db.offboardings.find((o) => o.userId === userId && o.status === 'En proceso');
    if (existingOpen) {
      res.status(409).json({ error: 'Este usuario ya tiene un proceso de baja en curso.' });
      return;
    }

    const activePlatformIds = user.accounts.map((a) => a.platformId);
    for (const acc of user.accounts) {
      acc.status = 'Pendiente revocar';
    }

    user.status = activePlatformIds.length > 0 ? 'En proceso de baja' : 'Inactivo';
    user.updatedAt = nowIso();

    const record: OffboardingRecord = {
      id: `off-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      email: user.email,
      rut: user.rut,
      dept: user.dept,
      offboardDate: offboardDate || new Date().toISOString().slice(0, 10),
      reason: reason || 'Renuncia voluntaria',
      pendingPlatforms: [...activePlatformIds],
      revokedPlatforms: [],
      status: activePlatformIds.length > 0 ? 'En proceso' : 'Completado',
      completedAt: activePlatformIds.length === 0 ? nowIso() : undefined,
    };

    db.offboardings.unshift(record);
    addAudit(
      db,
      'offboarding_started',
      `Baja iniciada para ${user.name} (${record.reason}) · ${activePlatformIds.length} accesos por revocar`,
      req.authUser!.email,
    );
    writeDb(db);
    res.status(201).json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/offboardings/:id/revoke', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const off = db.offboardings.find((o) => o.id === req.params.id);
    if (!off) {
      res.status(404).json({ error: 'Registro de baja no encontrado.' });
      return;
    }

    const { platformId, all } = req.body as { platformId?: string; all?: boolean };
    const user = db.users.find((u) => u.id === off.userId);

    if (all) {
      const revokedNow = [...off.pendingPlatforms];
      off.revokedPlatforms = Array.from(new Set([...off.revokedPlatforms, ...revokedNow]));
      off.pendingPlatforms = [];
      off.status = 'Completado';
      off.completedAt = nowIso();
      if (user) {
        user.accounts = [];
        user.status = 'Inactivo';
        user.updatedAt = nowIso();
      }
      addAudit(
        db,
        'offboarding_completed',
        `${off.userName}: todos los accesos revocados (${revokedNow.join(', ') || 'ninguno'})`,
        req.authUser!.email,
      );
    } else if (platformId) {
      off.pendingPlatforms = off.pendingPlatforms.filter((p) => p !== platformId);
      if (!off.revokedPlatforms.includes(platformId)) {
        off.revokedPlatforms.push(platformId);
      }
      if (user) {
        user.accounts = user.accounts.filter((a) => a.platformId !== platformId);
        user.updatedAt = nowIso();
      }
      addAudit(db, 'access_revoked', `${off.userName}: acceso ${platformId} revocado en baja`, req.authUser!.email);
      if (off.pendingPlatforms.length === 0) {
        off.status = 'Completado';
        off.completedAt = nowIso();
        if (user) user.status = 'Inactivo';
        addAudit(db, 'offboarding_completed', `Desvinculación completada para ${off.userName}`, req.authUser!.email);
      }
    }

    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/platforms', requireAuth, requireRoles('IT_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const { id, name, abbr, colorHex, type, endpoint, syncMode, requiredForActive } = req.body as Partial<Platform>;
    if (!name) {
      res.status(400).json({ error: 'El nombre de la plataforma es obligatorio.' });
      return;
    }
    const cleanId = (id || name).trim();
    if (db.platforms.some((p) => p.id.toLowerCase() === cleanId.toLowerCase())) {
      res.status(409).json({ error: 'Ya existe una plataforma con ese identificador.' });
      return;
    }

    const platform: Platform = {
      id: cleanId,
      name: name.trim(),
      abbr: (abbr || name.slice(0, 2)).toUpperCase(),
      colorHex: colorHex || '#2563EB',
      type: type || 'Propia',
      status: 'Operativo',
      lastSyncAt: nowIso(),
      endpoint: endpoint || `https://${cleanId.toLowerCase().replace(/\s+/g, '-')}.empresa.local/api/users`,
      syncMode: syncMode || 'Manual',
      requiredForActive: Boolean(requiredForActive),
    };

    db.platforms.push(platform);
    addAudit(db, 'platform_synced', `Nueva plataforma integrada: ${platform.name} (${platform.type})`, req.authUser!.email);
    writeDb(db);
    res.status(201).json(getStateForRole(db, req.authUser!));
  });

  app.patch('/api/platforms/:id', requireAuth, requireRoles('IT_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const platform = db.platforms.find((p) => p.id === req.params.id);
    if (!platform) {
      res.status(404).json({ error: 'Plataforma no encontrada.' });
      return;
    }

    const { name, type, status, endpoint, syncMode, requiredForActive } = req.body as Partial<Platform>;
    if (name !== undefined) platform.name = name.trim();
    if (type !== undefined) platform.type = type;
    if (status !== undefined) platform.status = status;
    if (endpoint !== undefined) platform.endpoint = endpoint.trim();
    if (syncMode !== undefined) platform.syncMode = syncMode;
    if (requiredForActive !== undefined) platform.requiredForActive = requiredForActive;

    addAudit(db, 'settings_updated', `Configuración actualizada para plataforma ${platform.name}`, req.authUser!.email);
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/platforms/:id/sync', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const platform = db.platforms.find((p) => p.id === req.params.id);
    if (!platform) {
      res.status(404).json({ error: 'Plataforma no encontrada.' });
      return;
    }
    platform.lastSyncAt = nowIso();
    const count = db.users.filter((u) => u.accounts.some((a) => a.platformId === platform.id)).length;
    addAudit(db, 'platform_synced', `Sincronización ${platform.name} completada (${count} cuentas validadas)`, req.authUser!.email);
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/consolidate/preview', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req, res) => {
    const db = readDb();
    const { platformId, rows } = req.body as {
      platformId: string;
      rows: ConsolidationRowInput[];
    };

    if (!platformId || !Array.isArray(rows)) {
      res.status(400).json({ error: 'Debe indicar plataforma de origen y filas válidas.' });
      return;
    }

    const items: ConsolidationPreviewItem[] = [];
    let newUsers = 0;
    let linkedAccounts = 0;
    let offboardingsDetected = 0;
    let statusUpdates = 0;
    let unchanged = 0;

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      const rut = (row.rut || '').trim();
      if (!email && !rut) continue;

      const matched = db.users.find(
        (u) => (email && u.email.toLowerCase() === email) || (rut && u.rut.toLowerCase() === rut.toLowerCase()),
      );

      const incomingStatus = normalizeStatus(row.status);
      const username = (row.username || '').trim() || buildUsername(email || `${rut}@empresa.com`, platformId);
      const role = (row.role || '').trim() || 'Usuario Estándar';

      if (!matched) {
        if (incomingStatus === 'En proceso de baja' || incomingStatus === 'Inactivo') {
          offboardingsDetected++;
          items.push({
            email: email || `${rut}@empresa.com`,
            rut: rut || 'Sin RUT',
            name: (row.name || 'Colaborador').trim(),
            dept: (row.dept || 'General').trim(),
            position: (row.position || 'Colaborador').trim(),
            incomingStatus: 'En proceso de baja',
            action: 'CONSOLIDAR_BAJA',
            detail: `Nuevo registro marcado como baja desde ${platformId}`,
            username,
            role,
            reason: row.reason || 'Consolidación de bajas externas',
            offboardDate: row.offboardDate || new Date().toISOString().slice(0, 10),
          });
        } else {
          newUsers++;
          items.push({
            email: email || `${rut}@empresa.com`,
            rut: rut || 'Por asignar',
            name: (row.name || 'Nuevo Usuario').trim(),
            dept: (row.dept || 'General').trim(),
            position: (row.position || 'Colaborador').trim(),
            incomingStatus,
            action: 'CREAR_USUARIO',
            detail: `Crear usuario maestro y vincular cuenta en ${platformId}`,
            username,
            role,
          });
        }
        continue;
      }

      if (incomingStatus === 'En proceso de baja' || incomingStatus === 'Inactivo') {
        if (matched.status !== 'Inactivo' && matched.status !== 'En proceso de baja') {
          offboardingsDetected++;
          items.push({
            email: matched.email,
            rut: matched.rut,
            name: matched.name,
            dept: matched.dept,
            position: matched.position,
            incomingStatus: 'En proceso de baja',
            action: 'CONSOLIDAR_BAJA',
            detail: `Baja detectada desde ${platformId} · Se marcarán ${matched.accounts.length} cuentas para revocar`,
            existingUserId: matched.id,
            username,
            role,
            reason: row.reason || `Baja reportada por ${platformId}`,
            offboardDate: row.offboardDate || new Date().toISOString().slice(0, 10),
          });
          continue;
        }
      }

      const hasAccount = matched.accounts.some((a) => a.platformId === platformId);
      if (!hasAccount) {
        linkedAccounts++;
        items.push({
          email: matched.email,
          rut: matched.rut,
          name: matched.name,
          dept: matched.dept,
          position: matched.position,
          incomingStatus,
          action: 'VINCULAR_CUENTA',
          detail: `Asociar cuenta existente de ${platformId} (${username}) al perfil maestro`,
          existingUserId: matched.id,
          username,
          role,
        });
      } else if (matched.status !== incomingStatus && incomingStatus === 'Activo') {
        statusUpdates++;
        items.push({
          email: matched.email,
          rut: matched.rut,
          name: matched.name,
          dept: matched.dept,
          position: matched.position,
          incomingStatus,
          action: 'ACTUALIZAR_ESTADO',
          detail: `Actualizar estado de ${matched.status} → ${incomingStatus}`,
          existingUserId: matched.id,
          username,
          role,
        });
      } else {
        unchanged++;
        items.push({
          email: matched.email,
          rut: matched.rut,
          name: matched.name,
          dept: matched.dept,
          position: matched.position,
          incomingStatus: matched.status,
          action: 'SIN_CAMBIOS',
          detail: `Ya consolidado en ${platformId}`,
          existingUserId: matched.id,
          username,
          role,
        });
      }
    }

    const preview: ConsolidationPreviewResponse = {
      platformId,
      totalRows: items.length,
      summary: {
        newUsers,
        linkedAccounts,
        offboardingsDetected,
        statusUpdates,
        unchanged,
      },
      items,
    };

    res.json(preview);
  });

  app.post('/api/consolidate/commit', requireAuth, requireRoles('IT_ADMIN', 'RRHH_MANAGER'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const { platformId, items } = req.body as {
      platformId: string;
      items: ConsolidationPreviewItem[];
    };

    if (!platformId || !Array.isArray(items)) {
      res.status(400).json({ error: 'Datos de consolidación inválidos.' });
      return;
    }

    let createdCount = 0;
    let linkedCount = 0;
    let offboardedCount = 0;

    for (const item of items) {
      if (item.action === 'SIN_CAMBIOS') continue;

      if (item.action === 'CREAR_USUARIO') {
        const newId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newUser: User = {
          id: newId,
          rut: item.rut || 'Por asignar',
          name: item.name,
          email: item.email,
          dept: item.dept,
          position: item.position,
          status: item.incomingStatus,
          portalRole: 'USER',
          lastAccess: 'Consolidado',
          sourceMaster: platformId,
          updatedAt: nowIso(),
          accounts: [
            {
              platformId,
              username: item.username,
              role: item.role,
              status: 'Activo',
              lastAccess: 'Sincronizado',
            },
          ],
        };
        db.users.unshift(newUser);
        db.credentials[newId] = hashPassword(DEFAULT_CORP_PASSWORD);
        createdCount++;
      } else if (item.action === 'VINCULAR_CUENTA' && item.existingUserId) {
        const user = db.users.find((u) => u.id === item.existingUserId);
        if (user && !user.accounts.some((a) => a.platformId === platformId)) {
          user.accounts.push({
            platformId,
            username: item.username,
            role: item.role,
            status: user.status === 'En proceso de baja' ? 'Pendiente revocar' : 'Activo',
            lastAccess: 'Sincronizado',
          });
          user.updatedAt = nowIso();
          linkedCount++;
        }
      } else if (item.action === 'ACTUALIZAR_ESTADO' && item.existingUserId) {
        const user = db.users.find((u) => u.id === item.existingUserId);
        if (user) {
          user.status = item.incomingStatus;
          user.updatedAt = nowIso();
        }
      } else if (item.action === 'CONSOLIDAR_BAJA') {
        let user = item.existingUserId ? db.users.find((u) => u.id === item.existingUserId) : undefined;
        if (!user) {
          const newId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          user = {
            id: newId,
            rut: item.rut || 'Sin RUT',
            name: item.name,
            email: item.email,
            dept: item.dept,
            position: item.position,
            status: 'Inactivo',
            portalRole: 'USER',
            lastAccess: 'Desvinculado',
            sourceMaster: platformId,
            updatedAt: nowIso(),
            accounts: [],
          };
          db.users.unshift(user);
          db.credentials[newId] = hashPassword(DEFAULT_CORP_PASSWORD);
        }

        const pendingPlatforms = user.accounts.map((a) => a.platformId);
        for (const acc of user.accounts) {
          acc.status = 'Pendiente revocar';
        }
        user.status = pendingPlatforms.length > 0 ? 'En proceso de baja' : 'Inactivo';
        user.updatedAt = nowIso();

        const hasOpenOff = db.offboardings.some((o) => o.userId === user!.id && o.status === 'En proceso');
        if (!hasOpenOff) {
          db.offboardings.unshift({
            id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId: user.id,
            userName: user.name,
            email: user.email,
            rut: user.rut,
            dept: user.dept,
            offboardDate: item.offboardDate || new Date().toISOString().slice(0, 10),
            reason: item.reason || `Baja consolidada (${platformId})`,
            pendingPlatforms,
            revokedPlatforms: [],
            status: pendingPlatforms.length > 0 ? 'En proceso' : 'Completado',
            completedAt: pendingPlatforms.length === 0 ? nowIso() : undefined,
          });
        }
        offboardedCount++;
      }
    }

    const platform = db.platforms.find((p) => p.id === platformId);
    if (platform) platform.lastSyncAt = nowIso();

    addAudit(
      db,
      'consolidation',
      `Consolidación ${platformId}: ${createdCount} nuevos, ${linkedCount} vinculados, ${offboardedCount} bajas procesadas`,
      req.authUser!.email,
    );
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.put('/api/settings', requireAuth, requireRoles('IT_ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const patch = req.body as Partial<SystemSettings>;
    db.settings = { ...db.settings, ...patch };
    addAudit(db, 'settings_updated', 'Parámetros de sincronización y acceso actualizados', req.authUser!.email);
    writeDb(db);
    res.json(getStateForRole(db, req.authUser!));
  });

  app.post('/api/reset', requireAuth, requireRoles('IT_ADMIN'), (req: AuthenticatedRequest, res) => {
    const seed = buildSeedData();
    const activeToken = req.authToken!;
    const activeAdmin = seed.users.find((u) => u.id === req.authUser!.id) || seed.users[0];
    seed.sessions.push({ token: activeToken, userId: activeAdmin.id, createdAt: nowIso() });
    writeDb(seed);
    res.json(getStateForRole(seed, activeAdmin));
  });

  // Vite middleware in development, static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UserSync server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start UserSync server:', err);
  process.exit(1);
});
