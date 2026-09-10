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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                Imprimir Vale de Salida
              </h3>
              <p className="text-xs text-neutral-500 font-sans">
                Formato limpio en blanco y negro para almacén
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 font-sans">
              Nombre del Técnico / Solicitante
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Ej: Carlos Mendoza (o dejar vacío)"
                autoFocus
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all font-sans"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Si lo dejas en blanco, se imprimirá una línea continua para llenarlo a mano.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 font-sans">
              Artículos a Incluir
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFilterScope('selected')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filterScope === 'selected'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 text-neutral-700 bg-white hover:border-neutral-300'
                }`}
              >
                <p className="text-xs font-bold">Seleccionados</p>
                <p className="text-[10px] text-neutral-500 font-mono">{results.filter(r => r.selected).length} ítems</p>
              </button>

              <button
                type="button"
                onClick={() => setFilterScope('in_stock')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filterScope === 'in_stock'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 text-neutral-700 bg-white hover:border-neutral-300'
                }`}
              >
                <p className="text-xs font-bold">Con Stock</p>
                <p className="text-[10px] text-neutral-500 font-mono">
                  {results.filter(r => r.matchedItem && r.matchedItem.stock >= r.requestedQty).length} ítems
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filterScope === 'all'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 text-neutral-700 bg-white hover:border-neutral-300'
                }`}
              >
                <p className="text-xs font-bold">Todos</p>
                <p className="text-[10px] text-neutral-500 font-mono">{results.length} ítems</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            className="px-5 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ({validItems.length} ítems)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
