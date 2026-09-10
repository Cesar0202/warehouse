import { AISuggestion, CatalogItem } from '../types';
import { getCatalogData, searchCatalogFuzzy, getCatalogItemByCode } from './catalogService';

const API_KEY_STORAGE_KEY = 'app_gemini_api_key_v1';

export const getGeminiApiKey = (): string => {
  // Priority 1: Environment variable (.env / Vercel env)
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && String(envKey).trim() && !String(envKey).includes('TuClaveAqui')) {
    return String(envKey).trim();
  }

  // Priority 2: Stored in localStorage if previously configured
  const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (stored && stored.trim()) return stored.trim();

  return '';
};

export const setGeminiApiKey = (key: string): void => {
  if (!key.trim()) {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } else {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  }
};

export const hasGeminiApiKey = (): boolean => {
  return getGeminiApiKey().length > 5;
};

// Candidate Gemini models compatible with current Google API versions
const CANDIDATE_MODELS = [
  { version: 'v1beta', model: 'gemini-3.5-flash' },
  { version: 'v1beta', model: 'gemini-3.5-flash-lite' },
  { version: 'v1beta', model: 'gemini-3.6-flash' },
  { version: 'v1beta', model: 'gemini-3.7-flash' },
  { version: 'v1beta', model: 'gemini-flash-latest' },
  { version: 'v1beta', model: 'gemma-4-26b-a4b-it' },
  { version: 'v1', model: 'gemini-3.5-flash' }
];

/**
 * Execute Gemini API request trying available models
 */
async function callGeminiAPI(apiKey: string, promptText: string): Promise<string> {
  let lastErrorMsg = '';

  for (const { version, model } of CANDIDATE_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErrorMsg = errJson.error?.message || `Error ${res.status}: ${res.statusText}`;
        if (res.status === 404 || res.status === 429) {
          continue;
        }
        if (res.status === 400 || res.status === 403) {
          throw new Error(lastErrorMsg);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('404')) {
        throw err;
      }
      lastErrorMsg = err.message || 'Error de conexión';
    }
  }

  throw new Error(lastErrorMsg || 'No se pudo conectar con los modelos disponibles de Google Gemini. Verifica tu API Key.');
}

/**
 * Test connectivity with Gemini API Key
 */
export const testGeminiApiKey = async (key: string): Promise<{ success: boolean; message: string }> => {
  if (!key.trim()) return { success: false, message: 'La clave API está vacía.' };

  try {
    const text = await callGeminiAPI(key, 'Responde con {"status": "OK"}');
    if (text) {
      return { success: true, message: '¡Conexión exitosa con Google Gemini!' };
    }
    return { success: false, message: 'Respuesta vacía del servidor.' };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error al validar la clave API.'
    };
  }
};

/**
 * Decipher an unrecognized or ambiguous technical slang using Gemini AI
 */
export const decipherTermWithAI = async (
  term: string,
  rawLine: string
): Promise<AISuggestion> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('No se ha detectado la clave VITE_GEMINI_API_KEY en el archivo .env. Por favor configúrala para habilitar el descifrado automático.');
  }

  // 1. Gather relevant candidate products from the 4,337 inventory items
  const allItems = getCatalogData();
  const words = term.split(/\s+/).filter(w => w.length > 2);
  const candidateMap = new Map<string, CatalogItem>();

  // Fuzzy candidates
  const fuzzy = searchCatalogFuzzy(term, 20);
  fuzzy.forEach(f => candidateMap.set(f.item.cod_arti, f.item));

  // Word-based candidates
  words.forEach(word => {
    const wordFuzzy = searchCatalogFuzzy(word, 8);
    wordFuzzy.forEach(f => candidateMap.set(f.item.cod_arti, f.item));
  });

  if (candidateMap.size < 10) {
    allItems.slice(0, 30).forEach(i => candidateMap.set(i.cod_arti, i));
  }

  const candidateList = Array.from(candidateMap.values()).slice(0, 35).map(c => ({
    cod_arti: c.cod_arti,
    descripcion: c.descripcion,
    familia: c.familia,
    stock: c.stock,
    unidad: c.unidad
  }));

  const systemInstruction = `
Eres un especialista técnico en suministros industriales, ferretería, fontanería, electricidad y construcción.
Tu objetivo es analizar la jerga técnica, modismo o descripción imprecisa enviada por un técnico de campo y relacionarla con el artículo correspondiente en el catálogo oficial de inventario de la empresa.

Contexto del Pedido:
- Mensaje original: "${rawLine}"
- Término detectado: "${term}"

Muestra de artículos candidatos en inventario:
${JSON.stringify(candidateList, null, 2)}

Responde ÚNICAMENTE con un objeto JSON válido (sin formato markdown exterior) con la siguiente estructura exacta:
{
  "cod_arti": "CÓDIGO_OFICIAL",
  "descripcion": "DESCRIPCIÓN_OFICIAL",
  "explicacion": "Explicación técnica concisa de la equivalencia",
  "confianza": 85,
  "alias_sugerido": "término normalizado para guardar como alias"
}
`;

  const rawText = await callGeminiAPI(apiKey, systemInstruction);

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  const parsed: AISuggestion = JSON.parse(cleaned);

  const catalogItem = getCatalogItemByCode(parsed.cod_arti);
  if (catalogItem) {
    parsed.descripcion = catalogItem.descripcion;
  }

  return parsed;
};
