import type { PortalRole } from '../types';

export type NavPage =
  | 'dashboard'
  | 'usuarios'
  | 'bajas'
  | 'validacion'
  | 'consolidar'
  | 'plataformas'
  | 'reportes'
  | 'configuracion'
  | 'mi-perfil';

export const ROLE_LABELS: Record<PortalRole, string> = {
  IT_ADMIN: 'Administrador TI',
  RRHH_MANAGER: 'Gestor RRHH',
  AUDITOR: 'Auditor / Seguridad',
  USER: 'Colaborador',
};

export const ROLE_DESCRIPTIONS: Record<PortalRole, string> = {
  IT_ADMIN: 'Control total: usuarios, bajas, consolidación, plataformas y configuración',
  RRHH_MANAGER: 'Gestión de altas, nómina, bajas, validación de cuentas y reportes',
  AUDITOR: 'Solo lectura: auditoría de inconsistencias, validación cruzada y reportes',
  USER: 'Portal personal: consulta de ficha corporativa y cuentas asignadas',
};

export function canManageUsers(role: PortalRole): boolean {
  return role === 'IT_ADMIN' || role === 'RRHH_MANAGER';
}

export function canManageSystem(role: PortalRole): boolean {
  return role === 'IT_ADMIN';
}

export function getAllowedPages(role: PortalRole): NavPage[] {
  switch (role) {
    case 'IT_ADMIN':
      return [
        'dashboard',
        'usuarios',
        'bajas',
        'validacion',
        'consolidar',
        'plataformas',
        'reportes',
        'configuracion',
      ];
    case 'RRHH_MANAGER':
      return ['dashboard', 'usuarios', 'bajas', 'validacion', 'consolidar', 'reportes'];
    case 'AUDITOR':
      return ['dashboard', 'usuarios', 'bajas', 'validacion', 'reportes'];
    case 'USER':
      return ['mi-perfil'];
  }
}

export function getDefaultPage(role: PortalRole): NavPage {
  return role === 'USER' ? 'mi-perfil' : 'dashboard';
}
