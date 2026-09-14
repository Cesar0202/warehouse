import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Check,
  Phone,
  Key,
  ShieldCheck,
  Save,
  MessageSquare,
  CloudUpload,
  Download
} from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../services/aiAgentService';
import { uploadImageToCloud } from '../services/imageUploadService';
import { forceSyncAllCatalogToPhones } from '../services/technicianOrderService';
import { getCatalogData } from '../services/catalogService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

const WAREHOUSE_PHONE_STORAGE = 'app_warehouse_whatsapp_phone_v1';
const ENV_PHONE = ((import.meta as any).env?.VITE_WAREHOUSE_WHATSAPP_PHONE as string) || '';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedPhone = localStorage.getItem(WAREHOUSE_PHONE_STORAGE) || ENV_PHONE || '';
      setPhone(savedPhone);
      setApiKey(getGeminiApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Save Phone
    const cleanPhone = phone.replace(/[^0-9+]/g, '').trim();
    localStorage.setItem(WAREHOUSE_PHONE_STORAGE, cleanPhone);

    // 2. Save Gemini Key if edited
    if (apiKey.trim()) {
      setGeminiApiKey(apiKey.trim());
    }

    onShowToast('success', 'Configuración guardada', 'El número de WhatsApp de almacén se ha actualizado.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-2xl border border-neutral-300 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                Configuración del Sistema
              </h3>
              <p className="text-xs text-neutral-500">
                Parámetros de WhatsApp y conexiones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* WhatsApp Phone Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Número de WhatsApp de Almacén</span>
              </label>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Fijo / Automático
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Es el número al que todos los técnicos enviarán sus pedidos desde el móvil con un solo clic.
            </p>
            <div className="relative mt-1">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="51987654321 (código país + número)"
                required
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono font-bold focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              * Ejemplo para Perú (+51): <span className="font-mono font-semibold text-neutral-600">51987654321</span>
            </p>
          </div>

          {/* Gemini API Key Section */}
          <div className="space-y-1.5 pt-3 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-neutral-700" />
              <span>Clave de Inteligencia Artificial (Gemini)</span>
            </label>
            <p className="text-xs text-neutral-500">
              Para el descifrador automático de jerga y pedidos compuestos en Almacén.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Cloud Photos Migration & Sync */}
          <div className="space-y-2 pt-3 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-blue-600" />
              <span>Fotos en la Nube y Catálogo</span>
            </label>
            <p className="text-xs text-neutral-500">
              Sube las fotos guardadas en tu laptop directamente a internet para que se vean en todos los teléfonos al instante.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const raw = localStorage.getItem('app_item_overrides_v1');
                  if (!raw) {
                    onShowToast('info', 'Sin fotos locales', 'No hay fotos pendientes por subir');
                    return;
                  }
                  try {
                    const overrides = JSON.parse(raw);
                    const keys = Object.keys(overrides);
                    let uploadedCount = 0;
                    onShowToast('info', 'Subiendo fotos a la nube...', 'Por favor espera unos segundos');

                    for (const k of keys) {
                      const item = overrides[k];
                      if (item && item.foto && item.foto.startsWith('data:image/')) {
                        const cloudUrl = await uploadImageToCloud(item.foto);
                        if (cloudUrl && !cloudUrl.startsWith('data:image/')) {
                          item.foto = cloudUrl;
                          uploadedCount++;
                        }
                      }
                    }

                    localStorage.setItem('app_item_overrides_v1', JSON.stringify(overrides));
                    forceSyncAllCatalogToPhones();
                    onShowToast('success', '¡Fotos en la Nube!', `Se subieron ${uploadedCount} fotos a internet con éxito.`);
                  } catch (e) {
                    console.error('Error migrando fotos:', e);
                    onShowToast('error', 'Error al subir fotos', 'Verifica tu conexión a internet');
                  }
                }}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <CloudUpload className="w-4 h-4" />
                <span>☁️ Subir Fotos a la Nube</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const catalogData = getCatalogData();
                    const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'catalogo.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    onShowToast('success', 'Catálogo exportado', 'Archivo catalogo.json descargado con éxito.');
                  } catch (e) {
                    console.error('Error exportando catálogo:', e);
                    onShowToast('error', 'Error al exportar');
                  }
                }}
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>💾 Descargar catalogo.json</span>
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
