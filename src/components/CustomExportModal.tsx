import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  Check, 
  Download, 
  CheckSquare, 
  Square,
  Sliders,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CatalogItem } from '../types';

export interface ExportColumnConfig {
  id: string;
  label: string;
  defaultHeader: string;
  enabled: boolean;
  getter: (item: CatalogItem, index: number) => any;
  width: number;
}

interface CustomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredItems: CatalogItem[];
  allItems: CatalogItem[];
  selectedItems?: CatalogItem[];
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const CustomExportModal: React.FC<CustomExportModalProps> = ({
  isOpen,
  onClose,
  filteredItems,
  allItems,
  selectedItems = [],
  onShowToast
}) => {
  const [exportScope, setExportScope] = useState<'filtered' | 'selected' | 'all'>('filtered');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [fileName, setFileName] = useState(`Inventario_Stock_${new Date().toISOString().slice(0, 10)}`);

  const [columns, setColumns] = useState<ExportColumnConfig[]>([
    {
      id: 'num',
      label: 'Número correlativo (#)',
      defaultHeader: '#',
      enabled: true,
      getter: (_, idx) => idx + 1,
      width: 6
    },
    {
      id: 'cod_arti',
      label: 'Código de Artículo (Cod.Arti.)',
      defaultHeader: 'Cod.Arti.',
      enabled: true,
      getter: (item) => item.cod_arti,
      width: 14
    },
    {
      id: 'descripcion',
      label: 'Descripción Oficial',
      defaultHeader: 'Descripción',
      enabled: true,
      getter: (item) => item.descripcion,
      width: 42
    },
    {
      id: 'familia',
      label: 'Familia / Categoría',
      defaultHeader: 'Familia',
      enabled: true,
      getter: (item) => item.familia || 'SIN FAMILIA',
      width: 22
    },
    {
      id: 'unidad',
      label: 'Unidad de Medida',
      defaultHeader: 'Unidad de Medida',
      enabled: true,
      getter: (item) => item.unidad || 'UND',
      width: 18
    },
    {
      id: 'stock',
      label: 'Stock Actual Disponible',
      defaultHeader: 'Stock',
      enabled: true,
      getter: (item) => item.stock,
      width: 14
    },
    {
      id: 'estado_stock',
      label: 'Estado de Disponibilidad',
      defaultHeader: 'Estado Stock',
      enabled: true,
      getter: (item) => (item.stock > 0 ? 'DISPONIBLE' : 'AGOTADO'),
      width: 16
    },
    {
      id: 'ubicacion',
      label: 'Ubicación en Almacén',
      defaultHeader: 'Ubicación',
      enabled: true,
      getter: (item) => item.ubicacion || 'S/U',
      width: 16
    },
    {
      id: 'fecha_export',
      label: 'Fecha y Hora de Generación',
      defaultHeader: 'Fecha Consulta',
      enabled: false,
      getter: () => new Date().toLocaleString(),
      width: 20
    }
  ]);

  if (!isOpen) return null;

  const targetDataset = 
    exportScope === 'selected' && selectedItems.length > 0 
      ? selectedItems 
      : exportScope === 'all' 
      ? allItems 
      : filteredItems;

  const handleToggleColumn = (id: string) => {
    setColumns(prev =>
      prev.map(col => (col.id === id ? { ...col, enabled: !col.enabled } : col))
    );
  };

  const handleSelectAllColumns = (enabled: boolean) => {
    setColumns(prev => prev.map(col => ({ ...col, enabled })));
  };

  const handleUpdateHeader = (id: string, newHeader: string) => {
    setColumns(prev =>
      prev.map(col => (col.id === id ? { ...col, defaultHeader: newHeader } : col))
    );
  };

  const handleExecuteExport = () => {
    const activeCols = columns.filter(c => c.enabled);
    if (activeCols.length === 0) {
      onShowToast('warning', 'Selecciona al menos una columna');
      return;
    }

    if (targetDataset.length === 0) {
      onShowToast('warning', 'No hay registros en el alcance seleccionado');
      return;
    }

    // Build tabular array
    const dataToExport = targetDataset.map((item, idx) => {
      const row: Record<string, any> = {};
      activeCols.forEach(col => {
        row[col.defaultHeader] = col.getter(item, idx);
      });
      return row;
    });

    if (exportFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Auto-fit column widths
      worksheet['!cols'] = activeCols.map(col => ({ wch: col.width || 15 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

      const safeName = (fileName.trim() || 'Inventario_Stock') + '.xlsx';
      XLSX.writeFile(workbook, safeName);
      onShowToast('success', 'Archivo Excel exportado', `Descargado: ${safeName}`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', (fileName.trim() || 'Inventario_Stock') + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('success', 'Archivo CSV exportado');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">
                Exportar Reporte Personalizado
              </h3>
              <p className="text-xs text-neutral-500">
                Configura columnas, formato y registros a exportar
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* File Name & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Nombre del Archivo
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Formato
              </label>
              <div className="flex rounded-lg bg-neutral-100 p-1 text-xs font-semibold border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    exportFormat === 'xlsx'
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    exportFormat === 'csv'
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
              Alcance de Registros
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  exportScope === 'filtered'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                }`}
              >
                <p className="text-xs font-bold">Vista Filtrada</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">{filteredItems.length.toLocaleString()} ítems</p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('selected')}
                disabled={selectedItems.length === 0}
                className={`p-3 rounded-lg border text-left transition-all disabled:opacity-40 ${
                  exportScope === 'selected'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                }`}
              >
                <p className="text-xs font-bold">Seleccionados</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">{selectedItems.length} ítems</p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  exportScope === 'all'
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                }`}
              >
                <p className="text-xs font-bold">Todo el Catálogo</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">{allItems.length.toLocaleString()} ítems</p>
              </button>
            </div>
          </div>

          {/* Column Chooser */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Selección de Columnas y Encabezados
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAllColumns(true)}
                  className="text-neutral-900 hover:underline font-semibold"
                >
                  Todas
                </button>
                <span className="text-neutral-300">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllColumns(false)}
                  className="text-neutral-500 hover:underline font-medium"
                >
                  Ninguna
                </button>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-56 overflow-y-auto bg-neutral-50/50">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2.5 hover:bg-neutral-100 transition-colors"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-neutral-800 font-medium flex-1">
                    <input
                      type="checkbox"
                      checked={col.enabled}
                      onChange={() => handleToggleColumn(col.id)}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300"
                    />
                    <span>{col.label}</span>
                  </label>

                  {col.enabled && (
                    <input
                      type="text"
                      value={col.defaultHeader}
                      onChange={(e) => handleUpdateHeader(col.id, e.target.value)}
                      placeholder="Cabecera..."
                      className="w-36 px-2 py-1 bg-white border border-neutral-300 rounded text-xs font-mono font-semibold text-neutral-800 focus:border-neutral-900 outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs text-neutral-500 font-mono">
            Exportar: {targetDataset.length.toLocaleString()} filas • {columns.filter(c => c.enabled).length} columnas
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
