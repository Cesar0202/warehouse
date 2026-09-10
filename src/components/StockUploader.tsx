import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import { CatalogItem } from '../types';
import { parseExcelCatalogFile, saveCustomCatalog, resetToDefaultCatalog } from '../services/catalogService';

interface StockUploaderProps {
  onCatalogUpdated: (items: CatalogItem[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const StockUploader: React.FC<StockUploaderProps> = ({
  onCatalogUpdated,
  onShowToast
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedItems, setParsedItems] = useState<CatalogItem[] | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      onShowToast('error', 'Formato no soportado', 'Selecciona un archivo Excel (.xlsx, .xls) o CSV.');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const items = await parseExcelCatalogFile(file);
      if (items.length === 0) {
        throw new Error('No se detectaron registros válidos con Cod.Arti.');
      }
      setParsedItems(items);
      onShowToast('info', 'Archivo analizado', `${items.length.toLocaleString()} artículos identificados.`);
    } catch (error: any) {
      console.error(error);
      onShowToast('error', 'Error al procesar archivo', error.message || 'Verifica el formato del Excel.');
      setParsedItems(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyUpdate = () => {
    if (!parsedItems) return;
    saveCustomCatalog(parsedItems);
    onCatalogUpdated(parsedItems);
    onShowToast('success', '¡Inventario actualizado!', `Se cargaron ${parsedItems.length.toLocaleString()} artículos.`);
    setParsedItems(null);
  };

  const handleResetToDefault = async () => {
    if (confirm('¿Restablecer el inventario al catálogo maestro original de Septiembre (4,337 artículos)?')) {
      const defaults = await resetToDefaultCatalog();
      onCatalogUpdated(defaults);
      onShowToast('success', 'Catálogo restablecido', 'Se restauró el listado de stock inicial.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Cargar Archivo Excel & Actualizar Stock
        </h2>
        <p className="text-xs text-neutral-500 max-w-lg mx-auto">
          Procesamiento seguro 100% en tu navegador. Tus datos no se envían a servidores externos.
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileProcess(file);
        }}
        className={`p-10 sm:p-14 bg-white rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-4 ${
          isDragging
            ? 'border-neutral-900 bg-neutral-100'
            : 'border-neutral-300 hover:border-neutral-400 shadow-sm'
        }`}
      >
        <div className="w-14 h-14 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center shadow-sm">
          <FileSpreadsheet className="w-7 h-7" />
        </div>

        <div>
          <h3 className="font-bold text-base text-neutral-900">
            Arrastra el archivo aquí o haz clic para seleccionarlo
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Compatible con libros oficiales de inventario (.xlsx, .xls o .csv)
          </p>
        </div>

        <label className="px-5 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          <span>Seleccionar archivo Excel</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileProcess(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 animate-pulse mt-2">
            <div className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            <span>Leyendo y analizando celdas del Excel...</span>
          </div>
        )}
      </div>

      {/* Parsed Preview Card */}
      {parsedItems && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900">
                  {fileName}
                </h4>
                <p className="text-xs text-neutral-500 font-mono">
                  {parsedItems.length.toLocaleString()} artículos válidos detectados
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyUpdate}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar y Actualizar Catálogo</span>
            </button>
          </div>

          <div className="text-xs text-neutral-600">
            Muestra previa de los primeros 5 registros:
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-neutral-100 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Descripción</th>
                  <th className="p-2.5">Familia</th>
                  <th className="p-2.5 text-center">Stock</th>
                  <th className="p-2.5 text-center">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {parsedItems.slice(0, 5).map((item) => (
                  <tr key={item.cod_arti}>
                    <td className="p-2.5 font-mono font-bold text-neutral-900">{item.cod_arti}</td>
                    <td className="p-2.5 font-medium text-neutral-900">{item.descripcion}</td>
                    <td className="p-2.5 text-neutral-500">{item.familia || '-'}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-neutral-900">{item.stock}</td>
                    <td className="p-2.5 text-center text-neutral-500">{item.ubicacion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore to Default Box */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
            Restablecer al Catálogo Original
          </h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            Restaura la base de datos oficial de Septiembre (4,337 artículos).
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Catálogo Base</span>
        </button>
      </div>
    </div>
  );
};
