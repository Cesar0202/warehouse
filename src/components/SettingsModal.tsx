import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Check,
  Phone,
  Key,
  ShieldCheck,
  Save,
  MessageSquare
} from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../services/aiAgentService';

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
