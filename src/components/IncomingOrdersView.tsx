import React, { useState, useEffect } from 'react';
import {
  Package,
  User,
  Clock,
  CheckCircle2,
  Trash2,
  Printer,
  FileSpreadsheet,
  FileText,
  ClipboardCopy,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import {
  TechnicianOrder,
  getTechnicianOrders,
  fetchOrdersFromCloud,
  updateTechnicianOrderStatus,
  deleteTechnicianOrder,
  clearAllTechnicianOrders,
  TECHNICIAN_ORDERS_EVENT
} from '../services/technicianOrderService';
import {
  exportTechnicianOrderToExcel,
  exportTechnicianOrderToCSV,
  exportAllOrdersToExcel
} from '../services/exportService';

interface IncomingOrdersViewProps {
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
  onSwitchToTechnician?: () => void;
}

export const IncomingOrdersView: React.FC<IncomingOrdersViewProps> = ({
  onShowToast,
  onSwitchToTechnician
}) => {
  const [orders, setOrders] = useState<TechnicianOrder[]>(() => getTechnicianOrders());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'attended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderToPrint, setOrderToPrint] = useState<TechnicianOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const refreshOrders = async () => {
    const local = getTechnicianOrders();
    setOrders(local);
    const cloud = await fetchOrdersFromCloud();
    setOrders(cloud);
  };

  useEffect(() => {
    refreshOrders();

    const handleUpdate = () => {
      setOrders(getTechnicianOrders());
    };

    window.addEventListener(TECHNICIAN_ORDERS_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', refreshOrders);

    const interval = setInterval(() => {
      fetchOrdersFromCloud().then((res) => {
        if (Array.isArray(res)) {
          setOrders(res);
        }
      });
    }, 3000);

    return () => {
      window.removeEventListener(TECHNICIAN_ORDERS_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', refreshOrders);
      clearInterval(interval);
    };
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const latest = await fetchOrdersFromCloud();
      setOrders(latest);
      onShowToast('success', 'Bandeja sincronizada con la nube');
    } catch (e: any) {
      onShowToast('error', 'Error al sincronizar', e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleStatus = (order: TechnicianOrder) => {
    const newStatus = order.status === 'pending' ? 'attended' : 'pending';
    updateTechnicianOrderStatus(order.id, newStatus);
    setOrders(getTechnicianOrders());
    onShowToast(
      'success',
      newStatus === 'attended' ? 'Pedido marcado como Atendido' : 'Pedido marcado como Pendiente'
    );
  };

  const handleDelete = (orderId: string, orderNumber: string) => {
    if (window.confirm('¿Eliminar la solicitud ' + orderNumber + '?')) {
      deleteTechnicianOrder(orderId);
      setOrders(getTechnicianOrders());
      onShowToast('info', 'Solicitud eliminada');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas vaciar todas las solicitudes recibidas?')) {
      clearAllTechnicianOrders();
      setOrders([]);
      onShowToast('info', 'Bandeja de solicitudes vaciada');
    }
  };

  const handleCopyOrderText = (order: TechnicianOrder) => {
    const lines = [
      'SOLICITUD: ' + order.orderNumber,
      'TÉCNICO: ' + order.technicianName,
      'FECHA: ' + new Date(order.createdAt).toLocaleString('es-PE'),
      order.note ? 'NOTA: ' + order.note : '',
      '------------------------------',
      ...order.items.map(
        (it, idx) =>
          (idx + 1) + '. [' + it.cod_arti + '] ' + it.descripcion + ' - Cant: ' + it.quantity + ' ' + it.unidad +
          (it.ubicacion ? ' (Ubic: ' + it.ubicacion + ')' : '')
      ),
      '------------------------------',
      'TOTAL ARTÍCULOS: ' + order.totalItems + ' (' + order.totalUnits + ' unidades)'
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines);
    onShowToast('success', 'Detalle copiado al portapapeles');
  };

  const handlePrintOrder = (order: TechnicianOrder) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportExcel = (order: TechnicianOrder) => {
    try {
      exportTechnicianOrderToExcel(order);
      onShowToast('success', 'Excel generado con éxito', 'Solicitud ' + order.orderNumber);
    } catch (e: any) {
      onShowToast('error', 'Error al exportar Excel', e.message);
    }
  };

  const handleExportCSV = (order: TechnicianOrder) => {
    try {
      exportTechnicianOrderToCSV(order);
      onShowToast('success', 'CSV generado con éxito', 'Solicitud ' + order.orderNumber);
    } catch (e: any) {
      onShowToast('error', 'Error al exportar CSV', e.message);
    }
  };

  const handleExportAllExcel = () => {
    if (orders.length === 0) return;
    try {
      exportAllOrdersToExcel(orders);
      onShowToast('success', 'Excel con todas las solicitudes generado con éxito');
    } catch (e: any) {
      onShowToast('error', 'Error al exportar Excel', e.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTech = o.technicianName.toLowerCase().includes(q);
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchNote = (o.note || '').toLowerCase().includes(q);
      const matchItems = o.items.some(
        (i) => i.descripcion.toLowerCase().includes(q) || i.cod_arti.toLowerCase().includes(q)
      );
      return matchTech || matchNum || matchNote || matchItems;
    }
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const attendedCount = orders.filter((o) => o.status === 'attended').length;

  return (
    <div className="space-y-4 font-sans">
      {/* Printable Sheet for window.print() */}
      {orderToPrint && (
        <div className="hidden print:block print:w-full print:m-0 print:p-0 bg-white text-black font-sans leading-tight">
          <div className="border-b-2 border-black pb-2 mb-3 flex items-center justify-between text-xs font-mono">
            <div>
              <p className="text-base font-bold tracking-tight uppercase">VALE DE SALIDA / DESPACHO DE MATERIALES</p>
              <p className="text-[11px] text-neutral-800">
                N° SOLICITUD: <strong>{orderToPrint.orderNumber}</strong> | FECHA:{' '}
                {new Date(orderToPrint.createdAt).toLocaleString('es-PE')}
              </p>
              <p className="text-xs font-bold mt-1">
                TÉCNICO RESPONSABLE:{' '}
                <span className="underline uppercase">{orderToPrint.technicianName}</span>
              </p>
              {orderToPrint.note && (
                <p className="text-[11px] italic mt-0.5">Nota: {orderToPrint.note}</p>
              )}
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold">TOTAL ÍTEMS: {orderToPrint.totalItems}</span>
              <span className="block text-xs text-neutral-700 font-bold">({orderToPrint.totalUnits} Unidades)</span>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-neutral-100 border-b-2 border-black font-mono font-bold uppercase">
                <th className="border border-black py-1.5 px-2 text-center w-10">CHECK</th>
                <th className="border border-black py-1.5 px-2 text-center w-12">CANT.</th>
                <th className="border border-black py-1.5 px-2 text-left w-24">CÓDIGO</th>
                <th className="border border-black py-1.5 px-2 text-left">DESCRIPCIÓN DE MATERIAL</th>
                <th className="border border-black py-1.5 px-2 text-center w-24">UBICACIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {orderToPrint.items.map((it, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="border border-black py-1.5 px-1 text-center align-middle">
                    <div className="w-4 h-4 border border-black inline-block align-middle" />
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-mono font-bold text-sm">
                    {it.quantity}
                  </td>
                  <td className="border border-black py-1.5 px-2 font-mono font-bold text-xs">
                    {it.cod_arti}
                  </td>
                  <td className="border border-black py-1.5 px-2">
                    <span className="font-bold text-xs uppercase">{it.descripcion}</span>
                    <span className="text-[10px] text-neutral-600 font-mono ml-2">({it.unidad})</span>
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-mono font-bold text-xs">
                    {it.ubicacion || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 pt-4 grid grid-cols-2 gap-8 text-center text-xs font-mono">
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase">ENTREGADO POR (ALMACÉN)</p>
              <p className="text-[10px] text-neutral-500">Firma y Sello</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase">RECIBIDO POR ({orderToPrint.technicianName.toUpperCase()})</p>
              <p className="text-[10px] text-neutral-500">Firma y DNI</p>
            </div>
          </div>
        </div>
      )}

      {/* Screen UI - Top Header Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Bandeja de Solicitudes
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                En Vivo
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Registros en tiempo real enviados por técnicos desde celulares
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg border border-neutral-200 transition-all cursor-pointer"
            title="Sincronizar pedidos con la nube"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isRefreshing ? 'animate-spin' : '')} />
          </button>

          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ' + (
                filterStatus === 'all'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              Todos ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ' + (
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-100/60'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Pendientes ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('attended')}
              className={'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ' + (
                filterStatus === 'attended'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Atendidos ({attendedCount})</span>
            </button>
          </div>

          {orders.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportAllExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Descargar todas las solicitudes en un archivo Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Todo Excel</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                title="Vaciar todas las solicitudes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Search Input */}
      {orders.length > 0 && (
        <div className="relative print:hidden">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por técnico, código de material o número de pedido..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 outline-none shadow-sm"
          />
        </div>
      )}

      {/* COMPACT RECORDS TABLE / LIST */}
      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-12 text-center space-y-3 print:hidden">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-neutral-800 text-sm">No hay solicitudes en la bandeja</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Cuando los técnicos elijan sus materiales y presionen{' '}
            <strong>"Enviar Pedido al Almacén"</strong> en su celular, aparecerán como registros aquí al instante.
          </p>
          {onSwitchToTechnician && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onSwitchToTechnician}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer"
              >
                Abrir Vista de Técnico para Probar
              </button>
            </div>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center text-xs text-neutral-500 print:hidden">
          No se encontraron solicitudes con los filtros aplicados.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-neutral-200 print:hidden">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isExpanded = !!expandedOrders[order.id];
            const orderDate = new Date(order.createdAt).toLocaleString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order.id}
                className={'transition-colors ' + (isPending ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'bg-white hover:bg-neutral-50/80')}
              >
                {/* Main Compact Row */}
                <div className="p-3 sm:px-4 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  {/* Left Column: Status, Date, Tech Name, Order Number */}
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      className={'px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide shrink-0 ' + (
                        isPending ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      )}
                    >
                      {isPending ? 'Pendiente' : 'Atendido'}
                    </span>

                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-neutral-300 rounded-md text-xs font-bold text-neutral-900 shrink-0">
                      <User className="w-3 h-3 text-blue-600" />
                      <span>{order.technicianName.toUpperCase()}</span>
                    </div>

                    <span className="font-mono text-[11px] text-neutral-500 font-semibold shrink-0">
                      {order.orderNumber}
                    </span>

                    <span className="text-neutral-300 text-xs hidden sm:inline">•</span>

                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 shrink-0">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{orderDate}</span>
                    </div>
                  </div>

                  {/* Middle: Items Summary Chips & Count */}
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 px-1 min-w-0">
                    {order.items.slice(0, 3).map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[11px] text-neutral-800 truncate max-w-[220px]"
                        title={it.descripcion}
                      >
                        <strong className="font-mono text-neutral-900">{it.cod_arti}</strong>
                        <span className="truncate">{it.descripcion || 'Material'}</span>
                        <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1 rounded text-[10px]">
                          x{it.quantity}
                        </span>
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        +{order.items.length - 3} más
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 ml-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Ocultar' : 'Ver todo (' + order.totalItems + ')'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Right Actions Bar */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    {/* Imprimir Vale */}
                    <button
                      type="button"
                      onClick={() => handlePrintOrder(order)}
                      className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      title="Imprimir Vale de Despacho"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Imprimir</span>
                    </button>

                    {/* Exportar Excel */}
                    <button
                      type="button"
                      onClick={() => handleExportExcel(order)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Exportar a Excel"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>

                    {/* Exportar CSV */}
                    <button
                      type="button"
                      onClick={() => handleExportCSV(order)}
                      className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Exportar a CSV"
                    >
                      <FileText className="w-3 h-3 text-neutral-500" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>

                    {/* Copiar texto */}
                    <button
                      type="button"
                      onClick={() => handleCopyOrderText(order)}
                      className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                      title="Copiar texto resumen"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(order)}
                      className={'px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ' + (
                        isPending
                          ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-300'
                      )}
                      title={isPending ? 'Marcar como Atendido' : 'Reabrir como Pendiente'}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isPending ? 'Atender' : 'Reabrir'}</span>
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDelete(order.id, order.orderNumber)}
                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200/80 space-y-2">
                    {order.note && (
                      <div className="p-2 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-700 flex items-start gap-2">
                        <strong className="text-neutral-900 shrink-0">Nota:</strong>
                        <span className="italic">{order.note}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded-xl border border-neutral-200 flex items-center gap-2.5"
                        >
                          {item.foto ? (
                            <img
                              src={item.foto}
                              alt={item.descripcion}
                              className="w-9 h-9 rounded-lg object-cover bg-neutral-100 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">
                              {item.descripcion || item.cod_arti}
                            </p>
                            <p className="text-[10px] text-neutral-500 font-mono">
                              [{item.cod_arti}] {item.ubicacion ? '📍 ' + item.ubicacion : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0 bg-neutral-100 px-2 py-0.5 rounded font-mono font-bold text-xs text-neutral-900">
                            {item.quantity} {item.unidad || 'UND'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
