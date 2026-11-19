import { useEffect, useState } from 'react';
import { RotateCcw, Save, Shield } from 'lucide-react';
import type { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => Promise<void>;
  onRequestReset: () => void;
}

export function SettingsView({ settings, onSave, onRequestReset }: SettingsViewProps) {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-[16px] font-semibold text-[#141413]">Configuración del sistema</h2>
        <p className="text-xs text-[#5E5D57] mt-0.5">
          Ajusta las políticas de sincronización entre plataformas, días de gracia para bajas y control de acceso.
        </p>
      </div>

      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#141413]">Sincronización automática</h3>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#5E5D57]">
            Frecuencia de sincronización
          </label>
          <select
            value={form.syncFrequency}
            onChange={(e) =>
              setForm({ ...form, syncFrequency: e.target.value as SystemSettings['syncFrequency'] })
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          >
            <option value="Cada hora">Cada hora</option>
            <option value="Cada 6 horas">Cada 6 horas</option>
            <option value="Diaria (02:00 AM)">Diaria (02:00 AM)</option>
            <option value="Manual">Manual</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#5E5D57]">
            Notificar inconsistencias a
          </label>
          <input
            type="email"
            value={form.alertEmail}
            onChange={(e) => setForm({ ...form, alertEmail: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#5E5D57]">
            Días de gracia para revocar accesos tras baja
          </label>
          <input
            type="number"
            min={0}
            max={30}
            value={form.graceDays}
            onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          />
        </div>

        <label className="flex items-center gap-2.5 text-xs text-[#3D3D3A] cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.autoFlagOffboarding}
            onChange={(e) => setForm({ ...form, autoFlagOffboarding: e.target.checked })}
            className="rounded border-[#1F1E1D]/30"
          />
          <span>Marcar automáticamente accesos de SAP y Office 365 al recibir una baja desde HCM</span>
        </label>
      </div>

      <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#141413] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#185FA5]" />
          <span>Acceso y gobernanza</span>
        </h3>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#5E5D57]">Modo de autenticación</label>
          <select
            value={form.authMode}
            onChange={(e) =>
              setForm({ ...form, authMode: e.target.value as SystemSettings['authMode'] })
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          >
            <option value="LDAP / Active Directory">LDAP / Active Directory</option>
            <option value="OAuth 2.0">OAuth 2.0</option>
            <option value="SAML 2.0">SAML 2.0</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#5E5D57]">
            Roles con acceso de administrador
          </label>
          <input
            type="text"
            value={form.adminRoles}
            onChange={(e) => setForm({ ...form, adminRoles: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F1E1D]/10">
          <button
            type="button"
            onClick={onRequestReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#1F1E1D]/20 text-[#5E5D57] hover:text-[#141413] hover:bg-[#F3F2EC]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer datos iniciales</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando...' : 'Guardar configuración'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
