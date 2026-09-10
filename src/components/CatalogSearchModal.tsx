import React, { useState, useMemo } from 'react';
import { Search, X, Check, Package, MapPin, Tag } from 'lucide-react';
import { CatalogItem } from '../types';
import { searchCatalogFuzzy, getCatalogData } from '../services/catalogService';

interface CatalogSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: CatalogItem) => void;
  initialQuery?: string;
  title?: string;
}

export const CatalogSearchModal: React.FC<CatalogSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  initialQuery = '',
  title = 'Buscar en Catálogo Maestro'
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');

  const allItems = useMemo(() => getCatalogData(), [isOpen]);

  const families = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(i => {
      if (i.familia) set.add(i.familia);
    });
    return Array.from(set).sort();
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let list: { item: CatalogItem; score?: number }[] = [];

    if (searchTerm.trim().length >= 1) {
      list = searchCatalogFuzzy(searchTerm, 30);
    } else {
      list = allItems.slice(0, 30).map(item => ({ item }));
    }

    if (selectedFamily !== 'ALL') {
      list = list.filter(r => r.item.familia === selectedFamily);
    }

    return list;
  }, [searchTerm, selectedFamily, allItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                {title}
              </h3>
              <p className="text-xs text-neutral-500">
                Busca y selecciona el artículo correspondiente
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

        {/* Search & Filter */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descripción, código..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:border-neutral-900 outline-none transition-all"
          >
            <option value="ALL">Todas las familias ({families.length})</option>
            {families.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs font-mono">
              No se encontraron artículos con el término "{searchTerm}".
            </div>
          ) : (
            filteredItems.map(({ item, score }) => (
              <div
                key={item.cod_arti}
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
                className="p-3.5 rounded-lg border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 cursor-pointer transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300">
                      {item.cod_arti}
                    </span>
                    {score !== undefined && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Score: {Math.round(score)}%
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-neutral-900 text-xs sm:text-sm leading-snug">
                    {item.descripcion}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1 font-mono">
                    {item.familia && <span>{item.familia}</span>}
                    {item.unidad && <span>• {item.unidad}</span>}
                    {item.ubicacion && <span>• Ubic: {item.ubicacion}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold border ${
                    item.stock > 0 
                      ? 'bg-neutral-100 text-neutral-900 border-neutral-300' 
                      : 'bg-white text-neutral-400 border-neutral-200 line-through'
                  }`}>
                    Stock: {item.stock}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1 justify-end"
                  >
                    <span>Seleccionar</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
