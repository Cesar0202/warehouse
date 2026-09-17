import mqtt, { MqttClient } from 'mqtt';
import { CatalogItem } from '../types';

export interface TechnicianOrderItem {
  cod_arti: string;
  descripcion: string;
  unidad: string;
  quantity: number;
  ubicacion?: string;
  almacen?: string;
  foto?: string;
}

export interface TechnicianOrder {
  id: string;
  orderNumber: string;
  technicianName: string;
  workOrder?: string;
  destination?: string;
  createdAt: string; // ISO string
  note?: string;
  items: TechnicianOrderItem[];
  status: 'pending' | 'attended' | 'cancelled';
  totalItems: number;
  totalUnits: number;
}

const ORDERS_STORAGE_KEY = 'app_technician_incoming_orders_v1';
const DELETED_ORDERS_KEY = 'app_wh_deleted_order_ids_v1';
const CLEAR_TIMESTAMP_KEY = 'app_wh_clear_timestamp_v1';

export const TECHNICIAN_ORDERS_EVENT = 'technician_orders_updated';
export const CATALOG_SYNC_EVENT = 'catalog_sync_updated';

// MQTT Topics for reliable real-time sync between phones and warehouse
const MQTT_TOPIC_ORDERS_STATE = 'cesar_wh_orders_v3/state';
const MQTT_TOPIC_ORDERS_ACTION = 'cesar_wh_orders_v3/action';
const MQTT_TOPIC_ITEM_PREFIX = 'cesar_wh_item_v3/'; // + itemKey
const MQTT_TOPIC_ITEM_WILDCARD = 'cesar_wh_item_v3/+';
const MQTT_TOPIC_SYNC_REQ = 'cesar_wh_sync_v3/request';

const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

let mqttClient: MqttClient | null = null;
let currentBrokerIndex = 0;

const getDeletedOrderIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_ORDERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addDeletedOrderId = (orderId: string) => {
  try {
    const set = getDeletedOrderIds();
    set.add(orderId);
    localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving deleted order id', e);
  }
};

const getClearTimestamp = (): number => {
  try {
    return parseInt(localStorage.getItem(CLEAR_TIMESTAMP_KEY) || '0', 10);
  } catch {
    return 0;
  }
};

export const getTechnicianOrders = (): TechnicianOrder[] => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: TechnicianOrder[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const deletedIds = getDeletedOrderIds();
    const clearTime = getClearTimestamp();

    return parsed.filter((o) => {
      if (deletedIds.has(o.id)) return false;
      if (clearTime > 0 && new Date(o.createdAt).getTime() < clearTime) return false;
      return true;
    });
  } catch (e) {
    console.error('Error reading technician orders:', e);
    return [];
  }
};

export const saveTechnicianOrdersLocally = (orders: TechnicianOrder[], emitEvent = true): void => {
  try {
    const deletedIds = getDeletedOrderIds();
    const clearTime = getClearTimestamp();
    const clean = orders.filter((o) => {
      if (deletedIds.has(o.id)) return false;
      if (clearTime > 0 && new Date(o.createdAt).getTime() < clearTime) return false;
      return true;
    });

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(clean));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(TECHNICIAN_ORDERS_EVENT, { detail: clean }));
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
      mqttClient?.subscribe(MQTT_TOPIC_ORDERS_STATE, { qos: 1 });
      mqttClient?.subscribe(MQTT_TOPIC_ORDERS_ACTION, { qos: 1 });
      mqttClient?.subscribe(MQTT_TOPIC_ITEM_WILDCARD, { qos: 1 });
      mqttClient?.subscribe(MQTT_TOPIC_SYNC_REQ, { qos: 1 });

      try {
        mqttClient?.publish(MQTT_TOPIC_SYNC_REQ, JSON.stringify({ timestamp: Date.now() }), { qos: 1 });
        pushLocalOverridesToRetain();
      } catch (e) {
        console.warn('Error on connect sync:', e);
      }
    });

    mqttClient.on('message', (topic, payload) => {
      // 1. Orders Actions
      if (topic === MQTT_TOPIC_ORDERS_ACTION) {
        try {
          const data = JSON.parse(payload.toString());
          if (!data || !data.action) return;

          if (data.action === 'CREATE_ORDER' && data.order) {
            const deletedIds = getDeletedOrderIds();
            if (deletedIds.has(data.order.id)) return;

            const current = getTechnicianOrders();
            if (!current.some((o) => o.id === data.order.id)) {
              const updated = [data.order, ...current];
              saveTechnicianOrdersLocally(updated, true);
            }
          } else if (data.action === 'UPDATE_STATUS' && data.orderId) {
            const current = getTechnicianOrders();
            const updated = current.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o));
            saveTechnicianOrdersLocally(updated, true);
          } else if (data.action === 'DELETE_ORDER' && data.orderId) {
            addDeletedOrderId(data.orderId);
            const current = getTechnicianOrders();
            const updated = current.filter((o) => o.id !== data.orderId);
            saveTechnicianOrdersLocally(updated, true);
          } else if (data.action === 'CLEAR_ALL') {
            if (data.timestamp) {
              localStorage.setItem(CLEAR_TIMESTAMP_KEY, String(data.timestamp));
            }
            saveTechnicianOrdersLocally([], true);
          }
        } catch (err) {
          console.warn('Error parsing orders action MQTT:', err);
        }
      }
      // 2. Orders Full State (Retained fallback)
      else if (topic === MQTT_TOPIC_ORDERS_STATE) {
        try {
          const incoming: TechnicianOrder[] = JSON.parse(payload.toString());
          if (Array.isArray(incoming)) {
            const deletedIds = getDeletedOrderIds();
            const clearTime = getClearTimestamp();
            const local = getTechnicianOrders();
            const orderMap = new Map<string, TechnicianOrder>();

            local.forEach((o) => {
              if (!deletedIds.has(o.id) && !(clearTime > 0 && new Date(o.createdAt).getTime() < clearTime)) {
                orderMap.set(o.id, o);
              }
            });

            incoming.forEach((o) => {
              if (!deletedIds.has(o.id) && !(clearTime > 0 && new Date(o.createdAt).getTime() < clearTime)) {
                orderMap.set(o.id, o);
              }
            });

            const merged = Array.from(orderMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            saveTechnicianOrdersLocally(merged, true);
          }
        } catch (err) {
          console.warn('Error parsing incoming real-time MQTT orders state:', err);
        }
      }
      // 3. Individual Item / Photo / Stock Sync
      else if (topic.startsWith(MQTT_TOPIC_ITEM_PREFIX)) {
        try {
          const data = JSON.parse(payload.toString());
          if (data && data.cod_arti) {
            const code = data.cod_arti.toUpperCase().trim();
            const alm = data.almacen ? (data.almacen.startsWith('02') ? '02=ALMACEN DE ACTIVOS FIJOS' : data.almacen.startsWith('03') ? '03=ALMACEN TEMPORAL' : '01=ALMACEN PRINCIPAL') : '01=ALMACEN PRINCIPAL';
            const key = `${alm.toUpperCase()}__${code}`;
            
            const currentItemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v2') || '{}');
            currentItemOverrides[key] = {
              ...(currentItemOverrides[key] || {}),
              ...(data.fields || {})
            };
            localStorage.setItem('app_item_overrides_v2', JSON.stringify(currentItemOverrides));

            if (typeof data.stock === 'number') {
              const currentStockOverrides = JSON.parse(localStorage.getItem('app_stock_overrides_v2') || '{}');
              currentStockOverrides[key] = data.stock;
              localStorage.setItem('app_stock_overrides_v2', JSON.stringify(currentStockOverrides));
            }

            window.dispatchEvent(new CustomEvent(CATALOG_SYNC_EVENT, { detail: { ...data, key } }));
          }
        } catch (err) {
          console.warn('Error parsing single item sync from MQTT:', err);
        }
      }
      // 4. Sync Request
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
    const itemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v2') || '{}');
    const stockOverrides = JSON.parse(localStorage.getItem('app_stock_overrides_v2') || '{}');
    const allKeys = Array.from(new Set([...Object.keys(itemOverrides), ...Object.keys(stockOverrides)]));

    if (allKeys.length === 0 || !mqttClient || !mqttClient.connected) return;

    allKeys.forEach((key) => {
      const parts = key.split('__');
      const alm = parts.length > 1 ? parts[0] : '01=ALMACEN PRINCIPAL';
      const code = parts.length > 1 ? parts[1] : parts[0];
      const payload = JSON.stringify({
        cod_arti: code,
        almacen: alm,
        fields: itemOverrides[key] || {},
        stock: stockOverrides[key],
        timestamp: Date.now()
      });
      mqttClient?.publish(MQTT_TOPIC_ITEM_PREFIX + encodeURIComponent(key), payload, { qos: 1, retain: true });
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
    mqttClient?.publish(MQTT_TOPIC_ORDERS_STATE, payload, { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error broadcasting orders:', e);
  }
};

/**
 * Broadcast single item update (photo, description, stock) to all phones via retained MQTT
 */
export const broadcastCatalogItemSync = (codArti: string, fields: Partial<CatalogItem>, stock?: number, almacen?: string): void => {
  if (!mqttClient || !mqttClient.connected) {
    initRealtimeSync();
  }

  try {
    const code = codArti.toUpperCase().trim();
    const alm = almacen ? (almacen.startsWith('02') ? '02=ALMACEN DE ACTIVOS FIJOS' : almacen.startsWith('03') ? '03=ALMACEN TEMPORAL' : '01=ALMACEN PRINCIPAL') : '01=ALMACEN PRINCIPAL';
    const key = `${alm.toUpperCase()}__${code}`;
    const payload = JSON.stringify({
      cod_arti: code,
      almacen: alm,
      fields,
      stock,
      timestamp: Date.now()
    });
    mqttClient?.publish(MQTT_TOPIC_ITEM_PREFIX + encodeURIComponent(key), payload, { qos: 1, retain: true });
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
  const itemOverrides = JSON.parse(localStorage.getItem('app_item_overrides_v2') || '{}');
  return Object.keys(itemOverrides).length;
};

export const createTechnicianOrder = (
  technicianName: string,
  cartItems: { item: CatalogItem; quantity: number }[],
  workOrder?: string,
  destination?: string,
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
    workOrder: workOrder?.trim() || '',
    destination: destination?.trim() || '',
    createdAt: date.toISOString(),
    note: note?.trim() || '',
    items,
    status: 'pending',
    totalItems: items.length,
    totalUnits
  };

  const updatedOrders = [newOrder, ...currentOrders];
  saveTechnicianOrdersLocally(updatedOrders, true);

  // Broadcast specific action AND state
  try {
    if (!mqttClient || !mqttClient.connected) {
      initRealtimeSync();
    }
    mqttClient?.publish(MQTT_TOPIC_ORDERS_ACTION, JSON.stringify({ action: 'CREATE_ORDER', order: newOrder }), { qos: 1 });
    mqttClient?.publish(MQTT_TOPIC_ORDERS_STATE, JSON.stringify(updatedOrders), { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error publishing new order action:', e);
  }

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

  try {
    if (!mqttClient || !mqttClient.connected) {
      initRealtimeSync();
    }
    mqttClient?.publish(MQTT_TOPIC_ORDERS_ACTION, JSON.stringify({ action: 'UPDATE_STATUS', orderId, status }), { qos: 1 });
    mqttClient?.publish(MQTT_TOPIC_ORDERS_STATE, JSON.stringify(updated), { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error publishing update status:', e);
  }
};

export const deleteTechnicianOrder = (orderId: string): void => {
  addDeletedOrderId(orderId);
  const currentOrders = getTechnicianOrders();
  const updated = currentOrders.filter((ord) => ord.id !== orderId);
  saveTechnicianOrdersLocally(updated, true);

  try {
    if (!mqttClient || !mqttClient.connected) {
      initRealtimeSync();
    }
    mqttClient?.publish(MQTT_TOPIC_ORDERS_ACTION, JSON.stringify({ action: 'DELETE_ORDER', orderId }), { qos: 1 });
    mqttClient?.publish(MQTT_TOPIC_ORDERS_STATE, JSON.stringify(updated), { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error publishing delete order:', e);
  }
};

export const clearAllTechnicianOrders = (): void => {
  const now = Date.now();
  localStorage.setItem(CLEAR_TIMESTAMP_KEY, String(now));
  saveTechnicianOrdersLocally([], true);

  try {
    if (!mqttClient || !mqttClient.connected) {
      initRealtimeSync();
    }
    mqttClient?.publish(MQTT_TOPIC_ORDERS_ACTION, JSON.stringify({ action: 'CLEAR_ALL', timestamp: now }), { qos: 1 });
    mqttClient?.publish(MQTT_TOPIC_ORDERS_STATE, JSON.stringify([]), { qos: 1, retain: true });
  } catch (e) {
    console.warn('Error publishing clear all:', e);
  }
};
