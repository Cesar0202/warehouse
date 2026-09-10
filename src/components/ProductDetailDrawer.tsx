import React from 'react';
import { 
  Package, 
  X, 
  Edit3, 
  BookmarkPlus, 
  Copy,
  Tag,
  MapPin,
  Layers,
  FolderTree
} from 'lucide-react';
import { CatalogItem } from '../types';
import { getAliases } from '../services/aliasService';

interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogItem | null;
  onOpenEdit: (product: CatalogItem) => void;
  onOpenCreateAlias: (product: CatalogItem) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  onOpenEdit,
  onOpenCreateAlias,
  onShowToast
}) => {
  if (!isOpen || !product) return null;

  const aliases = getAliases().filter(
    a => a.cod_arti.toUpperCase().trim() === product.cod_arti.toUpperCase().trim()
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('info', `Copiado: ${label}`, text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end font-sans">
      <div className="w-full max-w-md bg-white border-l border-neutral-300 shadow-2xl h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 bg-neutral-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded bg-neutral-900 text-white">
                {product.cod_arti}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(product.cod_arti, 'Código')}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded transition-colors"
                title="Copiar código"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mt-1.5 font-mono">
              Ficha Técnica de Inventario
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Descripción Oficial
            </span>
            <p className="text-lg font-bold text-neutral-900 leading-snug">{product.descripcion}</p>
          </div>

          {/* Stock Card */}
          <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Stock Disponible
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-mono font-bold text-neutral-900">{product.stock}</span>
                <span className="text-xs text-neutral-500 uppercase font-mono">{product.unidad || 'UND'}</span>
              </div>
            </div>

            <div>
              <span className="px-3 py-1 rounded font-mono text-xs font-bold bg-neutral-200 text-neutral-900 border border-neutral-300">
                {product.stock > 0 ? 'DISPONIBLE' : 'AGOTADO'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Detalles de Almacén
            </span>

            <div className="bg-neutral-50 rounded-xl border border-neutral-200 divide-y divide-neutral-200 text-xs">
              <div className="p-3 flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-neutral-400" />
                  Familia:
                </span>
                <span className="font-semibold text-neutral-900">{product.familia || 'Sin familia'}</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-neutral-400" />
                  Unidad:
                </span>
                <span className="font-semibold text-neutral-900 font-mono">{product.unidad || 'UND'}</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  Ubicación:
                </span>
                <span className="font-semibold text-neutral-900 font-mono">{product.ubicacion || 'Sin asignar'}</span>
              </div>
            </div>
          </div>

          {/* Aliases Registered for this Item */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Jergas / Alias Registrados ({aliases.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateAlias(product);
                }}
                className="text-xs text-neutral-900 hover:underline font-semibold flex items-center gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>+ Nuevo</span>
              </button>
            </div>

            {aliases.length === 0 ? (
              <div className="p-4 border border-neutral-200 border-dashed rounded-lg text-center text-xs text-neutral-400 font-mono">
                No hay jergas o alias registrados para este artículo.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {aliases.map((a, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold"
                  >
                    {a.alias}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-neutral-200 bg-neutral-50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEdit(product);
            }}
            className="flex-1 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Modificar Stock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateAlias(product);
            }}
            className="px-4 py-2.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Alias</span>
          </button>
        </div>
      </div>
    </div>
  );
};
