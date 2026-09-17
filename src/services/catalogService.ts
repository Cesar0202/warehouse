import Fuse from 'fuse.js';
import * as XLSX from 'xlsx';
import { CatalogItem } from '../types';
import { broadcastCatalogSync, broadcastCatalogItemSync } from './technicianOrderService';

let catalogData: CatalogItem[] = [];
let catalogMap = new Map<string, CatalogItem>();
let catalogFuse: Fuse<CatalogItem> | null = null;

const CUSTOM_CATALOG_STORAGE_KEY = 'app_custom_catalog_v2';
const STOCK_OVERRIDES_KEY = 'app_stock_overrides_v1';
const CUSTOM_OVERRIDES_KEY = 'app_item_overrides_v1';

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
    const normCode = codArti.toUpperCase().trim();
    const alm = almacen ? almacen.toUpperCase().trim() : '';
    const key = alm ? `${alm}_${normCode}` : normCode;

    const overrides = getStockOverrides();
    overrides[key] = stock;
    if (alm) overrides[normCode] = stock;
    localStorage.setItem(STOCK_OVERRIDES_KEY, JSON.stringify(overrides));
    
    const itemOverrides = getItemOverrides();
    broadcastCatalogItemSync(normCode, itemOverrides[key] || itemOverrides[normCode] || {}, stock);
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
    const normCode = codArti.toUpperCase().trim();
    const alm = almacen ? almacen.toUpperCase().trim() : '';
    const key = alm ? `${alm}_${normCode}` : normCode;

    const overrides = getItemOverrides();
    overrides[key] = { ...(overrides[key] || {}), ...fields };
    if (alm) overrides[normCode] = { ...(overrides[normCode] || {}), ...fields };
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(overrides));
    
    const stockOverrides = getStockOverrides();
    broadcastCatalogItemSync(normCode, overrides[key] || overrides[normCode], stockOverrides[key] || stockOverrides[normCode]);
  } catch (e) {
    console.error('Error saving item override', e);
  }
};

export const initCatalog = async (): Promise<CatalogItem[]> => {
  const stockOverrides = getStockOverrides();
  const itemOverrides = getItemOverrides();
  let baseData: CatalogItem[] = [];

  // Check if there is cached/updated catalog in localStorage
  const localCatalog = localStorage.getItem(CUSTOM_CATALOG_STORAGE_KEY);
  if (localCatalog) {
    try {
      const parsed: CatalogItem[] = JSON.parse(localCatalog);
      // Ensure local catalog contains all warehouses (if older version had only Alm 1, reload)
      if (Array.isArray(parsed) && parsed.length > 4400) {
        baseData = parsed;
      }
    } catch (e) {
      console.warn('Error reading custom catalog from localStorage, fallback to default', e);
    }
  }

  // Load from /catalogo.json, /catalogo_alm2.json, and /catalogo_alm3.json
  if (baseData.length === 0) {
    try {
      const [res1, res2, res3] = await Promise.allSettled([
        fetch('/catalogo.json'),
        fetch('/catalogo_alm2.json'),
        fetch('/catalogo_alm3.json')
      ]);

      let cat1: CatalogItem[] = [];
      let cat2: CatalogItem[] = [];
      let cat3: CatalogItem[] = [];

      if (res1.status === 'fulfilled' && res1.value.ok) {
        cat1 = (await res1.value.json()).map((i: any) => ({
          ...i,
          almacen: i.almacen || '01=ALMACEN PRINCIPAL'
        }));
      }
      if (res2.status === 'fulfilled' && res2.value.ok) {
        cat2 = (await res2.value.json()).map((i: any) => ({
          ...i,
          almacen: i.almacen || '02=ALMACEN DE ACTIVOS FIJOS'
        }));
      }
      if (res3.status === 'fulfilled' && res3.value.ok) {
        cat3 = (await res3.value.json()).map((i: any) => ({
          ...i,
          almacen: i.almacen || '03=ALMACEN TEMPORAL'
        }));
      }

      baseData = [...cat1, ...cat2, ...cat3];
    } catch (error) {
      console.error('Error loading default catalogs:', error);
      baseData = [];
    }
  }

  // Merge overrides so stock and product edits persist across any refresh or hard reload
  const merged = baseData.map((item) => {
    const code = item.cod_arti.toUpperCase().trim();
    const almCode = item.almacen ? `${item.almacen}_${code}` : code;
    const itemOverride = itemOverrides[almCode] || itemOverrides[code] || {};
    const stockOverride = stockOverrides[almCode] !== undefined ? stockOverrides[almCode] : stockOverrides[code];
    let f = itemOverride.foto || item.foto;
    if (f && (f.startsWith('data:image/svg') || f.includes('unsplash.com'))) {
      f = undefined;
    }

    return {
      ...item,
      ...itemOverride,
      foto: f,
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
    return { ...item, foto: f, imagen: undefined, image_url: undefined };
  });

  catalogData = sanitized;
  catalogMap.clear();
  for (const item of sanitized) {
    const code = item.cod_arti.toUpperCase().trim();
    const alm = (item.almacen || '').toUpperCase().trim();
    if (!catalogMap.has(code)) {
      catalogMap.set(code, item);
    }
    if (alm) {
      catalogMap.set(`${alm}_${code}`, item);
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

export const getCatalogItemByCode = (codArti: string): CatalogItem | undefined => {
  return catalogMap.get(codArti.toUpperCase().trim());
};

export const searchCatalogFuzzy = (query: string, limit = 50): { item: CatalogItem; score: number }[] => {
  if (!query.trim()) return [];
  const q = query.trim().toUpperCase();
  const qTerms = q.split(/\s+/).filter(t => t.length > 0);

  // 1. Exact code match
  const exactCode = catalogMap.get(q);
  if (exactCode) {
    return [{ item: exactCode, score: 100 }];
  }

  // 2. Direct Substring & Word Match scoring across all catalog data
  const scoredDirect: { item: CatalogItem; score: number }[] = [];
  const seenCodes = new Set<string>();

  for (const item of catalogData) {
    const desc = item.descripcion.toUpperCase();
    const cod = item.cod_arti.toUpperCase();
    const fam = (item.familia || '').toUpperCase();

    // Exact full description match
    if (desc === q) {
      scoredDirect.push({ item, score: 100 });
      seenCodes.add(cod);
      continue;
    }

    // Description starts with query (e.g. "DESATORADOR...")
    if (desc.startsWith(q)) {
      scoredDirect.push({ item, score: 98 });
      seenCodes.add(cod);
      continue;
    }

    // Code starts with query
    if (cod.startsWith(q)) {
      scoredDirect.push({ item, score: 97 });
      seenCodes.add(cod);
      continue;
    }

    // Contains the whole query phrase as a word
    const wordBoundaryRegex = new RegExp(`(?:^|\\s)${q}(?:$|\\s|\\,|\\.|\\-)`, 'i');
    if (wordBoundaryRegex.test(desc)) {
      scoredDirect.push({ item, score: 95 });
      seenCodes.add(cod);
      continue;
    }

    // Contains the whole query anywhere in description
    if (desc.includes(q)) {
      scoredDirect.push({ item, score: 90 });
      seenCodes.add(cod);
      continue;
    }

    // Contains all terms (multi-word search like "curva 3/4 conduit")
    if (qTerms.length > 1 && qTerms.every(term => desc.includes(term) || cod.includes(term) || fam.includes(term))) {
      scoredDirect.push({ item, score: 85 });
      seenCodes.add(cod);
      continue;
    }
  }

  // 3. Fallback to Fuse.js for typo tolerance if few direct matches
  if (catalogFuse && scoredDirect.length < limit) {
    const fuseResults = catalogFuse.search(query, { limit: limit * 2 });
    for (const r of fuseResults) {
      const cod = r.item.cod_arti.toUpperCase();
      if (!seenCodes.has(cod)) {
        const score = Math.round((1 - (r.score ?? 0)) * 80); // max 80% for pure fuzzy
        if (score >= 40) {
          scoredDirect.push({ item: r.item, score });
          seenCodes.add(cod);
        }
      }
    }
  }

  // Sort by score descending
  scoredDirect.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.descripcion.localeCompare(b.item.descripcion);
  });

  return scoredDirect.slice(0, limit);
};

/**
 * Update stock of a specific product
 */
export const updateProductStock = (codArti: string, newStock: number, almacen?: string): boolean => {
  const normCode = codArti.toUpperCase().trim();
  const alm = almacen ? almacen.toUpperCase().trim() : '';

  const validStock = Math.max(0, isNaN(newStock) ? 0 : newStock);
  saveStockOverride(normCode, validStock, alm);

  let updated = false;
  const updatedItems = catalogData.map(item => {
    const itemCode = item.cod_arti.toUpperCase().trim();
    const itemAlm = (item.almacen || '').toUpperCase().trim();
    if (itemCode === normCode && (!alm || itemAlm === alm)) {
      updated = true;
      return { ...item, stock: validStock };
    }
    return item;
  });

  if (updated) {
    saveCustomCatalog(updatedItems);
  }
  return updated;
};

/**
 * Update full details of a specific product
 */
export const updateProductDetails = (codArti: string, updatedFields: Partial<CatalogItem>, almacen?: string): CatalogItem | null => {
  const normCode = codArti.toUpperCase().trim();
  const alm = almacen ? almacen.toUpperCase().trim() : '';

  saveItemOverride(normCode, updatedFields, alm);
  if (typeof updatedFields.stock === 'number') {
    saveStockOverride(normCode, Math.max(0, updatedFields.stock), alm);
  }

  let updatedItem: CatalogItem | null = null;
  const updatedItems = catalogData.map(item => {
    const itemCode = item.cod_arti.toUpperCase().trim();
    const itemAlm = (item.almacen || '').toUpperCase().trim();
    if (itemCode === normCode && (!alm || itemAlm === alm)) {
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
    saveCustomCatalog(updatedItems);
  }
  return updatedItem;
};

/**
 * Add a new custom product to inventory
 */
export const addNewProduct = (item: CatalogItem): boolean => {
  const normCode = item.cod_arti.toUpperCase().trim();
  const alm = (item.almacen || '').toUpperCase().trim();
  if (!normCode) return false;

  const validStock = Math.max(0, Number(item.stock) || 0);
  saveStockOverride(normCode, validStock, alm);
  saveItemOverride(normCode, item, alm);

  const newItem: CatalogItem = {
    ...item,
    cod_arti: normCode,
    stock: validStock
  };

  const updatedItems = [newItem, ...catalogData];
  saveCustomCatalog(updatedItems);
  return true;
};

/**
 * Delete a product from inventory
 */
export const deleteProduct = (codArti: string, almacen?: string): boolean => {
  const normCode = codArti.toUpperCase().trim();
  const alm = almacen ? almacen.toUpperCase().trim() : '';
  const key = alm ? `${alm}_${normCode}` : normCode;

  try {
    const stockOverrides = getStockOverrides();
    delete stockOverrides[key];
    delete stockOverrides[normCode];
    localStorage.setItem(STOCK_OVERRIDES_KEY, JSON.stringify(stockOverrides));

    const itemOverrides = getItemOverrides();
    delete itemOverrides[key];
    delete itemOverrides[normCode];
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(itemOverrides));
  } catch {}

  const updatedItems = catalogData.filter(i => {
    const itemCode = i.cod_arti.toUpperCase().trim();
    const itemAlm = (i.almacen || '').toUpperCase().trim();
    if (itemCode === normCode && (!alm || itemAlm === alm)) {
      return false;
    }
    return true;
  });
  saveCustomCatalog(updatedItems);
  return true;
};

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file and return catalog items
 */
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
  try {
    localStorage.setItem(CUSTOM_CATALOG_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage limit reached for custom catalog', e);
  }
};

export const resetToDefaultCatalog = async (): Promise<CatalogItem[]> => {
  localStorage.removeItem(CUSTOM_CATALOG_STORAGE_KEY);
  localStorage.removeItem(STOCK_OVERRIDES_KEY);
  localStorage.removeItem(CUSTOM_OVERRIDES_KEY);
  const res = await fetch('/catalogo.json');
  const data: CatalogItem[] = await res.json();
  setCatalogData(data);
  return data;
};
