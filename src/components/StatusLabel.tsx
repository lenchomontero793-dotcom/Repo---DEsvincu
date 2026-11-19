import { AlertTriangle, CheckCircle2, Clock, MinusCircle, XCircle } from 'lucide-react';
import type { Platform, UserStatus } from '../types';

export function UserStatusLabel({ status }: { status: UserStatus }) {
  switch (status) {
    case 'Activo':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E6B1E]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Activo</span>
        </span>
      );
    case 'Inactivo':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A32D2D]">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Inactivo</span>
        </span>
      );
    case 'Pendiente':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#854F0B]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Pendiente</span>
        </span>
      );
    case 'En proceso de baja':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#993C1D]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>En proceso de baja</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B6A64]">
          <MinusCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
  }
}

export function PlatformBadge({
  platform,
  size = 'sm',
  dimmed = false,
}: {
  platform: Platform;
  size?: 'sm' | 'md';
  dimmed?: boolean;
}) {
  const dims = size === 'md' ? 'w-9 h-9 text-xs rounded-lg' : 'w-6 h-6 text-[10px] rounded';
  return (
    <span
      title={platform.name}
      style={{ backgroundColor: dimmed ? '#D3D1C7' : platform.colorHex }}
      className={`inline-flex items-center justify-center font-semibold text-white shrink-0 select-none ${dims} ${
        dimmed ? 'opacity-60' : ''
      }`}
    >
      {platform.abbr}
    </span>
  );
}
