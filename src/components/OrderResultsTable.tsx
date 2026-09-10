import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  FileSpreadsheet, 
  Share2, 
  Edit3, 
  BookmarkPlus, 
  Trash2, 
  MapPin, 
  Printer,
  Download,
  Bot,
  Sparkles,
  Check,
  Layers,
  CheckCircle,
  Clock,
  HelpCircle,
  PackageCheck,
  PackageX
} from 'lucide-react';
import { ParsedLineResult, AISuggestion } from '../types';
import { formatAsCleanText, exportToExcel, exportToCSV } from '../services/exportService';
import { PrintDispatchModal } from './PrintDispatchModal';
import { PrintableDispatchSheet } from './PrintableDispatchSheet';

interface OrderResultsTableProps {
  results: ParsedLineResult[];
  onUpdateResult: (id: string, updated: Partial<ParsedLineResult>) => void;
  onDeleteResult: (id: string) => void;
  onOpenCatalogSearch: (lineResult: ParsedLineResult) => void;
  onOpenAliasModal: (lineResult: ParsedLineResult) => void;
  onDecipherLineWithAI: (lineResult: ParsedLineResult) => Promise<void>;
  onDecipherAllUnresolvedWithAI: () => Promise<void>;
  onAcceptAISuggestion: (lineResult: ParsedLineResult, suggestion: AISuggestion) => void;
  isDecipheringBatch: boolean;
  hasAIKey: boolean;
  onOpenAISettings: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const OrderResultsTable: React.FC<OrderResultsTableProps> = ({
  results,
  onUpdateResult,
  onDeleteResult,
  onOpenCatalogSearch,
  onOpenAliasModal,
  onDecipherLineWithAI,
  onDecipherAllUnresolvedWithAI,
  onAcceptAISuggestion,
  isDecipheringBatch,
  hasAIKey,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'UNRESOLVED'>('ALL');
  const [copiedText, setCopiedText] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Statistics calculation
  const totalItems = results.length;
  const highConfidence = results.filter(r => r.confidenceLevel === 'high').length;
  const mediumConfidence = results.filter(r => r.confidenceLevel === 'medium').length;
  const lowConfidence = results.filter(r => r.confidenceLevel === 'low').length;

  const sufficientStock = results.filter(r => r.matchedItem && r.matchedItem.stock >= r.requestedQty).length;
  const insufficientStock = results.filter(r => !r.matchedItem || r.matchedItem.stock < r.requestedQty).length;

  const unresolvedCount = results.filter(r => !r.matchedItem || r.confidenceLevel === 'low' || r.confidenceLevel === 'medium').length;

  const allSelected = results.length > 0 && results.every(r => r.selected);
  const someSelected = results.some(r => r.selected);

  const handleToggleSelectAll = () => {
    const nextState = !allSelected;
    results.forEach(r => {
      onUpdateResult(r.id, { selected: nextState });
    });
  };

  const handleCopyWhatsApp = () => {
    const formatted = formatAsCleanText(results);
    navigator.clipboard.writeText(formatted);
    setCopiedText(true);
    onShowToast('success', '¡Copiado para WhatsApp!', 'Formato limpio copiado al portapapeles.');
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleExportExcel = () => {
    exportToExcel(results);
    onShowToast('success', 'Archivo Excel generado', 'Se ha descargado Pedido_Normalizado_Stock.xlsx.');
  };

  const handleExportCSV = () => {
    exportToCSV(results);
    onShowToast('success', 'Archivo CSV exportado');
  };

  const handleOpenPrint = () => {
    setIsPrintModalOpen(true);
  };

  // Filtered rows
  const filteredRows = results.filter(r => {
    if (filterStatus === 'IN_STOCK') return r.matchedItem && r.matchedItem.stock >= r.requestedQty;
    if (filterStatus === 'LOW_STOCK') return r.matchedItem && r.matchedItem.stock < r.requestedQty;
    if (filterStatus === 'UNRESOLVED') return !r.matchedItem || r.confidenceLevel === 'low' || r.confidenceLevel === 'medium';
    return true;
  });

  if (results.length === 0) return null;

  return (
    <>
      {/* SCREEN VIEW (HIDDEN ON PRINT) */}
      <div className="space-y-6 print:hidden font-sans">
        {/* Metric Cards in Formal B&W Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">TOTAL ÍTEMS</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                <Layers className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{totalItems}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">ALTA CERTEZA</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{highConfidence}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">POR REVISAR</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{mediumConfidence}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">SIN COINCIDENCIA</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{lowConfidence}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">STOCK OK</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <PackageCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{sufficientStock}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">SIN STOCK</span>
              <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-500 flex items-center justify-center">
                <PackageX className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-400 mt-2 font-mono">{insufficientStock}</p>
          </div>
        </div>

        {/* AI Callout Banner if unresolved items exist */}
        {unresolvedCount > 0 && (
          <div className="p-4 sm:p-5 bg-neutral-100 border border-neutral-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-neutral-900">
                    Agente de Homologación IA ({unresolvedCount} pendientes)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800">
                    Gemini Flash
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Descifra automáticamente jergas complejas no encontradas en el inventario o alias.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDecipherAllUnresolvedWithAI}
              disabled={isDecipheringBatch || !hasAIKey}
              className="w-full sm:w-auto px-4 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDecipheringBatch ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Descifrando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Descifrar todos con IA</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Table Card */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-hidden">
          {/* Table Top Header / Filter Controls */}
          <div className="p-4 sm:px-5 border-b border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50/70">
            <div className="flex items-center gap-3">
              <span className="font-bold text-base text-neutral-900">
                Homologación & Verificación de Stock
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-neutral-200 text-neutral-800">
                {filteredRows.length} ítems
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-neutral-200/70 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('IN_STOCK')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterStatus === 'IN_STOCK'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Con Stock
              </button>
              <button
                onClick={() => setFilterStatus('LOW_STOCK')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterStatus === 'LOW_STOCK'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Sin Stock
              </button>
              <button
                onClick={() => setFilterStatus('UNRESOLVED')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterStatus === 'UNRESOLVED'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Pendientes ({unresolvedCount})
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-neutral-800">
              <thead className="bg-neutral-100 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2 w-10 text-center font-mono">#</th>
                  <th className="py-3 px-3 min-w-[140px]">Término Detectado</th>
                  <th className="py-3 px-3 text-center w-24">Cantidad</th>
                  <th className="py-3 px-3 min-w-[110px]">Código Oficial</th>
                  <th className="py-3 px-3 min-w-[240px]">Descripción Oficial</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Stock Disponible</th>
                  <th className="py-3 px-3 min-w-[130px]">Certeza</th>
                  <th className="py-3 px-3 text-center w-24">Ubicación</th>
                  <th className="py-3 px-3 text-right min-w-[130px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredRows.map((row, idx) => {
                  const item = row.matchedItem;
                  const stock = item ? item.stock : 0;
                  const hasSufficientStock = item && stock >= row.requestedQty;
                  const hasPartialStock = item && stock > 0 && stock < row.requestedQty;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-neutral-50 transition-colors ${
                        !row.selected ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => onUpdateResult(row.id, { selected: e.target.checked })}
                          className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300 cursor-pointer"
                        />
                      </td>

                      {/* Row index */}
                      <td className="py-3 px-2 text-center font-mono text-neutral-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Detected Term */}
                      <td className="py-3 px-3">
                        <div>
                          <span className="font-semibold text-neutral-900">{row.detectedTerm}</span>
                          {row.rawLine !== row.detectedTerm && (
                            <p className="text-[11px] text-neutral-400 truncate max-w-[180px] mt-0.5 font-mono">
                              "{row.rawLine}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Qty Input */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.requestedQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            onUpdateResult(row.id, { requestedQty: val });
                          }}
                          className="w-16 text-center py-1 px-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-900 font-mono font-bold text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                        />
                      </td>

                      {/* Code */}
                      <td className="py-3 px-3">
                        {item ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-900 border border-neutral-300">
                              {item.cod_arti}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.cod_arti);
                                onShowToast('info', `Copiado: ${item.cod_arti}`);
                              }}
                              className="text-neutral-400 hover:text-neutral-900 p-1 rounded transition-colors"
                              title="Copiar código"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-neutral-400 italic">Sin código</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3">
                        {item ? (
                          <div>
                            <p className="font-semibold text-neutral-900 leading-snug">{item.descripcion}</p>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5 font-mono">
                              {item.familia && <span>{item.familia}</span>}
                              {item.unidad && <span>• {item.unidad}</span>}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-neutral-400 italic text-xs">No identificado en inventario.</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenCatalogSearch(row)}
                                className="text-xs font-medium text-neutral-900 underline underline-offset-2"
                              >
                                Buscar
                              </button>
                              <button
                                type="button"
                                onClick={() => onDecipherLineWithAI(row)}
                                disabled={row.isDecipheringAI}
                                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 hover:bg-neutral-300 transition-colors"
                              >
                                {row.isDecipheringAI ? 'IA...' : 'Descifrar IA'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* AI Suggestion Card */}
                        {row.aiSuggestion && (
                          <div className="mt-2.5 p-3 rounded-lg border border-neutral-300 bg-neutral-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-900">
                              <span className="flex items-center gap-1 font-mono">
                                Sugerencia IA ({row.aiSuggestion.confianza}%)
                              </span>
                              <span className="font-mono bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-900 font-bold">
                                [{row.aiSuggestion.cod_arti}]
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-neutral-900">{row.aiSuggestion.descripcion}</p>
                            <p className="text-[11px] text-neutral-600 italic">"{row.aiSuggestion.explicacion}"</p>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => onAcceptAISuggestion(row, row.aiSuggestion!)}
                                className="px-3 py-1 bg-neutral-900 hover:bg-black text-white font-semibold text-[11px] rounded transition-all flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Guardar como Alias</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Stock comparison badge */}
                      <td className="py-3 px-3 text-center">
                        {item ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                                hasSufficientStock
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : hasPartialStock
                                  ? 'bg-neutral-200 text-neutral-800 border-neutral-300'
                                  : 'bg-white text-neutral-400 border-neutral-200 line-through'
                              }`}
                            >
                              {stock} / {row.requestedQty}
                            </span>
                            <span className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              {hasSufficientStock ? 'Suficiente' : hasPartialStock ? 'Parcial' : 'Agotado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-3">
                        <div>
                          {row.matchType === 'ai_agent' ? (
                            <span className="px-2.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-[11px] font-bold">
                              IA ({row.matchScore}%)
                            </span>
                          ) : row.confidenceLevel === 'high' ? (
                            <span className="px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300 font-mono text-[11px] font-bold">
                              ALTA ({row.matchScore}%)
                            </span>
                          ) : row.confidenceLevel === 'medium' ? (
                            <div className="space-y-1">
                              <span className="px-2.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[11px] font-bold">
                                REVISAR ({row.matchScore}%)
                              </span>
                              {row.alternativeMatches && row.alternativeMatches.length > 0 && (
                                <select
                                  onChange={(e) => {
                                    const alt = row.alternativeMatches?.find(a => a.item.cod_arti === e.target.value);
                                    if (alt) {
                                      onUpdateResult(row.id, {
                                        matchedItem: alt.item,
                                        confidenceLevel: 'high',
                                        matchScore: alt.score,
                                        matchType: 'manual'
                                      });
                                    }
                                  }}
                                  defaultValue=""
                                  className="block w-full text-[10px] font-mono p-1 bg-white border border-neutral-300 rounded text-neutral-900"
                                >
                                  <option value="" disabled>Alternativas...</option>
                                  {row.alternativeMatches.map(alt => (
                                    <option key={alt.item.cod_arti} value={alt.item.cod_arti}>
                                      [{alt.item.cod_arti}] {alt.item.descripcion}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200 font-mono text-[11px] font-bold">
                              NO IDENTIFICADO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 text-center">
                        {item && item.ubicacion ? (
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
                            onClick={() => onDecipherLineWithAI(row)}
                            disabled={row.isDecipheringAI}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Descifrar con Agente IA"
                          >
                            <Bot className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCatalogSearch(row)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Reasignar artículo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAliasModal(row)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Guardar como alias"
                          >
                            <BookmarkPlus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteResult(row.id)}
                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded transition-colors"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Toolbar */}
          <div className="p-4 sm:px-5 border-t border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-600 font-medium">
              <span className="font-bold text-neutral-900 font-mono">{results.filter(r => r.selected).length}</span> de {results.length} artículos listos para despacho.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="px-4 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedText ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPrint}
                className="px-3.5 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                title="Imprimir vale de salida"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT VIEW (ONLY VISIBLE ON PRINT) */}
      <PrintableDispatchSheet results={results} />

      {/* Print Dispatch Setup Modal */}
      <PrintDispatchModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        results={results}
        onShowToast={onShowToast}
      />
    </>
  );
};
