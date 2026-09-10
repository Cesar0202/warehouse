import React, { useState } from 'react';
import { BookPlus, X, Check, Search, Bookmark } from 'lucide-react';
import { CatalogItem } from '../types';
import { addOrUpdateAlias } from '../services/aliasService';
import { getCatalogData } from '../services/catalogService';

interface AliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAlias?: string;
  initialCatalogItem?: CatalogItem | null;
  onAliasSaved: (alias: string, codArti: string) => void;
}

export const AliasModal: React.FC<AliasModalProps> = ({
  isOpen,
  onClose,
  initialAlias = '',
  initialCatalogItem = null,
  onAliasSaved
}) => {
  const [aliasText, setAliasText] = useState(initialAlias);
  const [selectedCodArti, setSelectedCodArti] = useState(initialCatalogItem?.cod_arti || '');
  const [note, setNote] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const allItems = getCatalogData();

  React.useEffect(() => {
    if (isOpen) {
      setAliasText(initialAlias);
      setSelectedCodArti(initialCatalogItem?.cod_arti || '');
      setNote('');
      setSearchFilter('');
    }
  }, [isOpen, initialAlias, initialCatalogItem]);

  const filteredCatalog = React.useMemo(() => {
    if (!searchFilter.trim()) return allItems.slice(0, 15);
    const q = searchFilter.toLowerCase();
    return allItems
      .filter(i => i.cod_arti.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q))
      .slice(0, 20);
  }, [searchFilter, allItems]);

  const selectedItem = allItems.find(i => i.cod_arti === selectedCodArti);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasText.trim() || !selectedCodArti) return;

    addOrUpdateAlias(aliasText.trim(), selectedCodArti, note, true);
    onAliasSaved(aliasText.trim(), selectedCodArti);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                Vincular Jerga / Alias
              </h3>
              <p className="text-xs text-neutral-500">
                Asocia un modismo a un código oficial del catálogo
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Alias Term */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Jerga o Modismo a Mapear
            </label>
            <input
              type="text"
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              placeholder="Ej: drano, franks, teflon 3/4..."
              required
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Selected Item Preview */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Artículo Oficial Vinculado
            </label>
            {selectedItem ? (
              <div className="p-3.5 rounded-lg border border-neutral-300 bg-neutral-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-neutral-900 text-white">
                      {selectedItem.cod_arti}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900">
                      {selectedItem.descripcion}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                    Stock: {selectedItem.stock} {selectedItem.unidad || 'UND'} • {selectedItem.familia}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCodArti('')}
                  className="text-xs font-semibold text-neutral-900 underline shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar artículo por nombre o código..."
                    className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>

                <div className="border border-neutral-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-neutral-100 bg-white">
                  {filteredCatalog.map(item => (
                    <div
                      key={item.cod_arti}
                      onClick={() => setSelectedCodArti(item.cod_arti)}
                      className="p-2 hover:bg-neutral-100 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-200">
                          {item.cod_arti}
                        </span>
                        <span className="text-neutral-800 font-medium truncate max-w-[280px]">
                          {item.descripcion}
                        </span>
                      </div>
                      <span className="text-neutral-400 font-mono text-[11px]">
                        {item.stock} {item.unidad || 'UND'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Nota u Observación (Opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Modismo usado en almacén central"
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!aliasText.trim() || !selectedCodArti}
              className="px-5 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Alias</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
