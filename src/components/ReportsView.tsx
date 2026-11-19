import { AlertTriangle, Clock, Download, Eye, History, Plug, UserMinus, Users } from 'lucide-react';
import type {
  AuditEvent,
  Inconsistency,
  OffboardingRecord,
  Platform,
  User,
} from '../types';
import { downloadCsv } from '../utils/formatters';

export type ReportType =
  | 'inventario'
  | 'desvinculaciones'
  | 'inconsistencias'
  | 'plataformas'
  | 'inactivos'
  | 'auditoria';

interface ReportsViewProps {
  users: User[];
  platforms: Platform[];
  offboardings: OffboardingRecord[];
  inconsistencies: Inconsistency[];
  auditLogs: AuditEvent[];
  onPreviewReport: (reportType: ReportType) => void;
  onNotify: (msg: string) => void;
}

export function buildReportData(
  reportType: ReportType,
  data: {
    users: User[];
    platforms: Platform[];
    offboardings: OffboardingRecord[];
    inconsistencies: Inconsistency[];
    auditLogs: AuditEvent[];
  },
): { title: string; filename: string; headers: string[]; rows: (string | number)[][] } {
  const dateTag = new Date().toISOString().slice(0, 10);

  switch (reportType) {
    case 'inventario':
      return {
        title: 'Inventario completo de usuarios y plataformas',
        filename: `usersync_inventario_${dateTag}.csv`,
        headers: ['Nombre', 'RUT', 'Email', 'Departamento', 'Cargo', 'Estado', 'Total Plataformas', 'Plataformas Asignadas', 'Último Acceso'],
        rows: data.users.map((u) => [
          u.name,
          u.rut,
          u.email,
          u.dept,
          u.position,
          u.status,
          u.accounts.length,
          u.accounts.map((a) => `${a.platformId} (${a.status})`).join(' | ') || 'Ninguna',
          u.lastAccess,
        ]),
      };
    case 'desvinculaciones':
      return {
        title: 'Reporte consolidado de desvinculaciones y revocación',
        filename: `usersync_bajas_${dateTag}.csv`,
        headers: ['Usuario', 'RUT', 'Email', 'Departamento', 'Fecha Baja', 'Motivo', 'Estado', 'Pendientes por Revocar', 'Ya Revocados'],
        rows: data.offboardings.map((o) => [
          o.userName,
          o.rut,
          o.email,
          o.dept,
          o.offboardDate,
          o.reason,
          o.status,
          o.pendingPlatforms.join(' | ') || 'Ninguno',
          o.revokedPlatforms.join(' | ') || 'Ninguno',
        ]),
      };
    case 'inconsistencias':
      return {
        title: 'Reporte de inconsistencias de acceso',
        filename: `usersync_inconsistencias_${dateTag}.csv`,
        headers: ['Usuario', 'RUT', 'Email', 'Prioridad', 'Problema Detectado', 'Plataformas Involucradas'],
        rows: data.inconsistencies.map((i) => [
          i.userName,
          i.rut,
          i.email,
          i.priority,
          i.issue,
          i.platforms.join(' | ') || 'Ninguna',
        ]),
      };
    case 'plataformas':
      return {
        title: 'Accesos consolidados por plataforma',
        filename: `usersync_plataformas_${dateTag}.csv`,
        headers: ['Plataforma', 'Tipo', 'Estado', 'Modo Sync', 'Cuentas Activas', 'Pendientes Revocar', 'Obligatoria Activos'],
        rows: data.platforms.map((p) => [
          p.name,
          p.type,
          p.status,
          p.syncMode,
          data.users.filter((u) => u.accounts.some((a) => a.platformId === p.id && a.status === 'Activo')).length,
          data.users.filter((u) => u.accounts.some((a) => a.platformId === p.id && a.status === 'Pendiente revocar')).length,
          p.requiredForActive ? 'Sí' : 'No',
        ]),
      };
    case 'inactivos':
      return {
        title: 'Usuarios inactivos o pendientes de activación',
        filename: `usersync_inactivos_${dateTag}.csv`,
        headers: ['Nombre', 'RUT', 'Email', 'Departamento', 'Estado', 'Cuentas aún abiertas', 'Último Acceso'],
        rows: data.users
          .filter((u) => u.status !== 'Activo')
          .map((u) => [
            u.name,
            u.rut,
            u.email,
            u.dept,
            u.status,
            u.accounts.map((a) => a.platformId).join(' | ') || 'Ninguna',
            u.lastAccess,
          ]),
      };
    case 'auditoria':
      return {
        title: 'Audit log de cambios y sincronizaciones',
        filename: `usersync_auditoria_${dateTag}.csv`,
        headers: ['Fecha / Hora', 'Acción', 'Responsable', 'Detalle'],
        rows: data.auditLogs.map((l) => [
          new Date(l.timestamp).toLocaleString('es-CL'),
          l.action,
          l.actor,
          l.text,
        ]),
      };
  }
}

export function ReportsView({
  users,
  platforms,
  offboardings,
  inconsistencies,
  auditLogs,
  onPreviewReport,
  onNotify,
}: ReportsViewProps) {
  const catalog: {
    id: ReportType;
    title: string;
    desc: string;
    countText: string;
    icon: typeof Users;
  }[] = [
    {
      id: 'inventario',
      title: 'Inventario completo de usuarios',
      desc: 'Lista todos los colaboradores consolidados, su estado maestro y las cuentas activas en cada plataforma.',
      countText: `${users.length} registros`,
      icon: Users,
    },
    {
      id: 'desvinculaciones',
      title: 'Reporte de desvinculaciones',
      desc: 'Historial de bajas, motivos y auditoría de accesos revocados vs. pendientes en SAP, Salesforce y Office 365.',
      countText: `${offboardings.length} bajas`,
      icon: UserMinus,
    },
    {
      id: 'inconsistencias',
      title: 'Inconsistencias de acceso',
      desc: 'Detecta usuarios inactivos o en baja con cuentas abiertas, cuentas huérfanas o faltantes por rol.',
      countText: `${inconsistencies.length} hallazgos`,
      icon: AlertTriangle,
    },
    {
      id: 'plataformas',
      title: 'Accesos por plataforma',
      desc: 'Distribución cuantitativa de usuarios activos y pendientes de revocación por sistema integrado.',
      countText: `${platforms.length} sistemas`,
      icon: Plug,
    },
    {
      id: 'inactivos',
      title: 'Usuarios inactivos y en baja',
      desc: 'Cuentas sin actividad vigente o en proceso de salida que requieren revisión de licencias.',
      countText: `${users.filter((u) => u.status !== 'Activo').length} usuarios`,
      icon: Clock,
    },
    {
      id: 'auditoria',
      title: 'Audit log de cambios',
      desc: 'Registro cronológico de altas, bajas, consolidaciones CSV y sincronizaciones ejecutadas.',
      countText: `${auditLogs.length} eventos`,
      icon: History,
    },
  ];

  const handleDownload = (id: ReportType) => {
    const built = buildReportData(id, {
      users,
      platforms,
      offboardings,
      inconsistencies,
      auditLogs,
    });
    downloadCsv(built.filename, built.headers, built.rows);
    onNotify(`Reporte descargado: ${built.filename}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-[#141413]">Reportes disponibles</h2>
        <p className="text-xs text-[#5E5D57] mt-0.5">
          Genera vistas previas ejecutivas, imprime en PDF o descarga en CSV compatible con Excel con los datos en vivo.
        </p>
      </div>

      <div className="space-y-3">
        {catalog.map((rep) => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.id}
              className="bg-white border border-[#1F1E1D]/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[#F5F4ED] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#185FA5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#141413]">{rep.title}</h3>
                    <span className="text-[11px] text-[#73726C] tabular-nums">· {rep.countText}</span>
                  </div>
                  <p className="text-xs text-[#5E5D57] mt-0.5">{rep.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewReport(rep.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 hover:bg-[#F3F2EC] text-[#141413] whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver reporte</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(rep.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
