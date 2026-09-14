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

// MQTT Topics for reliable real-time sync between phones and warehouse
const MQTT_TOPIC_ORDERS = 'cesar_wh_orders_v2/state';
const MQTT_TOPIC_ITEM_PREFIX = 'cesar_wh_item_v2/'; // + cod_arti
const MQTT_TOPIC_ITEM_WILDCARD = 'cesar_wh_item_v2/+';
const MQTT_TOPIC_SYNC_REQ = 'cesar_wh_sync_v2/request';

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
 * Initialize MQTT WebSocket connection for instant bi-directional sync
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
      mqttClient?.subscribe(MQTT_TOPIC_ORDERS, { qos: 1 });
      mqttClient?.subscribe(MQTT_TOPIC_ITEM_WILDCARD, { qos: 1 });
      mqttClient?.subscribe(MQTT_TOPIC_SYNC_REQ, { qos: 1 });

      // Request latest sync from peers or push our existing data
      try {
        mqttClient?.publish(MQTT_TOPIC_SYNC_REQ, JSON.stringify({ timestamp: Date.now() }), { qos: 1 });
        
        // Push local saved items to retain topics
        pushLocalOverridesToRetain();
      } catch (e) {
        console.warn('Error on connect sync:', e);
      }
    });

    mqttClient.on('message', (topic, payload) => {
      // 1. Orders Sync
      if (topic === MQTT_TOPIC_ORDERS) {
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
      }
      // 2. Individual Item / Photo / Stock Sync
      else if (topic.startsWith(MQTT_TOPIC_ITEM_PREFIX)) {
        try {
          const data = JSON.parse(payload.toString());
          if (data && data.cod_arti) {
            const code = data.cod_arti.toUpperCase().trim();
            
            // Save item override
            const currentItemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v1') || '{}');
            currentItemOverrides[code] = {
              ...(currentItemOverrides[code] || {}),
              ...(data.fields || {})
            };
            localStorage.setItem('app_item_overrides_v1', JSON.stringify(currentItemOverrides));

            // Save stock override if provided
            if (typeof data.stock === 'number') {
              const currentStockOverrides = JSON.parse(localStorage.getItem('app_stock_overrides_v1') || '{}');
              currentStockOverrides[code] = data.stock;
              localStorage.setItem('app_stock_overrides_v1', JSON.stringify(currentStockOverrides));
            }

            window.dispatchEvent(new CustomEvent(CATALOG_SYNC_EVENT, { detail: data }));
          }
        } catch (err) {
          console.warn('Error parsing single item sync from MQTT:', err);
        }
      }
      // 3. Sync Request: another device asked for catalog data
      else if (topic === MQTT_TOPIC_SYNC_REQ) {
        pushLocalOverridesToRetain();
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('MQTT connection error on ' + brokerUrl + ':', err);
      currentBrokerIndex = (currentBrokerIndex + 1) % BROKER_URLS.length;
    });
  } catch (err) {
    console.warn('Failed to initialize MQTT sync:', err);
  }
};

const pushLocalOverridesToRetain = () => {
  try {
    const itemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v1') || '{}');
    const stockOverrides = JSON.parse(localStorage.getItem('app_stock_overrides_v1') || '{}');
    const allCodes = Array.from(new Set([...Object.keys(itemOverrides), ...Object.keys(stockOverrides)]));

    if (allCodes.length === 0 || !mqttClient || !mqttClient.connected) return;

    allCodes.forEach((code) => {
      const payload = JSON.stringify({
        cod_arti: code,
        fields: itemOverrides[code] || {},
        stock: stockOverrides[code],
        timestamp: Date.now()
      });
      mqttClient?.publish(MQTT_TOPIC_ITEM_PREFIX + encodeURIComponent(code), payload, { qos: 1, retain: true });
    });
  } catch (e) {
    console.warn('Error pushing local overrides to retain:', e);
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
    mqttClient?.publish(MQTT_TOPIC_ORDERS, payload, { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error broadcasting orders:', e);
  }
};

/**
 * Broadcast single item update (photo, description, stock) to all phones via retained MQTT
 */
export const broadcastCatalogItemSync = (codArti: string, fields: Partial<CatalogItem>, stock?: number): void => {
  if (!mqttClient || !mqttClient.connected) {
    initRealtimeSync();
  }

  try {
    const code = codArti.toUpperCase().trim();
    const payload = JSON.stringify({
      cod_arti: code,
      fields,
      stock,
      timestamp: Date.now()
    });
    mqttClient?.publish(MQTT_TOPIC_ITEM_PREFIX + encodeURIComponent(code), payload, { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error broadcasting item sync:', e);
  }
};

/**
 * Broadcast custom product edits, user uploaded photos and stock to all phones
 */
export const broadcastCatalogSync = (_itemOverrides?: any, _stockOverrides?: any): void => {
  pushLocalOverridesToRetain();
};

/**
 * Force manual sync of all photos and stocks to phones
 */
export const forceSyncAllCatalogToPhones = (): number => {
  if (!mqttClient || !mqttClient.connected) {
    initRealtimeSync();
  }
  pushLocalOverridesToRetain();
  const itemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v1') || '{}');
  return Object.keys(itemOverrides).length;
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
