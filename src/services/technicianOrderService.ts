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
  createdAt: string; // ISO string
  note?: string;
  items: TechnicianOrderItem[];
  status: 'pending' | 'attended' | 'cancelled';
  totalItems: number;
  totalUnits: number;
}

const ORDERS_STORAGE_KEY = 'app_technician_incoming_orders_v1';
export const TECHNICIAN_ORDERS_EVENT = 'technician_orders_updated';

// Cloud Sync Endpoint for live real-time sync across mobile phones and warehouse PCs
const CLOUD_SYNC_ID = 'ff808181a067127101a09cdf23420cb7';
const CLOUD_API_URL = 'https://api.restful-api.dev/objects/' + CLOUD_SYNC_ID;

let isSyncing = false;

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

export const saveTechnicianOrdersLocally = (orders: TechnicianOrder[]): void => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(TECHNICIAN_ORDERS_EVENT, { detail: orders }));
  } catch (e) {
    console.error('Error saving technician orders locally:', e);
  }
};

/**
 * Push orders list to Cloud Channel
 */
export const pushOrdersToCloud = async (orders: TechnicianOrder[]): Promise<void> => {
  try {
    const payload = {
      name: 'Technician Orders Channel',
      data: { orders }
    };

    await fetch(CLOUD_API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('Cloud sync push warning:', e);
  }
};

/**
 * Fetch latest orders from Cloud Channel and merge with local state
 */
export const fetchOrdersFromCloud = async (): Promise<TechnicianOrder[]> => {
  if (isSyncing) return getTechnicianOrders();
  isSyncing = true;

  try {
    const res = await fetch(CLOUD_API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      isSyncing = false;
      return getTechnicianOrders();
    }

    const json = await res.json();
    const cloudOrders: TechnicianOrder[] = json?.data?.orders || [];

    if (Array.isArray(cloudOrders)) {
      const localOrders = getTechnicianOrders();
      const orderMap = new Map<string, TechnicianOrder>();

      // Put local first
      localOrders.forEach((o) => orderMap.set(o.id, o));
      // Overwrite/merge with cloud (cloud is source of truth)
      cloudOrders.forEach((o) => orderMap.set(o.id, o));

      const merged = Array.from(orderMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      saveTechnicianOrdersLocally(merged);
      isSyncing = false;
      return merged;
    }
  } catch (e) {
    console.warn('Cloud sync fetch warning:', e);
  } finally {
    isSyncing = false;
  }

  return getTechnicianOrders();
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
  const orderNumber = 'PED-' + dateFormatted + '-' + randSeq;

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
    id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
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
  saveTechnicianOrdersLocally(updatedOrders);

  // Push to cloud asynchronously
  pushOrdersToCloud(updatedOrders).catch(console.warn);

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
  saveTechnicianOrdersLocally(updated);
  pushOrdersToCloud(updated).catch(console.warn);
};

export const deleteTechnicianOrder = (orderId: string): void => {
  const currentOrders = getTechnicianOrders();
  const updated = currentOrders.filter((ord) => ord.id !== orderId);
  saveTechnicianOrdersLocally(updated);
  pushOrdersToCloud(updated).catch(console.warn);
};

export const clearAllTechnicianOrders = (): void => {
  saveTechnicianOrdersLocally([]);
  pushOrdersToCloud([]).catch(console.warn);
};
