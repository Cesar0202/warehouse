import React, { useState, useMemo } from 'react';
import { Search, X, Check, Plus, Package } from 'lucide-react';
import { CatalogItem, ParsedLineResult } from '../types';
import { searchCatalogFuzzy, getCatalogData } from '../services/catalogService';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: CatalogItem, qty: number) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const allItems = useMemo(() => getCatalogData(), [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedItem(null);
      setQuantity(1);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return allItems.slice(0, 15);
    }
    const fuzzy = searchCatalogFuzzy(searchTerm, 25);
    return fuzzy.map(f => f.item);
  }, [searchTerm, allItems]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedItem) return;
    onAddItem(selectedItem, Math.max(1, quantity));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                Agregar Artículo a la Lista
              </h3>
              <p className="text-xs text-neutral-500">
                Busca directamente por código o descripción en el inventario
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

        {/* Search Bar */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ej. DES01, CUR06) o descripción..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:border-neutral-900 outline-none transition-all"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-72">
          {searchResults.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs font-mono">
              No se encontraron artículos con "{searchTerm}".
            </div>
          ) : (
            searchResults.map((item) => {
              const isSelected = selectedItem?.cod_arti === item.cod_arti;
              return (
                <div
                  key={item.cod_arti}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-200 text-neutral-900">
                        {item.cod_arti}
                      </span>
                      <span className="text-xs font-semibold text-neutral-900 truncate">
                        {item.descripcion}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                      {item.familia && <span>{item.familia}</span>}
                      {item.unidad && <span>• {item.unidad}</span>}
                      {item.ubicacion && <span>• Ubic: {item.ubicacion}</span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                      item.stock > 0 
                        ? 'bg-white text-neutral-900 border-neutral-300' 
                        : 'bg-white text-neutral-400 border-neutral-200 line-through'
                    }`}>
                      Stock: {item.stock}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected preview & Quantity */}
        {selectedItem && (
          <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Artículo Seleccionado:
              </span>
              <p className="font-bold text-xs text-neutral-900">
                [{selectedItem.cod_arti}] {selectedItem.descripcion}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-700">Cantidad:</span>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity(0);
                  } else {
                    const num = parseInt(val, 10);
                    setQuantity(isNaN(num) ? 0 : Math.max(0, num));
                  }
                }}
                onBlur={() => {
                  if (!quantity || quantity < 1) setQuantity(1);
                }}
                className="w-20 text-center py-1.5 px-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-bold text-neutral-900 outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        )}

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
            onClick={handleConfirm}
            disabled={!selectedItem}
            className="px-5 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar a la Lista</span>
          </button>
        </div>
      </div>
    </div>
  );
};
