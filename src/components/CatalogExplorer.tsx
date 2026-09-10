import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Layers, 
  MapPin, 
  Copy, 
  BookmarkPlus, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  Plus,
  Minus,
  ArrowUpDown,
  Check,
  Package
} from 'lucide-react';
import { CatalogItem } from '../types';
import { searchCatalogFuzzy, updateProductStock } from '../services/catalogService';
import { CustomExportModal } from './CustomExportModal';

interface CatalogExplorerProps {
  catalog: CatalogItem[];
  onOpenEditModal: (product: CatalogItem) => void;
  onOpenDetailDrawer: (product: CatalogItem) => void;
  onOpenAliasModalForCatalogItem: (item: CatalogItem) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

type SortField = 'cod_arti' | 'descripcion' | 'familia' | 'stock' | 'ubicacion';
type SortOrder = 'asc' | 'desc';

export const CatalogExplorer: React.FC<CatalogExplorerProps> = ({
  catalog,
  onOpenEditModal,
  onOpenDetailDrawer,
  onOpenAliasModalForCatalogItem,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('ALL');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('cod_arti');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [hasUserSorted, setHasUserSorted] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selection for export
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Unique families and locations
  const families = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(item => {
      if (item.familia) set.add(item.familia);
    });
    return Array.from(set).sort();
  }, [catalog]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(item => {
      if (item.ubicacion) set.add(item.ubicacion);
    });
    return Array.from(set).sort();
  }, [catalog]);

  // Filtering
  const filteredItems = useMemo(() => {
    let list: CatalogItem[] = [];

    if (searchTerm.trim().length >= 1) {
      const q = searchTerm.trim().toUpperCase();
      const codeMatches = catalog.filter(i => i.cod_arti.toUpperCase().includes(q));
      if (codeMatches.length > 0 && q.length >= 2) {
        list = codeMatches;
      } else {
        const fuzzy = searchCatalogFuzzy(searchTerm, 300);
        list = fuzzy.map(f => f.item);
      }
    } else {
      list = [...catalog];
    }

    if (selectedFamily !== 'ALL') {
      list = list.filter(item => item.familia === selectedFamily);
    }

    if (selectedLocation !== 'ALL') {
      list = list.filter(item => item.ubicacion === selectedLocation);
    }

    if (stockFilter === 'IN_STOCK') {
      list = list.filter(item => item.stock > 0);
    } else if (stockFilter === 'OUT_OF_STOCK') {
      list = list.filter(item => item.stock <= 0);
    } else if (stockFilter === 'LOW_STOCK') {
      list = list.filter(item => item.stock > 0 && item.stock <= 5);
    }

    // Sort: if searching, maintain search relevance score unless user clicked a sort header
    if (!searchTerm.trim()) {
      list.sort((a, b) => {
        let valA: any = a[sortField] ?? '';
        let valB: any = b[sortField] ?? '';

        if (sortField === 'stock') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (hasUserSorted) {
      list.sort((a, b) => {
        let valA: any = a[sortField] ?? '';
        let valB: any = b[sortField] ?? '';

        if (sortField === 'stock') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [catalog, searchTerm, selectedFamily, selectedLocation, stockFilter, sortField, sortOrder, hasUserSorted]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    setHasUserSorted(true);
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleQuickStockChange = (codArti: string, delta: number, currentStock: number) => {
    const nextVal = Math.max(0, currentStock + delta);
    updateProductStock(codArti, nextVal);
    onShowToast('info', `Stock [${codArti}]`, `${currentStock} -> ${nextVal}`);
  };

  const toggleSelectRow = (codArti: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(codArti)) next.delete(codArti);
      else next.add(codArti);
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    const allSelected = paginatedItems.every(i => selectedCodes.has(i.cod_arti));
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (allSelected) {
        paginatedItems.forEach(i => next.delete(i.cod_arti));
      } else {
        paginatedItems.forEach(i => next.add(i.cod_arti));
      }
      return next;
    });
  };

  const selectedItemsList = useMemo(() => {
    return catalog.filter(i => selectedCodes.has(i.cod_arti));
  }, [catalog, selectedCodes]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('info', `Copiado: ${label}`, text);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Export Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Catálogo Maestro & Control de Stock
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {catalog.length.toLocaleString()} artículos registrados en base de datos local
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel Personalizado</span>
            {selectedCodes.size > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-neutral-900 rounded font-mono text-[10px] font-bold">
                {selectedCodes.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por código (ej. CUR06) o descripción..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Family Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedFamily}
              onChange={(e) => {
                setSelectedFamily(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            >
              <option value="ALL">Todas las familias ({families.length})</option>
              {families.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            >
              <option value="ALL">Ubicación ({locations.length})</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="sm:col-span-2">
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            >
              <option value="ALL">Todo el stock</option>
              <option value="IN_STOCK">Con Stock (&gt;0)</option>
              <option value="LOW_STOCK">Stock Crítico (&le;5)</option>
              <option value="OUT_OF_STOCK">Agotados (0)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Selection Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs text-neutral-500">
          <div>
            Mostrando <span className="font-semibold text-neutral-900">{filteredItems.length.toLocaleString()}</span> resultados filtrados.
          </div>
          <div className="flex items-center gap-3">
            {selectedCodes.size > 0 && (
              <span className="text-neutral-900 font-semibold font-mono">
                {selectedCodes.size} seleccionados
              </span>
            )}
            <div className="flex items-center gap-1">
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-xs font-semibold text-neutral-800 outline-none"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Table Card */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-neutral-800">
            <thead className="bg-neutral-100 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedCodes.has(i.cod_arti))}
                    onChange={toggleSelectAllCurrentPage}
                    className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300 cursor-pointer"
                  />
                </th>
                <th 
                  onClick={() => handleSort('cod_arti')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 min-w-[120px]"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>CÓDIGO</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('descripcion')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 min-w-[280px]"
                >
                  <div className="flex items-center gap-1">
                    <span>DESCRIPCIÓN OFICIAL</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('familia')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>FAMILIA</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('stock')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-neutral-900 min-w-[170px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STOCK ACTUAL</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('ubicacion')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-neutral-900 w-24"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>UBICACIÓN</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right min-w-[130px]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-sans">
              {paginatedItems.map((item) => {
                const isSelected = selectedCodes.has(item.cod_arti);
                return (
                  <tr
                    key={item.cod_arti}
                    className={`hover:bg-neutral-50 transition-colors ${
                      isSelected ? 'bg-neutral-100/70' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(item.cod_arti)}
                        className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300 cursor-pointer"
                      />
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetailDrawer(item)}
                          className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors border border-neutral-300"
                        >
                          {item.cod_arti}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.cod_arti, 'Código')}
                          className="text-neutral-400 hover:text-neutral-900 p-1 rounded transition-colors"
                          title="Copiar código"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3">
                      <p 
                        onClick={() => onOpenDetailDrawer(item)}
                        className="font-semibold text-neutral-900 cursor-pointer hover:underline leading-snug"
                      >
                        {item.descripcion}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5 font-mono">
                        <span>Unidad: {item.unidad || 'UND'}</span>
                      </div>
                    </td>

                    {/* Family */}
                    <td className="py-3 px-3">
                      <span className="text-xs text-neutral-600 font-medium">
                        {item.familia || 'SIN FAMILIA'}
                      </span>
                    </td>

                    {/* Stock with quick buttons */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(item.cod_arti, -1, item.stock)}
                          disabled={item.stock <= 0}
                          className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30"
                          title="Disminuir 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenEditModal(item)}
                          className={`px-3 py-0.5 rounded font-mono font-bold text-xs border min-w-[54px] text-center transition-all ${
                            item.stock > 0
                              ? 'bg-neutral-100 text-neutral-900 border-neutral-300 hover:bg-neutral-200'
                              : 'bg-white text-neutral-400 border-neutral-200 line-through hover:bg-neutral-50'
                          }`}
                          title="Clic para editar stock"
                        >
                          {item.stock}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(item.cod_arti, 1, item.stock)}
                          className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 flex items-center justify-center text-xs font-bold transition-all"
                          title="Aumentar 1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3 text-center">
                      {item.ubicacion ? (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">
                          {item.ubicacion}
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(item)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          title="Editar producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAliasModalForCatalogItem(item)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          title="Agregar alias a este producto"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 sm:px-5 border-t border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-neutral-600 font-medium">
            Página <span className="font-bold text-neutral-900 font-mono">{currentPage}</span> de <span className="font-bold text-neutral-900 font-mono">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 rounded-lg hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 rounded-lg hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 font-semibold"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <CustomExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filteredItems={filteredItems}
        allItems={catalog}
        selectedItems={selectedItemsList}
        onShowToast={onShowToast}
      />
    </div>
  );
};
