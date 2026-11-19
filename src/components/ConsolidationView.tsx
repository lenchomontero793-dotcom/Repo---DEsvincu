import { useState, type ChangeEvent } from 'react';
import { ArrowRight, CheckCircle2, Database, FileSpreadsheet, Upload, UserMinus, UserPlus } from 'lucide-react';
import type { ConsolidationPreviewItem, ConsolidationPreviewResponse, Platform } from '../types';
import { parseCsvText } from '../utils/formatters';

interface ConsolidationViewProps {
  platforms: Platform[];
  onPreview: (platformId: string, rawText: string) => Promise<ConsolidationPreviewResponse | null>;
  onCommit: (platformId: string, items: ConsolidationPreviewItem[]) => Promise<void>;
}

const SAMPLE_HR_BATCH = `nombre,email,rut,depto,cargo,estado,motivo,fecha_baja
Camila Paredes,c.paredes@empresa.com,20.412.890-2,Finanzas,Analista Financiera,Activo,,
Tomás Valenzuela,t.valenzuela@empresa.com,19.104.331-7,TI,Ingeniero DevOps,Activo,,
Carlos Mendoza Ríos,c.mendoza@empresa.com,18.210.445-K,Ventas,Ejecutivo Comercial Senior,En proceso de baja,Renuncia voluntaria,2026-11-18
Diego Morales,d.morales@empresa.com,21.094.221-7,Finanzas,Analista Contable,Activo,,`;

const SAMPLE_SAP_BATCH = `nombre,email,rut,usuario,rol,estado
Ana García López,a.garcia@empresa.com,16.482.190-4,AGARCIA,Basis Admin,Activo
Sofía Torres,s.torres@empresa.com,20.115.689-0,STORRES,SD Billing,Activo
Carlos Mendoza Ríos,c.mendoza@empresa.com,18.210.445-K,CMENDOZA,SD Sales,Activo`;

const SAMPLE_SF_BATCH = `nombre,email,rut,usuario,rol,estado
Claudia Vargas,c.vargas@empresa.com,19.340.112-8,c.vargas@empresa.com,Logistics Liaison,Activo
Diego Morales,d.morales@empresa.com,21.094.221-7,d.morales@empresa.com,Finance Viewer,Activo
Matías Fuentes,m.fuentes@empresa.com,18.902.115-3,m.fuentes@empresa.com,Account Executive,Activo`;

export function ConsolidationView({ platforms, onPreview, onCommit }: ConsolidationViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]?.id || 'HCM');
  const [rawInput, setRawInput] = useState(SAMPLE_HR_BATCH);
  const [preview, setPreview] = useState<ConsolidationPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setRawInput(content);
      setPreview(null);
      setLocalError(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleAnalyze = async () => {
    setLocalError(null);
    const parsed = parseCsvText(rawInput);
    if (parsed.length === 0) {
      setLocalError('No se detectaron registros válidos. Asegúrate de incluir columnas como nombre, email, rut y estado.');
      return;
    }
    setLoading(true);
    try {
      const res = await onPreview(selectedPlatform, rawInput);
      if (res) setPreview(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      await onCommit(preview.platformId, preview.items);
      setPreview(null);
    } finally {
      setCommitting(false);
    }
  };

  const actionLabel = (action: ConsolidationPreviewItem['action']) => {
    switch (action) {
      case 'CREAR_USUARIO':
        return { label: 'Nuevo usuario', cls: 'text-[#2E6B1E] bg-[#EAF3DE]', icon: UserPlus };
      case 'VINCULAR_CUENTA':
        return { label: 'Vincular plataforma', cls: 'text-[#185FA5] bg-[#E6F1FB]', icon: Database };
      case 'CONSOLIDAR_BAJA':
        return { label: 'Consolidar baja', cls: 'text-[#A32D2D] bg-[#FCEBEB]', icon: UserMinus };
      case 'ACTUALIZAR_ESTADO':
        return { label: 'Actualizar estado', cls: 'text-[#854F0B] bg-[#FAEEDA]', icon: CheckCircle2 };
      default:
        return { label: 'Sin cambios', cls: 'text-[#5E5D57] bg-[#F3F2EC]', icon: CheckCircle2 };
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[#141413]">
          Motor de consolidación de bases de datos
        </h2>
        <p className="text-xs text-[#5E5D57] mt-0.5">
          Importa archivos CSV o JSON desde RRHH, SAP, Salesforce, Office 365 o plataformas propias para cruzar identidades, vincular cuentas y consolidar bajas automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left Config Panel */}
        <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#3D3D3A]">
              1. Plataforma o base de datos de origen
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setPreview(null);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#1F1E1D]/20 bg-white text-[#141413] outline-none focus:border-[#378ADD]"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#3D3D3A]">
              2. Cargar archivo (.csv o .json)
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[#1F1E1D]/30 rounded-lg bg-[#FAF9F5] hover:bg-[#F3F2EC] cursor-pointer text-xs font-medium text-[#3D3D3A] transition-colors">
              <Upload className="w-4 h-4 text-[#185FA5]" />
              <span>Seleccionar archivo local</span>
              <input type="file" accept=".csv,.txt,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#1F1E1D]/10">
            <span className="block text-xs font-semibold text-[#3D3D3A]">
              Cargar lotes de ejemplo
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform('HCM');
                setRawInput(SAMPLE_HR_BATCH);
                setPreview(null);
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-md border border-[#1F1E1D]/15 hover:bg-[#F3F2EC] flex items-center gap-2 text-[#141413]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#639922] shrink-0" />
              <span>Nómina RRHH (altas + baja)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform('SAP');
                setRawInput(SAMPLE_SAP_BATCH);
                setPreview(null);
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-md border border-[#1F1E1D]/15 hover:bg-[#F3F2EC] flex items-center gap-2 text-[#141413]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1E73BE] shrink-0" />
              <span>Exportación cuentas SAP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform('Salesforce');
                setRawInput(SAMPLE_SF_BATCH);
                setPreview(null);
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-md border border-[#1F1E1D]/15 hover:bg-[#F3F2EC] flex items-center gap-2 text-[#141413]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00A1E0] shrink-0" />
              <span>Exportación Salesforce CRM</span>
            </button>
          </div>
        </div>

        {/* Right Data Editor + Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#1F1E1D]/15 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[#3D3D3A]">
                3. Registros a consolidar (CSV o JSON)
              </label>
              <span className="text-[11px] text-[#73726C]">
                Columnas soportadas: nombre, email, rut, depto, cargo, estado, usuario, rol
              </span>
            </div>
            <textarea
              rows={7}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setPreview(null);
              }}
              className="w-full p-3 text-xs font-mono-tabular rounded-lg border border-[#1F1E1D]/20 bg-[#FAF9F5] text-[#141413] outline-none focus:border-[#378ADD]"
            />

            {localError && (
              <div className="text-xs text-[#A32D2D] bg-[#FCEBEB] px-3 py-2 rounded-md">
                {localError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[#185FA5] text-white hover:bg-[#144D87] disabled:opacity-50 whitespace-nowrap"
              >
                <span>{loading ? 'Analizando cruce...' : 'Analizar y previsualizar cruce'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {preview && (
            <div className="bg-white border border-[#1F1E1D]/15 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1F1E1D]/10 flex flex-wrap items-center justify-between gap-3 bg-[#F5F4ED]">
                <div>
                  <h3 className="text-sm font-semibold text-[#141413]">
                    Resultado del análisis ({preview.platformId})
                  </h3>
                  <p className="text-xs text-[#5E5D57] mt-0.5 tabular-nums">
                    {preview.summary.newUsers} nuevos · {preview.summary.linkedAccounts} cuentas por vincular ·{' '}
                    {preview.summary.offboardingsDetected} bajas detectadas · {preview.summary.unchanged} sin cambios
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    committing ||
                    preview.items.every((i) => i.action === 'SIN_CAMBIOS')
                  }
                  onClick={handleCommit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#2E6B1E] text-white hover:bg-[#245417] disabled:opacity-50 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{committing ? 'Consolidando...' : 'Confirmar consolidación'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#1F1E1D]/10 text-[11px] font-semibold text-[#5E5D57] bg-[#FAF9F5]">
                      <th className="py-2.5 px-4">Colaborador</th>
                      <th className="py-2.5 px-4">Acción detectada</th>
                      <th className="py-2.5 px-4">Detalle de consolidación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1E1D]/10">
                    {preview.items.map((item, idx) => {
                      const info = actionLabel(item.action);
                      const Icon = info.icon;
                      return (
                        <tr key={`${item.email}-${idx}`}>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-[#141413]">{item.name}</div>
                            <div className="text-[11px] text-[#73726C]">
                              {item.email} · <span className="font-mono-tabular">{item.rut}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${info.cls}`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{info.label}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-[#3D3D3A]">{item.detail}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
