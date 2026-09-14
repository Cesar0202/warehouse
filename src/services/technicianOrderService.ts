import mqtt, { MqttClient } from 'mqtt';
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
export const CATALOG_SYNC_EVENT = 'catalog_sync_updated';

// MQTT Topic for real-time bi-directional sync between all phones and warehouse PCs
const MQTT_TOPIC = 'cesar_warehouse_orders_v1/state';
const MQTT_CATALOG_TOPIC = 'cesar_warehouse_catalog_v1/state';

const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

let mqttClient: MqttClient | null = null;
let currentBrokerIndex = 0;

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

export const saveTechnicianOrdersLocally = (orders: TechnicianOrder[], emitEvent = true): void => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(TECHNICIAN_ORDERS_EVENT, { detail: orders }));
    }
  } catch (e) {
    console.error('Error saving technician orders locally:', e);
  }
};

/**
 * Initialize MQTT WebSocket connection for instant <50ms real-time delivery
 */
export const initRealtimeSync = (): void => {
  if (mqttClient && mqttClient.connected) return;

  try {
    const brokerUrl = BROKER_URLS[currentBrokerIndex];
    const clientId = 'wh_' + Math.random().toString(16).substring(2, 10);

    mqttClient = mqtt.connect(brokerUrl, {
      clientId,
      clean: false,
      reconnectPeriod: 3000,
      connectTimeout: 8000
    });

    mqttClient.on('connect', () => {
      console.log('Real-time sync connected to broker:', brokerUrl);
      mqttClient?.subscribe(MQTT_TOPIC, { qos: 1 });
      mqttClient?.subscribe(MQTT_CATALOG_TOPIC, { qos: 1 });
    });

    mqttClient.on('message', (topic, payload) => {
      if (topic === MQTT_TOPIC) {
        try {
          const incoming: TechnicianOrder[] = JSON.parse(payload.toString());
          if (Array.isArray(incoming)) {
            const local = getTechnicianOrders();
            const orderMap = new Map<string, TechnicianOrder>();

            local.forEach((o) => orderMap.set(o.id, o));
            incoming.forEach((o) => orderMap.set(o.id, o));

            const merged = Array.from(orderMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            saveTechnicianOrdersLocally(merged, true);
          }
        } catch (err) {
          console.warn('Error parsing incoming real-time MQTT orders:', err);
        }
      } else if (topic === MQTT_CATALOG_TOPIC) {
        try {
          const data = JSON.parse(payload.toString());
          if (data && (data.itemOverrides || data.stockOverrides)) {
            if (data.itemOverrides) {
              const current = JSON.parse(localStorage.getItem('app_item_overrides_v1') || '{}');
              const merged = { ...current, ...data.itemOverrides };
              localStorage.setItem('app_item_overrides_v1', JSON.stringify(merged));
            }
            if (data.stockOverrides) {
              const currentStock = JSON.parse(localStorage.getItem('app_stock_overrides_v1') || '{}');
              const mergedStock = { ...currentStock, ...data.stockOverrides };
              localStorage.setItem('app_stock_overrides_v1', JSON.stringify(mergedStock));
            }
            window.dispatchEvent(new CustomEvent(CATALOG_SYNC_EVENT, { detail: data }));
          }
        } catch (err) {
          console.warn('Error parsing catalog sync from MQTT:', err);
        }
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('MQTT connection error on ' + brokerUrl + ':', err);
      // Try next broker
      currentBrokerIndex = (currentBrokerIndex + 1) % BROKER_URLS.length;
    });
  } catch (err) {
    console.warn('Failed to initialize MQTT sync:', err);
  }
};

// Start sync immediately
if (typeof window !== 'undefined') {
  initRealtimeSync();
}

/**
 * Broadcast orders update to all connected phones and PCs
 */
export const broadcastOrders = (orders: TechnicianOrder[]): void => {
  if (!mqttClient || !mqttClient.connected) {
    initRealtimeSync();
  }

  try {
    const payload = JSON.stringify(orders);
    mqttClient?.publish(MQTT_TOPIC, payload, { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error broadcasting orders:', e);
  }
};

/**
 * Broadcast custom product edits, user uploaded photos and stock to all phones
 */
export const broadcastCatalogSync = (itemOverrides: any, stockOverrides: any): void => {
  if (!mqttClient || !mqttClient.connected) {
    initRealtimeSync();
  }

  try {
    const payload = JSON.stringify({ itemOverrides, stockOverrides, timestamp: Date.now() });
    mqttClient?.publish(MQTT_CATALOG_TOPIC, payload, { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error broadcasting catalog sync:', e);
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
  saveTechnicianOrdersLocally(updatedOrders, true);
  broadcastOrders(updatedOrders);

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
  saveTechnicianOrdersLocally(updated, true);
  broadcastOrders(updated);
};

export const deleteTechnicianOrder = (orderId: string): void => {
  const currentOrders = getTechnicianOrders();
  const updated = currentOrders.filter((ord) => ord.id !== orderId);
  saveTechnicianOrdersLocally(updated, true);
  broadcastOrders(updated);
};

export const clearAllTechnicianOrders = (): void => {
  saveTechnicianOrdersLocally([], true);
  broadcastOrders([]);
};
