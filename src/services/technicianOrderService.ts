import { CatalogItem } from '../types';

export interface TechnicianOrderItem {
  cod_arti: string;
  descripcion: string;
  unidad: string;
  quantity: number;
  ubicacion?: string;
  foto?: string;
}

export interface TechnicianOrder {
  id: string;
  orderNumber: string;
  technicianName: string;
  createdAt: string;
  note?: string;
  items: TechnicianOrderItem[];
  status: 'pending' | 'attended' | 'cancelled';
  totalItems: number;
  totalUnits: number;
}

const ORDERS_STORAGE_KEY = 'app_technician_incoming_orders_v1';
export const TECHNICIAN_ORDERS_EVENT = 'technician_orders_updated';

export const getTechnicianOrders = (): TechnicianOrder[] => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading technician orders:', e);
    return [];
  }
};

export const saveTechnicianOrders = (orders: TechnicianOrder[]): void => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(TECHNICIAN_ORDERS_EVENT, { detail: orders }));
  } catch (e) {
    console.error('Error saving technician orders:', e);
  }
};

export const createTechnicianOrder = (
  technicianName: string,
  cartItems: { item: CatalogItem; quantity: number }[],
  note?: string
): TechnicianOrder => {
  const currentOrders = getTechnicianOrders();
  const date = new Date();
  const dateFormatted = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `PED-${dateFormatted}-${randSeq}`;

  const items: TechnicianOrderItem[] = cartItems.map((c) => ({
    cod_arti: c.item.cod_arti,
    descripcion: c.item.descripcion,
    unidad: c.item.unidad || 'UND',
    quantity: c.quantity,
    ubicacion: c.item.ubicacion || '',
    foto: c.item.foto || c.item.imagen || c.item.image_url || ''
  }));

  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

  const newOrder: TechnicianOrder = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    orderNumber,
    technicianName: technicianName.trim() || 'Técnico de Campo',
    createdAt: date.toISOString(),
    note: note?.trim() || '',
    items,
    status: 'pending',
    totalItems: items.length,
    totalUnits
  };

  const updatedOrders = [newOrder, ...currentOrders];
  saveTechnicianOrders(updatedOrders);
  return newOrder;
};

export const updateTechnicianOrderStatus = (
  orderId: string,
  status: 'pending' | 'attended' | 'cancelled'
): void => {
  const currentOrders = getTechnicianOrders();
  const updated = currentOrders.map((ord) =>
    ord.id === orderId ? { ...ord, status } : ord
  );
  saveTechnicianOrders(updated);
};

export const deleteTechnicianOrder = (orderId: string): void => {
  const currentOrders = getTechnicianOrders();
  const updated = currentOrders.filter((ord) => ord.id !== orderId);
  saveTechnicianOrders(updated);
};

export const clearAllTechnicianOrders = (): void => {
  saveTechnicianOrders([]);
};
