import type { ConsolidationRowInput } from '../types';

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'hace unos seg';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  return `hace ${diffDays} d`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  // UTF-8 BOM so Microsoft Excel renders Spanish accents properly
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsvText(rawText: string): ConsolidationRowInput[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Support JSON array directly if user pastes/uploads JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .filter((item) => item && typeof item === 'object')
        .map((item: Record<string, unknown>) => ({
          rut: String(item.rut ?? item.dni ?? item.id ?? ''),
          name: String(item.name ?? item.nombre ?? item.fullName ?? ''),
          email: String(item.email ?? item.correo ?? item.mail ?? ''),
          dept: String(item.dept ?? item.departamento ?? item.area ?? 'General'),
          position: String(item.position ?? item.cargo ?? item.role ?? 'Colaborador'),
          status: String(item.status ?? item.estado ?? 'Activo'),
          username: String(item.username ?? item.usuario ?? ''),
          role: String(item.role ?? item.perfil ?? 'Usuario Estándar'),
          reason: item.reason ? String(item.reason) : item.motivo ? String(item.motivo) : undefined,
          offboardDate: item.offboardDate ? String(item.offboardDate) : item.fecha_baja ? String(item.fecha_baja) : undefined,
        }));
    } catch {
      // fall through to CSV parser
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const rawHeaders = splitLine(lines[0]).map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  );

  const hasHeader = rawHeaders.some((h) =>
    ['email', 'correo', 'nombre', 'name', 'rut', 'dni', 'estado', 'status'].includes(h),
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const colIndex = (candidates: string[], fallback: number): number => {
    if (!hasHeader) return fallback;
    return rawHeaders.findIndex((h) => candidates.some((c) => h.includes(c)));
  };

  const idxName = colIndex(['nombre', 'name', 'colaborador'], 0);
  const idxEmail = colIndex(['email', 'correo', 'mail'], 1);
  const idxRut = colIndex(['rut', 'dni', 'cedula', 'identificacion'], 2);
  const idxDept = colIndex(['depto', 'departamento', 'dept', 'area'], 3);
  const idxStatus = colIndex(['estado', 'status'], 4);
  const idxUsername = colIndex(['usuario', 'username', 'cuenta'], -1);
  const idxRole = colIndex(['rol', 'perfil', 'role'], -1);
  const idxPosition = colIndex(['cargo', 'puesto', 'position'], -1);
  const idxReason = colIndex(['motivo', 'reason'], -1);
  const idxDate = colIndex(['fecha_baja', 'fecha', 'offboard'], -1);

  return dataLines
    .map((line) => {
      const cells = splitLine(line);
      return {
        name: idxName >= 0 ? cells[idxName] ?? '' : '',
        email: idxEmail >= 0 ? cells[idxEmail] ?? '' : '',
        rut: idxRut >= 0 ? cells[idxRut] ?? '' : '',
        dept: idxDept >= 0 ? cells[idxDept] ?? 'General' : 'General',
        status: idxStatus >= 0 ? cells[idxStatus] ?? 'Activo' : 'Activo',
        username: idxUsername >= 0 ? cells[idxUsername] ?? '' : '',
        role: idxRole >= 0 ? cells[idxRole] ?? '' : '',
        position: idxPosition >= 0 ? cells[idxPosition] ?? '' : '',
        reason: idxReason >= 0 ? cells[idxReason] : undefined,
        offboardDate: idxDate >= 0 ? cells[idxDate] : undefined,
      };
    })
    .filter((r) => Boolean(r.email || r.rut));
}
