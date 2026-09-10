import React, { useState } from 'react';
import { Printer, X, User, CheckSquare } from 'lucide-react';
import { ParsedLineResult } from '../types';

interface PrintDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ParsedLineResult[];
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const PrintDispatchModal: React.FC<PrintDispatchModalProps> = ({
  isOpen,
  onClose,
  results,
  onShowToast
}) => {
  const [technicianName, setTechnicianName] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'selected' | 'in_stock'>('selected');

  if (!isOpen) return null;

  const validItems = results.filter(r => {
    if (filterScope === 'selected') return r.selected;
    if (filterScope === 'in_stock') return r.matchedItem && r.matchedItem.stock >= r.requestedQty;
    return true;
  });

  const handleExecutePrint = () => {
    if (validItems.length === 0) {
      onShowToast('warning', 'No hay artículos para imprimir');
      return;
    }

    // Set technician name in local storage/state so print sheet picks it up
    sessionStorage.setItem('dispatch_technician_name', technicianName.trim());
    window.dispatchEvent(new CustomEvent('update-technician-name', { detail: technicianName.trim() }));

    const originalTitle = document.title;
    document.title = '';

    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Imprimir Vale de Despacho
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Formato limpio en blanco y negro para almacén
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">
              Nombre del Técnico / Solicitante
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Ej: Carlos Mendoza (o dejar vacío)"
                autoFocus
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-sans"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Si lo dejas en blanco, se imprimirá una línea continua para llenarlo a mano.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">
              Artículos a Incluir
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFilterScope('selected')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  filterScope === 'selected'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 text-slate-700 bg-white'
                }`}
              >
                <p className="text-xs">Seleccionados</p>
                <p className="text-[10px] text-slate-500">{results.filter(r => r.selected).length} ítems</p>
              </button>

              <button
                type="button"
                onClick={() => setFilterScope('in_stock')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  filterScope === 'in_stock'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 text-slate-700 bg-white'
                }`}
              >
                <p className="text-xs">Con Stock</p>
                <p className="text-[10px] text-slate-500">
                  {results.filter(r => r.matchedItem && r.matchedItem.stock >= r.requestedQty).length} ítems
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  filterScope === 'all'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 text-slate-700 bg-white'
                }`}
              >
                <p className="text-xs">Todos</p>
                <p className="text-[10px] text-slate-500">{results.length} ítems</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ({validItems.length} ítems)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
