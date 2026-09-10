import Fuse from 'fuse.js';
import * as XLSX from 'xlsx';
import { CatalogItem } from '../types';

let catalogData: CatalogItem[] = [];
let catalogMap = new Map<string, CatalogItem>();
let catalogFuse: Fuse<CatalogItem> | null = null;

const CUSTOM_CATALOG_STORAGE_KEY = 'app_custom_catalog_v2';

export const initCatalog = async (): Promise<CatalogItem[]> => {
  // Check if there is cached/updated catalog in localStorage
  const localCatalog = localStorage.getItem(CUSTOM_CATALOG_STORAGE_KEY);
  if (localCatalog) {
    try {
      const parsed = JSON.parse(localCatalog);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCatalogData(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading custom catalog from localStorage, fallback to default', e);
    }
  }

  // Load from /catalogo.json
  try {
    const res = await fetch('/catalogo.json');
    if (!res.ok) {
      throw new Error(`Failed to load catalogo.json: ${res.statusText}`);
    }
    const data: CatalogItem[] = await res.json();
    setCatalogData(data);
    return data;
  } catch (error) {
    console.error('Error loading default catalog:', error);
    return [];
  }
};

export const setCatalogData = (items: CatalogItem[]) => {
  catalogData = items;
  catalogMap.clear();
  for (const item of items) {
    catalogMap.set(item.cod_arti.toUpperCase().trim(), item);
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
export const updateProductStock = (codArti: string, newStock: number): boolean => {
  const normCode = codArti.toUpperCase().trim();
  const existing = catalogMap.get(normCode);
  if (!existing) return false;

  const validStock = Math.max(0, isNaN(newStock) ? 0 : newStock);
  const updatedItems = catalogData.map(item => {
    if (item.cod_arti.toUpperCase().trim() === normCode) {
      return { ...item, stock: validStock };
    }
    return item;
  });

  saveCustomCatalog(updatedItems);
  return true;
};

/**
 * Update full details of a specific product
 */
export const updateProductDetails = (codArti: string, updatedFields: Partial<CatalogItem>): CatalogItem | null => {
  const normCode = codArti.toUpperCase().trim();
  const existing = catalogMap.get(normCode);
  if (!existing) return null;

  let updatedItem: CatalogItem | null = null;
  const updatedItems = catalogData.map(item => {
    if (item.cod_arti.toUpperCase().trim() === normCode) {
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
  if (!normCode) return false;

  if (catalogMap.has(normCode)) {
    // Update existing
    updateProductDetails(normCode, item);
    return true;
  }

  const newItem: CatalogItem = {
    ...item,
    cod_arti: normCode,
    stock: Math.max(0, Number(item.stock) || 0)
  };

  const updatedItems = [newItem, ...catalogData];
  saveCustomCatalog(updatedItems);
  return true;
};

/**
 * Delete a product from inventory
 */
export const deleteProduct = (codArti: string): boolean => {
  const normCode = codArti.toUpperCase().trim();
  if (!catalogMap.has(normCode)) return false;

  const updatedItems = catalogData.filter(i => i.cod_arti.toUpperCase().trim() !== normCode);
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
  const res = await fetch('/catalogo.json');
  const data: CatalogItem[] = await res.json();
  setCatalogData(data);
  return data;
};
