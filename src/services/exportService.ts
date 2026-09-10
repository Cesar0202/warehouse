import * as XLSX from 'xlsx';
import { ParsedLineResult } from '../types';

/**
 * Format results as a clean WhatsApp / Email message
 */
export const formatAsCleanText = (results: ParsedLineResult[]): string => {
  const selected = results.filter(r => r.selected);
  if (selected.length === 0) return 'No hay artículos seleccionados para despachar.';

  const lines: string[] = [];
  lines.push('📦 *PEDIDO NORMALIZADO Y CONSULTA DE STOCK*');
  lines.push(`📅 *Fecha:* ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let sufficientCount = 0;
  let insufficientCount = 0;

  selected.forEach((item, idx) => {
    if (item.matchedItem) {
      const stockAvailable = item.matchedItem.stock;
      const hasStock = stockAvailable >= item.requestedQty;
      const stockEmoji = hasStock ? '✅' : '⚠️';
      if (hasStock) sufficientCount++;
      else insufficientCount++;

      lines.push(
        `${idx + 1}. [${item.matchedItem.cod_arti}] *${item.matchedItem.descripcion}*\n` +
        `   • Cant. Solicitada: *${item.requestedQty}* ${item.matchedItem.unidad || 'UND'}\n` +
        `   • Stock Actual: ${stockEmoji} *${stockAvailable}* | Ubicación: ${item.matchedItem.ubicacion || 'S/U'}\n` +
        `   • Solicitado como: _"${item.rawLine}"_`
      );
    } else {
      insufficientCount++;
      lines.push(
        `${idx + 1}. ❌ *NO IDENTIFICADO*: "${item.rawLine}"\n` +
        `   • Cant. Solicitada: *${item.requestedQty}*`
      );
    }
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`📊 *Resumen:* ${selected.length} ítems (${sufficientCount} con stock suficiente, ${insufficientCount} con observación)`);

  return lines.join('\n');
};

/**
 * Export results to Excel (.xlsx) file
 */
export const exportToExcel = (results: ParsedLineResult[], filename = 'Pedido_Normalizado_Stock.xlsx') => {
  const selected = results.filter(r => r.selected);
  if (selected.length === 0) return;

  const excelRows = selected.map((r, idx) => {
    const item = r.matchedItem;
    const stock = item ? item.stock : 0;
    const stockStatus = !item
      ? 'NO IDENTIFICADO'
      : stock >= r.requestedQty
      ? 'STOCK SUFICIENTE'
      : stock > 0
      ? 'STOCK PARCIAL'
      : 'SIN STOCK';

    return {
      '#': idx + 1,
      'Texto Original': r.rawLine,
      'Término Detectado': r.detectedTerm,
      'Cant. Solicitada': r.requestedQty,
      'Cód. Artículo': item ? item.cod_arti : 'N/A',
      'Descripción Oficial': item ? item.descripcion : 'NO ENCONTRADO',
      'Familia': item ? item.familia : '',
      'Unidad Medida': item ? item.unidad : '',
      'Stock Disponible': stock,
      'Estado Stock': stockStatus,
      'Ubicación Almacén': item ? item.ubicacion : '',
      'Nivel Confianza': r.confidenceLevel.toUpperCase(),
      'Similitud (%)': `${r.matchScore}%`,
      'Método Coincidencia': r.matchType
    };
  });

  const ws = XLSX.utils.json_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 30 }, // Texto Original
    { wch: 22 }, // Término Detectado
    { wch: 15 }, // Cant. Solicitada
    { wch: 14 }, // Cód. Artículo
    { wch: 40 }, // Descripción Oficial
    { wch: 20 }, // Familia
    { wch: 18 }, // Unidad
    { wch: 16 }, // Stock
    { wch: 18 }, // Estado Stock
    { wch: 18 }, // Ubicación
    { wch: 15 }, // Confianza
    { wch: 14 }, // Similitud
    { wch: 20 }  // Método
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido Normalizado');

  XLSX.writeFile(wb, filename);
};

/**
 * Export results to CSV file
 */
export const exportToCSV = (results: ParsedLineResult[], filename = 'pedido_normalizado.csv') => {
  const selected = results.filter(r => r.selected);
  if (selected.length === 0) return;

  const headers = [
    'Item',
    'Texto Original',
    'Termino Detectado',
    'Cantidad Solicitada',
    'Cod. Arti',
    'Descripcion Oficial',
    'Familia',
    'Unidad',
    'Stock Disponible',
    'Estado Stock',
    'Ubicacion',
    'Confianza',
    'Similitud'
  ];

  const csvRows = [
    headers.join(';'),
    ...selected.map((r, idx) => {
      const item = r.matchedItem;
      const stock = item ? item.stock : 0;
      const stockStatus = !item ? 'NO IDENTIFICADO' : stock >= r.requestedQty ? 'SUFICIENTE' : 'INSUFICIENTE';

      return [
        idx + 1,
        `"${(r.rawLine || '').replace(/"/g, '""')}"`,
        `"${(r.detectedTerm || '').replace(/"/g, '""')}"`,
        r.requestedQty,
        `"${item?.cod_arti || ''}"`,
        `"${(item?.descripcion || '').replace(/"/g, '""')}"`,
        `"${(item?.familia || '').replace(/"/g, '""')}"`,
        `"${(item?.unidad || '').replace(/"/g, '""')}"`,
        stock,
        `"${stockStatus}"`,
        `"${item?.ubicacion || ''}"`,
        `"${r.confidenceLevel}"`,
        `"${r.matchScore}%"`
      ].join(';');
    })
  ];

  const blob = new Blob(['\ufeff' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
