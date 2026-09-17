import * as XLSX from 'xlsx';
import { ParsedLineResult } from '../types';
import { TechnicianOrder } from './technicianOrderService';

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

  ws['!cols'] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 22 },
    { wch: 15 },
    { wch: 14 },
    { wch: 40 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido Normalizado');
  XLSX.writeFile(wb, filename);
};

/**
 * Export results to CSV file with UTF-8 BOM
 */
export const exportToCSV = (results: ParsedLineResult[], filename = 'Pedido_Normalizado_Stock.csv') => {
  const selected = results.filter(r => r.selected);
  if (selected.length === 0) return;

  const headers = [
    '#',
    'Texto Original',
    'Término Detectado',
    'Cant. Solicitada',
    'Cód. Artículo',
    'Descripción Oficial',
    'Familia',
    'Unidad Medida',
    'Stock Disponible',
    'Estado Stock',
    'Ubicación Almacén',
    'Nivel Confianza',
    'Similitud (%)',
    'Método Coincidencia'
  ];

  const rows = selected.map((r, idx) => {
    const item = r.matchedItem;
    const stock = item ? item.stock : 0;
    const stockStatus = !item
      ? 'NO IDENTIFICADO'
      : stock >= r.requestedQty
      ? 'STOCK SUFICIENTE'
      : stock > 0
      ? 'STOCK PARCIAL'
      : 'SIN STOCK';

    return [
      idx + 1,
      `"${r.rawLine.replace(/"/g, '""')}"`,
      `"${r.detectedTerm.replace(/"/g, '""')}"`,
      r.requestedQty,
      `"${item ? item.cod_arti : 'N/A'}"`,
      `"${(item ? item.descripcion : 'NO ENCONTRADO').replace(/"/g, '""')}"`,
      `"${(item?.familia || '').replace(/"/g, '""')}"`,
      `"${(item?.unidad || '').replace(/"/g, '""')}"`,
      stock,
      `"${stockStatus}"`,
      `"${(item?.ubicacion || '').replace(/"/g, '""')}"`,
      `"${r.confidenceLevel.toUpperCase()}"`,
      `"${r.matchScore}%"`,
      `"${r.matchType}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export a single Technician Order to Excel (.xlsx)
 */
export const exportTechnicianOrderToExcel = (order: TechnicianOrder) => {
  const rows = order.items.map((item, idx) => ({
    '#': idx + 1,
    'N° Pedido': order.orderNumber,
    'Técnico': order.technicianName,
    'OT (Orden de Trabajo)': order.workOrder || '',
    'Sede / Llegada': order.destination || '',
    'Fecha': new Date(order.createdAt).toLocaleString('es-PE'),
    'Cód. Artículo': item.cod_arti,
    'Descripción': item.descripcion,
    'Cant. Solicitada': item.quantity,
    'Unidad': item.unidad,
    'Ubicación Almacén': item.ubicacion || 'S/U',
    'Estado': order.status.toUpperCase(),
    'Nota / Observación': order.note || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitud');
  const cleanTech = order.technicianName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${order.orderNumber}_${cleanTech}.xlsx`);
};

/**
 * Export a single Technician Order to CSV
 */
export const exportTechnicianOrderToCSV = (order: TechnicianOrder) => {
  const headers = ['#', 'N° Pedido', 'Técnico', 'OT', 'Sede/Llegada', 'Fecha', 'Cód. Artículo', 'Descripción', 'Cant. Solicitada', 'Unidad', 'Ubicación', 'Estado', 'Nota'];
  const rows = order.items.map((item, idx) => [
    idx + 1,
    `"${order.orderNumber}"`,
    `"${order.technicianName}"`,
    `"${(order.workOrder || '').replace(/"/g, '""')}"`,
    `"${(order.destination || '').replace(/"/g, '""')}"`,
    `"${new Date(order.createdAt).toLocaleString('es-PE')}"`,
    `"${item.cod_arti}"`,
    `"${item.descripcion.replace(/"/g, '""')}"`,
    item.quantity,
    `"${item.unidad}"`,
    `"${item.ubicacion || ''}"`,
    `"${order.status.toUpperCase()}"`,
    `"${(order.note || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanTech = order.technicianName.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${order.orderNumber}_${cleanTech}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export All Technician Orders to Excel (.xlsx)
 */
export const exportAllOrdersToExcel = (orders: TechnicianOrder[]) => {
  if (orders.length === 0) return;

  const rows: any[] = [];
  orders.forEach((order) => {
    order.items.forEach((item, idx) => {
      rows.push({
        'N° Pedido': order.orderNumber,
        'Técnico': order.technicianName,
        'OT': order.workOrder || '',
        'Sede / Llegada': order.destination || '',
        'Fecha': new Date(order.createdAt).toLocaleString('es-PE'),
        'Estado': order.status === 'pending' ? 'PENDIENTE' : 'ATENDIDO',
        '# Ítem': idx + 1,
        'Cód. Artículo': item.cod_arti,
        'Descripción': item.descripcion,
        'Cant. Solicitada': item.quantity,
        'Unidad': item.unidad,
        'Ubicación Almacén': item.ubicacion || 'S/U',
        'Nota': order.note || ''
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Todas las Solicitudes');
  XLSX.writeFile(wb, `Solicitudes_Almacen_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
