import React, { useState, useEffect } from 'react';
import {
  Package,
  User,
  Clock,
  CheckCircle2,
  Trash2,
  FileCheck,
  ClipboardCopy,
  ChevronRight,
  Search
} from 'lucide-react';
import {
  TechnicianOrder,
  getTechnicianOrders,
  updateTechnicianOrderStatus,
  deleteTechnicianOrder,
  clearAllTechnicianOrders,
  TECHNICIAN_ORDERS_EVENT
} from '../services/technicianOrderService';

interface IncomingOrdersViewProps {
  onLoadOrderToDispatch: (order: TechnicianOrder) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
  onSwitchToTechnician?: () => void;
}

export const IncomingOrdersView: React.FC<IncomingOrdersViewProps> = ({
  onLoadOrderToDispatch,
  onShowToast,
  onSwitchToTechnician
}) => {
  const [orders, setOrders] = useState<TechnicianOrder[]>(() => getTechnicianOrders());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'attended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshOrders = () => {
    setOrders(getTechnicianOrders());
  };

  useEffect(() => {
    const handleUpdate = () => refreshOrders();
    window.addEventListener(TECHNICIAN_ORDERS_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(TECHNICIAN_ORDERS_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleToggleStatus = (order: TechnicianOrder) => {
    const newStatus = order.status === 'pending' ? 'attended' : 'pending';
    updateTechnicianOrderStatus(order.id, newStatus);
    refreshOrders();
    onShowToast(
      'success',
      newStatus === 'attended' ? 'Pedido marcado como Atendido' : 'Pedido marcado como Pendiente'
    );
  };

  const handleDelete = (orderId: string, orderNumber: string) => {
    if (window.confirm(`¿Eliminar la solicitud ${orderNumber}?`)) {
      deleteTechnicianOrder(orderId);
      refreshOrders();
      onShowToast('info', 'Solicitud eliminada');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas vaciar todas las solicitudes recibidas?')) {
      clearAllTechnicianOrders();
      refreshOrders();
      onShowToast('info', 'Bandeja de solicitudes vaciada');
    }
  };

  const handleCopyOrderText = (order: TechnicianOrder) => {
    const lines = [
      `SOLICITUD: ${order.orderNumber}`,
      `TÉCNICO: ${order.technicianName}`,
      `FECHA: ${new Date(order.createdAt).toLocaleString('es-PE')}`,
      order.note ? `NOTA: ${order.note}` : '',
      '------------------------------',
      ...order.items.map(
        (it, idx) =>
          `${idx + 1}. [${it.cod_arti}] ${it.descripcion} - Cant: ${it.quantity} ${it.unidad}${
            it.ubicacion ? ` (Ubic: ${it.ubicacion})` : ''
          }`
      ),
      '------------------------------',
      `TOTAL ARTÍCULOS: ${order.totalItems} (${order.totalUnits} unidades)`
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines);
    onShowToast('success', 'Detalle copiado al portapapeles');
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
    <div className="space-y-6 font-sans">
      {/* Top Banner / Stats Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Bandeja de Solicitudes de Campo
              </h2>
              <p className="text-xs text-neutral-500">
                Pedidos enviados en tiempo real por los técnicos desde la aplicación móvil
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Clear */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Pendientes ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('attended')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'attended'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Atendidos ({attendedCount})</span>
            </button>
          </div>

          {orders.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
              title="Vaciar todas las solicitudes"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Filter Bar */}
      {orders.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por técnico, número de pedido o artículo..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 outline-none shadow-sm"
          />
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-neutral-800 text-base">No hay solicitudes en la bandeja</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Cuando los técnicos elijan sus materiales en su pantalla móvil y presionen{' '}
            <strong>"Enviar Pedido al Almacén"</strong>, aparecerán aquí de forma inmediata.
          </p>
          {onSwitchToTechnician && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onSwitchToTechnician}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer"
              >
                Abrir Vista de Técnico para Probar
              </button>
            </div>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-xs text-neutral-500">
          No se encontraron pedidos con los filtros aplicados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const orderDate = new Date(order.createdAt).toLocaleString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-300/40'
                    : 'border-neutral-200 opacity-90'
                }`}
              >
                {/* Order Header */}
                <div
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                    isPending ? 'bg-amber-50/50 border-amber-200' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wide ${
                        isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isPending ? 'Pendiente' : 'Atendido'}
                    </span>
                    <span className="font-mono font-bold text-xs text-neutral-700">
                      {order.orderNumber}
                    </span>
                    <span className="text-neutral-400 text-xs">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{orderDate}</span>
                    </div>
                  </div>

                  {/* Technician Name Badge */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 shadow-xs">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Técnico: {order.technicianName.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Note */}
                {order.note && (
                  <div className="px-4 sm:px-6 py-2.5 bg-neutral-50/70 border-b border-neutral-100 text-xs text-neutral-700 flex items-start gap-2">
                    <strong className="text-neutral-900 shrink-0">Observación / Nota:</strong>
                    <span className="italic">{order.note}</span>
                  </div>
                )}

                {/* Items Grid */}
                <div className="p-4 sm:px-6 divide-y divide-neutral-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-item-${idx}`}
                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3"
                      >
                        {item.foto ? (
                          <img
                            src={item.foto}
                            alt={item.descripcion}
                            className="w-12 h-12 rounded-lg object-cover bg-white border border-neutral-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-200 border border-neutral-300 flex items-center justify-center text-neutral-600 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {item.descripcion}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                            <span className="bg-neutral-200 px-1.5 py-0.2 rounded text-neutral-800 font-semibold">
                              {item.cod_arti}
                            </span>
                            <span>{item.unidad}</span>
                          </div>
                          {item.ubicacion && (
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5 truncate">
                              📍 {item.ubicacion}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 bg-white border border-neutral-300 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] text-neutral-500 block uppercase font-semibold">
                            Cant
                          </span>
                          <span className="text-sm font-extrabold text-neutral-900 font-mono">
                            {item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-4 sm:px-6 py-3.5 bg-neutral-50/90 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-neutral-600 font-medium">
                    Total: <strong className="text-neutral-900">{order.totalItems}</strong> artículos (
                    <strong className="text-neutral-900">{order.totalUnits}</strong> unidades)
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyOrderText(order)}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar texto"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(order)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isPending
                          ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Marcar Atendido' : 'Reabrir'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadOrderToDispatch(order)}
                      className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Cargar al Despacho</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(order.id, order.orderNumber)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
