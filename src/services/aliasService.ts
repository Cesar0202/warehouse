import Fuse from 'fuse.js';
import { AliasItem } from '../types';

let aliasesList: AliasItem[] = [];
let aliasMap = new Map<string, AliasItem>();
let aliasFuse: Fuse<AliasItem> | null = null;

export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s\/\.\-\"\']/g, ' ') // keep alphanumerics, slashes, quotes, dots
    .replace(/\s+/g, ' ')
    .trim();
};

export const initAliases = async (): Promise<AliasItem[]> => {
  const local = localStorage.getItem('app_aliases_v1');
  if (local) {
    try {
      const parsed: AliasItem[] = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAliasesData(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading aliases from localStorage', e);
    }
  }

  // Load from /alias.json
  try {
    const res = await fetch('/alias.json');
    if (!res.ok) throw new Error('Failed to load alias.json');
    const data: AliasItem[] = await res.json();
    setAliasesData(data);
    saveAliases(data);
    return data;
  } catch (error) {
    console.error('Error loading default aliases:', error);
    return [];
  }
};

export const setAliasesData = (items: AliasItem[]) => {
  aliasesList = items;
  aliasMap.clear();

  for (const item of items) {
    const normKey = normalizeString(item.alias);
    aliasMap.set(normKey, item);
  }

  aliasFuse = new Fuse(items, {
    keys: [{ name: 'alias', weight: 0.8 }, { name: 'nota', weight: 0.2 }],
    threshold: 0.35, // Strict threshold for fuzzy matching on aliases
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true
  });
};

export const getAliases = (): AliasItem[] => {
  return aliasesList;
};

export const saveAliases = (items: AliasItem[]) => {
  setAliasesData(items);
  try {
    localStorage.setItem('app_aliases_v1', JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving aliases to localStorage', e);
  }
};

/**
 * Step 1: Exact / Normalized Match in Aliases
 */
export const findExactAlias = (rawTerm: string): AliasItem | undefined => {
  const normalized = normalizeString(rawTerm);
  return aliasMap.get(normalized);
};

/**
 * Step 2: Fuzzy Match in Aliases
 */
export const findFuzzyAlias = (rawTerm: string, thresholdScore = 75): { alias: AliasItem; score: number } | null => {
  if (!aliasFuse || !rawTerm.trim()) return null;
  const results = aliasFuse.search(rawTerm, { limit: 1 });
  if (results.length > 0) {
    const r = results[0];
    const score = Math.round((1 - (r.score ?? 0)) * 100);
    if (score >= thresholdScore) {
      return { alias: r.item, score };
    }
  }
  return null;
};

export const addOrUpdateAlias = (aliasText: string, codArti: string, nota = '', isCustom = true): boolean => {
  const norm = normalizeString(aliasText);
  if (!norm || !codArti) return false;

  const existingIdx = aliasesList.findIndex(a => normalizeString(a.alias) === norm);
  let updatedList = [...aliasesList];

  const newItem: AliasItem = {
    alias: aliasText.trim().toLowerCase(),
    cod_arti: codArti.trim().toUpperCase(),
    nota: nota.trim() || undefined,
    isCustom
  };

  if (existingIdx >= 0) {
    updatedList[existingIdx] = newItem;
  } else {
    updatedList.unshift(newItem);
  }

  saveAliases(updatedList);
  return true;
};

export const deleteAlias = (aliasText: string): boolean => {
  const norm = normalizeString(aliasText);
  const filtered = aliasesList.filter(a => normalizeString(a.alias) !== norm);
  if (filtered.length !== aliasesList.length) {
    saveAliases(filtered);
    return true;
  }
  return false;
};

export const resetDefaultAliases = async (): Promise<AliasItem[]> => {
  localStorage.removeItem('app_aliases_v1');
  const res = await fetch('/alias.json');
  const data: AliasItem[] = await res.json();
  setAliasesData(data);
  saveAliases(data);
  return data;
};
