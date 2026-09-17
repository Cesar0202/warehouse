import Fuse from 'fuse.js';
import * as XLSX from 'xlsx';
import { CatalogItem } from '../types';
import { broadcastCatalogSync, broadcastCatalogItemSync, broadcastHiddenItems, broadcastToggleHiddenItem } from './technicianOrderService';

let catalogData: CatalogItem[] = [];
let catalogMap = new Map<string, CatalogItem>();
let catalogFuse: Fuse<CatalogItem> | null = null;

const STOCK_OVERRIDES_KEY = 'app_stock_overrides_v2';
const CUSTOM_OVERRIDES_KEY = 'app_item_overrides_v2';
const HIDDEN_ITEMS_KEY = 'app_hidden_items_v1';

// Default hidden items: all other cintas aislantes except CIN01
const DEFAULT_HIDDEN_KEYS = [
  'ALM01_CIN08',
  'ALM01_CIN20',
  'ALM01_CIN21',
  'ALM02_CIN06',
  '01=ALMACEN PRINCIPAL__CIN08',
  '01=ALMACEN PRINCIPAL__CIN20',
  '01=ALMACEN PRINCIPAL__CIN21',
  '02=ALMACEN DE ACTIVOS FIJOS__CIN06'
];

export const getWarehouseCode = (alm?: string): string => {
  if (!alm) return 'ALM01';
  const a = alm.trim().toUpperCase();
  if (a.includes('02') || a.includes('ACTIVO')) return 'ALM02';
  if (a.includes('03') || a.includes('TEMPORAL')) return 'ALM03';
  return 'ALM01';
};

export const normalizeWarehouseName = (alm?: string): string => {
  if (!alm) return '01=ALMACEN PRINCIPAL';
  const a = alm.trim();
  if (a.startsWith('02') || a.toUpperCase().includes('ACTIVO')) return '02=ALMACEN DE ACTIVOS FIJOS';
  if (a.startsWith('03') || a.toUpperCase().includes('TEMPORAL')) return '03=ALMACEN TEMPORAL';
  return '01=ALMACEN PRINCIPAL';
};

export const getItemKey = (codArti: string, almacen?: string): string => {
  const normCode = (codArti || '').toUpperCase().trim();
  const wh = getWarehouseCode(almacen);
  return `${wh}_${normCode}`;
};

export const getHiddenItemKeys = (): Set<string> => {
  try {
    const raw = localStorage.getItem(HIDDEN_ITEMS_KEY);
    if (!raw) {
      const initial = new Set(DEFAULT_HIDDEN_KEYS);
      localStorage.setItem(HIDDEN_ITEMS_KEY, JSON.stringify(Array.from(initial)));
      return initial;
    }
    return new Set(JSON.parse(raw));
  } catch {
    return new Set(DEFAULT_HIDDEN_KEYS);
  }
};

export const isItemHidden = (codArti: string, almacen?: string): boolean => {
  const keys = getHiddenItemKeys();
  const normCode = (codArti || '').toUpperCase().trim();
  const key = getItemKey(codArti, almacen);
  const legacyKey = `${normalizeWarehouseName(almacen).toUpperCase()}__${normCode}`;
  return keys.has(key) || keys.has(legacyKey);
};

export const toggleProductHidden = (codArti: string, almacen?: string): boolean => {
  const key = getItemKey(codArti, almacen);
  const normCode = (codArti || '').toUpperCase().trim();
  const legacyKey = `${normalizeWarehouseName(almacen).toUpperCase()}__${normCode}`;
  const set = getHiddenItemKeys();
  let isNowHidden = false;
  if (set.has(key) || set.has(legacyKey)) {
    set.delete(key);
    set.delete(legacyKey);
    isNowHidden = false;
  } else {
    set.add(key);
    isNowHidden = true;
  }
  const arr = Array.from(set);
  localStorage.setItem(HIDDEN_ITEMS_KEY, JSON.stringify(arr));
  broadcastToggleHiddenItem(key, isNowHidden, arr);

  const updatedItems = catalogData.map(item => {
    const itemKey = getItemKey(item.cod_arti, item.almacen);
    if (itemKey === key) {
      return { ...item, oculto: isNowHidden };
    }
    return item;
  });
  setCatalogData(updatedItems);
  return isNowHidden;
};

export const getStockOverrides = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STOCK_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveStockOverride = (codArti: string, stock: number, almacen?: string) => {
  try {
    const key = getItemKey(codArti, almacen);
    const overrides = getStockOverrides();
    overrides[key] = stock;
    localStorage.setItem(STOCK_OVERRIDES_KEY, JSON.stringify(overrides));
    
    const itemOverrides = getItemOverrides();
    broadcastCatalogItemSync(codArti, itemOverrides[key] || {}, stock, almacen);
  } catch (e) {
    console.error('Error saving stock override', e);
  }
};

export const getItemOverrides = (): Record<string, Partial<CatalogItem>> => {
  try {
    const raw = localStorage.getItem(CUSTOM_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveItemOverride = (codArti: string, fields: Partial<CatalogItem>, almacen?: string) => {
  try {
    const key = getItemKey(codArti, almacen);
    const overrides = getItemOverrides();
    overrides[key] = { ...(overrides[key] || {}), ...fields };
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(overrides));
    
    const stockOverrides = getStockOverrides();
    broadcastCatalogItemSync(codArti, overrides[key], stockOverrides[key], almacen);
  } catch (e) {
    console.error('Error saving item override', e);
  }
};

export const initCatalog = async (): Promise<CatalogItem[]> => {
  // Rescue any custom photos previously uploaded by the user
  try {
    const keysToScan = [
      'app_item_overrides_v1',
      'app_custom_catalog_v2',
      'app_custom_catalog_v1',
      'app_custom_catalog'
    ];
    const currentOverrides = getItemOverrides();
    let photosRescued = false;

    for (const k of keysToScan) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const f = item.foto || item.imagen || item.image_url;
            if (f && typeof f === 'string' && !f.startsWith('data:image/svg') && !f.includes('unsplash.com')) {
              const alm = item.almacen || (item.descripcion?.toUpperCase().includes('EXTENSION') ? '02=ALMACEN DE ACTIVOS FIJOS' : '01=ALMACEN PRINCIPAL');
              const key = getItemKey(item.cod_arti, alm);
              if (!currentOverrides[key]?.foto) {
                currentOverrides[key] = { ...(currentOverrides[key] || {}), foto: f };
                photosRescued = true;
              }
            }
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          for (const [codeOrKey, val] of Object.entries<any>(parsed)) {
            const f = val?.foto || val?.imagen || val?.image_url;
            if (f && typeof f === 'string' && !f.startsWith('data:image/svg') && !f.includes('unsplash.com')) {
              let key = '';
              if (codeOrKey.includes('__')) {
                key = codeOrKey;
              } else if (codeOrKey.startsWith('02=') || codeOrKey.startsWith('02_')) {
                key = getItemKey(codeOrKey.replace(/^02[=_]/, ''), '02=ALMACEN DE ACTIVOS FIJOS');
              } else if (codeOrKey.startsWith('03=') || codeOrKey.startsWith('03_')) {
                key = getItemKey(codeOrKey.replace(/^03[=_]/, ''), '03=ALMACEN TEMPORAL');
              } else if (val?.almacen) {
                key = getItemKey(val.cod_arti || codeOrKey, val.almacen);
              } else if (val?.descripcion?.toUpperCase().includes('EXTENSION')) {
                key = getItemKey(val.cod_arti || codeOrKey, '02=ALMACEN DE ACTIVOS FIJOS');
              } else {
                key = getItemKey(val?.cod_arti || codeOrKey, '01=ALMACEN PRINCIPAL');
              }

              if (!currentOverrides[key]?.foto) {
                currentOverrides[key] = { ...(currentOverrides[key] || {}), foto: f };
                photosRescued = true;
              }
            }
          }
        }
      } catch {}
    }

    if (photosRescued) {
      localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(currentOverrides));
    }
  } catch (e) {
    console.warn('Error rescuing photos:', e);
  }

  const stockOverrides = getStockOverrides();
  const itemOverrides = getItemOverrides();

  // Load from /catalogo.json, /catalogo_alm2.json, and /catalogo_alm3.json
  const cacheBuster = '?t=' + Date.now();
  let cat1: CatalogItem[] = [];
  let cat2: CatalogItem[] = [];
  let cat3: CatalogItem[] = [];

  try {
    const [res1, res2, res3] = await Promise.allSettled([
      fetch('/catalogo.json' + cacheBuster),
      fetch('/catalogo_alm2.json' + cacheBuster),
      fetch('/catalogo_alm3.json' + cacheBuster)
    ]);

    if (res1.status === 'fulfilled' && res1.value.ok) {
      cat1 = (await res1.value.json()).map((i: any) => ({
        ...i,
        almacen: '01=ALMACEN PRINCIPAL'
      }));
    }
    if (res2.status === 'fulfilled' && res2.value.ok) {
      cat2 = (await res2.value.json()).map((i: any) => ({
        ...i,
        almacen: '02=ALMACEN DE ACTIVOS FIJOS'
      }));
    }
    if (res3.status === 'fulfilled' && res3.value.ok) {
      cat3 = (await res3.value.json()).map((i: any) => ({
        ...i,
        almacen: '03=ALMACEN TEMPORAL'
      }));
    }
  } catch (error) {
    console.error('Error loading default catalogs:', error);
  }

  const baseData = [...cat1, ...cat2, ...cat3];

  const merged = baseData.map((item) => {
    const key = getItemKey(item.cod_arti, item.almacen);
    const legacyKey = `${normalizeWarehouseName(item.almacen).toUpperCase()}__${item.cod_arti.toUpperCase().trim()}`;
    const itemOverride = itemOverrides[key] || itemOverrides[legacyKey] || {};
    const stockOverride = stockOverrides[key] ?? stockOverrides[legacyKey];
    let f = itemOverride.foto || item.foto;
    if (f && (f.startsWith('data:image/svg') || f.includes('unsplash.com'))) {
      f = undefined;
    }

    return {
      ...item,
      internal_id: key,
      ...itemOverride,
      foto: f,
      oculto: isItemHidden(item.cod_arti, item.almacen),
      stock: typeof stockOverride === 'number' ? stockOverride : (typeof itemOverride.stock === 'number' ? itemOverride.stock : item.stock)
    };
  });

  setCatalogData(merged);
  return merged;
};

export const setCatalogData = (items: CatalogItem[]) => {
  const sanitized = items.map(item => {
    let f = item.foto;
    if (f && (f.startsWith('data:image/svg') || f.includes('unsplash.com'))) {
      f = undefined;
    }
    const internalId = getItemKey(item.cod_arti, item.almacen);
    return { 
      ...item, 
      internal_id: internalId,
      almacen: normalizeWarehouseName(item.almacen),
      oculto: isItemHidden(item.cod_arti, item.almacen),
      foto: f, 
      imagen: undefined, 
      image_url: undefined 
    };
  });

  catalogData = sanitized;
  catalogMap.clear();
  for (const item of sanitized) {
    const key = getItemKey(item.cod_arti, item.almacen);
    catalogMap.set(key, item);
    const code = item.cod_arti.toUpperCase().trim();
    if (!catalogMap.has(code)) {
      catalogMap.set(code, item);
    }
  }

  // Initialize Fuse for Fuzzy Search on catalog
  catalogFuse = new Fuse(items, {
    keys: [
      { name: 'cod_arti', weight: 0.4 },
      { name: 'descripcion', weight: 0.5 },
      { name: 'familia', weight: 0.1 }
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true
  });
};

export const getCatalogData = (): CatalogItem[] => {
  return catalogData;
};

export const getCatalogItemByCode = (codArti: string, almacen?: string): CatalogItem | undefined => {
  if (almacen) {
    const key = getItemKey(codArti, almacen);
    const item = catalogMap.get(key);
    if (item) return item;
  }
  return catalogMap.get(codArti.toUpperCase().trim());
};

export const searchCatalogFuzzy = (query: string, limit = 50): { item: CatalogItem; score: number }[] => {
  if (!query.trim()) return [];
  const q = query.trim().toUpperCase();
  const qTerms = q.split(/\s+/).filter(t => t.length > 0);

  const scoredDirect: { item: CatalogItem; score: number }[] = [];
  const seenKeys = new Set<string>();

  for (const item of catalogData) {
    const desc = item.descripcion.toUpperCase();
    const cod = item.cod_arti.toUpperCase();
    const fam = (item.familia || '').toUpperCase();
    const key = getItemKey(item.cod_arti, item.almacen) + '_' + desc;

    if (seenKeys.has(key)) continue;

    // 1. Exact code match
    if (cod === q) {
      scoredDirect.push({ item, score: 1000 });
      seenKeys.add(key);
      continue;
    }

    // 2. Exact full description match
    if (desc === q) {
      scoredDirect.push({ item, score: 950 });
      seenKeys.add(key);
      continue;
    }

    // 3. Description starts with query
    if (desc.startsWith(q)) {
      scoredDirect.push({ item, score: 500 });
      seenKeys.add(key);
      continue;
    }

    // 4. Code starts with query
    if (cod.startsWith(q)) {
      scoredDirect.push({ item, score: 400 });
      seenKeys.add(key);
      continue;
    }

    // 5. Whole word in description
    const wordBoundaryRegex = new RegExp(`(?:^|\\s)${q}(?:$|\\s|\\,|\\.|\\-)`, 'i');
    if (wordBoundaryRegex.test(desc)) {
      scoredDirect.push({ item, score: 300 });
      seenKeys.add(key);
      continue;
    }

    // 6. Substring in description
    if (desc.includes(q)) {
      scoredDirect.push({ item, score: 200 });
      seenKeys.add(key);
      continue;
    }

    // 7. Contains all terms
    if (qTerms.length > 1 && qTerms.every(term => desc.includes(term) || cod.includes(term) || fam.includes(term))) {
      scoredDirect.push({ item, score: 150 });
      seenKeys.add(key);
      continue;
    }
  }

  // 8. Fallback to Fuse.js
  if (catalogFuse && scoredDirect.length < limit) {
    const fuseResults = catalogFuse.search(query, { limit: limit * 2 });
    for (const r of fuseResults) {
      const key = getItemKey(r.item.cod_arti, r.item.almacen) + '_' + r.item.descripcion.toUpperCase();
      if (!seenKeys.has(key)) {
        const score = Math.round((1 - (r.score ?? 0)) * 80);
        if (score >= 40) {
          scoredDirect.push({ item: r.item, score });
          seenKeys.add(key);
        }
      }
    }
  }

  scoredDirect.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.descripcion.localeCompare(b.item.descripcion);
  });

  return scoredDirect.slice(0, limit);
};

export const updateProductStock = (codArti: string, newStock: number, almacen?: string): boolean => {
  const normCode = codArti.toUpperCase().trim();
  const alm = normalizeWarehouseName(almacen);

  const validStock = Math.max(0, isNaN(newStock) ? 0 : newStock);
  saveStockOverride(normCode, validStock, alm);

  let updated = false;
  const updatedItems = catalogData.map(item => {
    const itemCode = item.cod_arti.toUpperCase().trim();
    const itemAlm = normalizeWarehouseName(item.almacen);
    if (itemCode === normCode && itemAlm === alm) {
      updated = true;
      return { ...item, stock: validStock };
    }
    return item;
  });

  if (updated) {
    setCatalogData(updatedItems);
  }
  return updated;
};

export const updateProductDetails = (codArti: string, updatedFields: Partial<CatalogItem>, almacen?: string): CatalogItem | null => {
  const normCode = codArti.toUpperCase().trim();
  const alm = normalizeWarehouseName(almacen);

  saveItemOverride(normCode, updatedFields, alm);
  if (typeof updatedFields.stock === 'number') {
    saveStockOverride(normCode, Math.max(0, updatedFields.stock), alm);
  }

  let updatedItem: CatalogItem | null = null;
  const updatedItems = catalogData.map(item => {
    const itemCode = item.cod_arti.toUpperCase().trim();
    const itemAlm = normalizeWarehouseName(item.almacen);
    if (itemCode === normCode && itemAlm === alm) {
      updatedItem = {
        ...item,
        ...updatedFields,
        cod_arti: normCode,
        stock: typeof updatedFields.stock === 'number' ? Math.max(0, updatedFields.stock) : item.stock
      };
      return updatedItem;
    }
    return item;
  });

  if (updatedItem) {
    setCatalogData(updatedItems);
  }
  return updatedItem;
};

export const addNewProduct = (item: CatalogItem): boolean => {
  const normCode = item.cod_arti.toUpperCase().trim();
  const alm = normalizeWarehouseName(item.almacen);
  if (!normCode) return false;

  const validStock = Math.max(0, Number(item.stock) || 0);
  saveStockOverride(normCode, validStock, alm);
  saveItemOverride(normCode, item, alm);

  const newItem: CatalogItem = {
    ...item,
    almacen: alm,
    cod_arti: normCode,
    stock: validStock
  };

  const updatedItems = [newItem, ...catalogData];
  setCatalogData(updatedItems);
  return true;
};

export const deleteProduct = (codArti: string, almacen?: string): boolean => {
  const normCode = codArti.toUpperCase().trim();
  const alm = normalizeWarehouseName(almacen);
  const key = getItemKey(normCode, alm);

  try {
    const stockOverrides = getStockOverrides();
    delete stockOverrides[key];
    localStorage.setItem(STOCK_OVERRIDES_KEY, JSON.stringify(stockOverrides));

    const itemOverrides = getItemOverrides();
    delete itemOverrides[key];
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(itemOverrides));
  } catch {}

  const updatedItems = catalogData.filter(i => {
    const itemCode = i.cod_arti.toUpperCase().trim();
    const itemAlm = normalizeWarehouseName(i.almacen);
    if (itemCode === normCode && itemAlm === alm) {
      return false;
    }
    return true;
  });
  setCatalogData(updatedItems);
  return true;
};

export const parseExcelCatalogFile = async (file: File): Promise<CatalogItem[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    throw new Error('El archivo Excel no contiene suficientes filas.');
  }

  let headerIndex = -1;
  let codIdx = -1;
  let descIdx = -1;
  let famIdx = -1;
  let undIdx = -1;
  let stockIdx = -1;
  let ubiIdx = -1;

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i].map(c => String(c).trim().toUpperCase());
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val.includes('COD') && (val.includes('ARTI') || val.includes('PROD') || val.includes('MAT'))) codIdx = c;
      if (val.includes('DESCRIP')) descIdx = c;
      if (val.includes('FAMIL')) famIdx = c;
      if (val.includes('UNIDAD') || val.includes('MEDIDA') || val.includes('UND')) undIdx = c;
      if (val === 'STOCK' || val.includes('CANT') || val.includes('DISPONIBLE')) stockIdx = c;
      if (val.includes('UBICA') || val.includes('ESTANTE') || val.includes('ALMACEN')) ubiIdx = c;
    }
    if (codIdx !== -1 && descIdx !== -1) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 1;
    codIdx = 2;
    descIdx = 3;
    famIdx = 4;
    undIdx = 7;
    stockIdx = 8;
    ubiIdx = 11;
  }

  const items: CatalogItem[] = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const cod = codIdx !== -1 && row[codIdx] ? String(row[codIdx]).trim() : '';
    if (!cod) continue;

    const desc = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : '';
    const fam = famIdx !== -1 && row[famIdx] ? String(row[famIdx]).trim() : '';
    const und = undIdx !== -1 && row[undIdx] ? String(row[undIdx]).trim() : '';
    const rawStock = stockIdx !== -1 && row[stockIdx] ? row[stockIdx] : 0;
    const ubi = ubiIdx !== -1 && row[ubiIdx] ? String(row[ubiIdx]).trim() : '';

    let stock = 0;
    if (typeof rawStock === 'number') {
      stock = isNaN(rawStock) ? 0 : rawStock;
    } else {
      const parsed = parseFloat(String(rawStock).replace(/,/g, ''));
      stock = isNaN(parsed) ? 0 : parsed;
    }

    items.push({
      cod_arti: cod,
      descripcion: desc,
      familia: fam,
      unidad: und,
      stock,
      ubicacion: ubi
    });
  }

  return items;
};

export const saveCustomCatalog = (items: CatalogItem[]) => {
  setCatalogData(items);
};

export const resetToDefaultCatalog = async (): Promise<CatalogItem[]> => {
  localStorage.removeItem(STOCK_OVERRIDES_KEY);
  localStorage.removeItem(CUSTOM_OVERRIDES_KEY);
  return initCatalog();
};
