import { AISuggestion, CatalogItem } from '../types';
import { getCatalogData, searchCatalogFuzzy, getCatalogItemByCode } from './catalogService';

const API_KEY_STORAGE_KEY = 'app_gemini_api_key_v1';
const WORKING_MODEL_STORAGE_KEY = 'app_gemini_working_model_v2';

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
    localStorage.removeItem(WORKING_MODEL_STORAGE_KEY);
  } else {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  }
};

export const hasGeminiApiKey = (): boolean => {
  return getGeminiApiKey().length > 5;
};

// Optimized candidate Gemini models for active Google AI Studio tier
const CANDIDATE_MODELS = [
  { version: 'v1beta', model: 'gemini-3.6-flash' },
  { version: 'v1beta', model: 'gemini-3.5-flash' },
  { version: 'v1beta', model: 'gemini-3.1-flash-lite' },
  { version: 'v1beta', model: 'gemini-flash-latest' },
  { version: 'v1beta', model: 'gemma-4-26b-a4b-it' }
];

let inMemoryWorkingModel: { version: string; model: string } | null = null;

// Initialize cached working model from localStorage
try {
  const savedModel = localStorage.getItem(WORKING_MODEL_STORAGE_KEY);
  if (savedModel) {
    inMemoryWorkingModel = JSON.parse(savedModel);
  }
} catch {
  // ignore
}

// Helper to robustly extract and parse JSON from Gemini text response
function extractAndParseJSON(rawText: string): any {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Execute Gemini API request trying available models with instant caching for maximum speed
 */
async function callGeminiAPI(apiKey: string, promptText: string): Promise<string> {
  const modelsToTry: { version: string; model: string }[] = [];

  if (inMemoryWorkingModel) {
    modelsToTry.push(inMemoryWorkingModel);
  }

  for (const m of CANDIDATE_MODELS) {
    if (!modelsToTry.some(existing => existing.model === m.model && existing.version === m.version)) {
      modelsToTry.push(m);
    }
  }

  let lastErrorMsg = '';

  for (const { version, model } of modelsToTry) {
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
            temperature: 0.0,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json'
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          // Cache this working model for instant zero-latency future calls
          inMemoryWorkingModel = { version, model };
          try {
            localStorage.setItem(WORKING_MODEL_STORAGE_KEY, JSON.stringify(inMemoryWorkingModel));
          } catch {
            // ignore
          }
          return text;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErrorMsg = errJson.error?.message || `Error ${res.status}: ${res.statusText}`;
        if (inMemoryWorkingModel && inMemoryWorkingModel.model === model) {
          inMemoryWorkingModel = null;
          try { localStorage.removeItem(WORKING_MODEL_STORAGE_KEY); } catch {}
        }
        // If model is busy (503), deprecated (404), rate-limited (429) or internal error (500), try next candidate
        if (res.status === 404 || res.status === 429 || res.status === 500 || res.status === 503) {
          continue;
        }
        if (res.status === 400 && lastErrorMsg.includes('API key')) {
          throw new Error('API Key de Google Gemini inválida.');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('API key')) {
        throw err;
      }
      lastErrorMsg = err.message || 'Error de conexión';
    }
  }

  throw new Error(lastErrorMsg || 'No se pudo conectar con los modelos de Google Gemini. Verifica tu conexión y API Key.');
}

/**
 * Test connectivity with Gemini API Key
 */
export const testGeminiApiKey = async (key: string): Promise<{ success: boolean; message: string }> => {
  if (!key.trim()) return { success: false, message: 'La clave API está vacía.' };

  try {
    const text = await callGeminiAPI(key, 'Responde con {"status": "OK"}');
    if (text) {
      return { success: true, message: '¡Conexión exitosa y ultrarrápida con Google Gemini!' };
    }
    return { success: false, message: 'Respuesta vacía del servidor.' };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error al validar la clave API.'
    };
  }
};

// Common technical slang synonyms to enrich search candidate retrieval
const SYNONYM_MAP: Record<string, string[]> = {
  'plateada': ['aluminio', 'duct tape', 'galvanizado', 'inox', 'zincado', 'gris'],
  'plateadas': ['aluminio', 'duct tape', 'galvanizado', 'inox', 'zincado', 'gris'],
  'plateado': ['aluminio', 'galvanizado', 'inox', 'zincado', 'duct tape', 'gris'],
  'plateados': ['aluminio', 'galvanizado', 'inox', 'zincado', 'duct tape', 'gris'],
  'platinada': ['aluminio', 'plateada', 'galvanizado', 'inox', 'duct tape'],
  'platinadas': ['aluminio', 'plateada', 'galvanizado', 'inox', 'duct tape'],
  'platinado': ['aluminio', 'plateado', 'galvanizado', 'inox'],
  'platinados': ['aluminio', 'plateado', 'galvanizado', 'inox'],
  'trapo': ['trapo industrial', 'color', 'blanco', 'colores'],
  'trapos': ['trapo industrial', 'color', 'blanco', 'colores'],
  'color': ['trapo industrial colores', 'trapo de color'],
  'colores': ['trapo industrial colores', 'trapo de color'],
  'blanco': ['trapo industrial blanco', 'trapo blanco', 'teflon', 'ptfe'],
  'blancos': ['trapo industrial blanco', 'trapo blanco', 'teflon', 'ptfe'],
  'cinta': ['cintas', 'aislante', 'aluminio', 'teflon', 'masking', 'vulcanizante'],
  'cintas': ['cinta', 'aislante', 'aluminio', 'teflon', 'masking', 'vulcanizante'],
  'aluminio': ['plateada', 'plateado', 'platinada', 'cinta aluminio'],
  'negra': ['aislante', 'vulcanizante', 'pvc'],
  'negras': ['aislante', 'vulcanizante', 'pvc'],
  'negro': ['aislante', 'vulcanizante', 'pvc'],
  'blanca': ['teflon', 'ptfe', 'selladora'],
  'blancas': ['teflon', 'ptfe', 'selladora'],
  'drano': ['desatorador', 'soda caustica', 'acido muriatico', 'sapolio'],
  'draino': ['desatorador', 'soda caustica', 'sapolio'],
  'franks': ['abrazadera', 'caddy', 'soporte'],
  'frank': ['abrazadera', 'caddy', 'soporte'],
  'huincha': ['cinta metrica', 'flexometro', 'cinta aislante'],
  'wincha': ['cinta metrica', 'flexometro', 'cinta aislante'],
  'desarmador': ['destornillador', 'plano', 'estrella', 'philips'],
  'desarmadores': ['destornillador', 'plano', 'estrella'],
  'alicate': ['pinza', 'corte', 'universal', 'presion'],
  'alicates': ['pinza', 'corte', 'universal', 'presion'],
  'perno': ['tornillo', 'hexagonal', 'autorroscante', 'esparrago'],
  'pernos': ['tornillo', 'hexagonal', 'autorroscante', 'esparrago'],
  'chapon': ['desatorador', 'sopapo', 'bomba'],
  'chupon': ['desatorador', 'sopapo'],
  'caño': ['grifo', 'griferia', 'llave lavatorio', 'valvula'],
  'caños': ['grifo', 'griferia', 'llave lavatorio', 'valvula'],
  'pico de loro': ['llave stilson', 'alicate extension', 'pinza bomba'],
  'francesa': ['llave inglesa', 'llave ajustable'],
  'inglesa': ['llave francesa', 'llave ajustable']
};

/**
 * Decipher an unrecognized or ambiguous technical slang using Gemini AI with ultra-targeted candidate retrieval
 */
export const decipherTermWithAI = async (
  term: string,
  rawLine: string
): Promise<AISuggestion> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('No se ha detectado la clave VITE_GEMINI_API_KEY. Configúrala en .env o en Configuración IA.');
  }

  const allItems = getCatalogData();
  const lowerTerm = term.toLowerCase();
  const rawWords = lowerTerm.split(/\s+/).filter(w => w.length > 1 && !['de', 'para', 'el', 'la', 'un', 'una', 'con', 'sin', 'los', 'las', 'kilos', 'kilo', 'kg', 'und'].includes(w));
  
  // Stemming: include singular / base forms
  const searchTokens = new Set<string>();
  rawWords.forEach(w => {
    searchTokens.add(w);
    if (w.endsWith('es') && w.length > 4) {
      searchTokens.add(w.slice(0, -2));
    } else if (w.endsWith('s') && w.length > 3) {
      searchTokens.add(w.slice(0, -1));
    }
  });

  const candidateMap = new Map<string, CatalogItem>();

  // 1. Direct and fuzzy search with the original term and rawLine
  const termMatches = searchCatalogFuzzy(term, 30);
  termMatches.forEach(f => candidateMap.set(f.item.cod_arti, f.item));

  if (rawLine && rawLine !== term) {
    const rawMatches = searchCatalogFuzzy(rawLine, 30);
    rawMatches.forEach(f => candidateMap.set(f.item.cod_arti, f.item));
  }

  // 2. Individual word fuzzy matches
  searchTokens.forEach(w => {
    const wordMatches = searchCatalogFuzzy(w, 20);
    wordMatches.forEach(f => candidateMap.set(f.item.cod_arti, f.item));
  });

  // 3. Synonym & attribute expansions
  searchTokens.forEach(w => {
    const synonyms = SYNONYM_MAP[w] || [];
    synonyms.forEach(syn => {
      const synMatches = searchCatalogFuzzy(syn, 20);
      synMatches.forEach(f => candidateMap.set(f.item.cod_arti, f.item));

      // Combination search (e.g., "trapo blanco", "trapo color")
      const firstToken = Array.from(searchTokens)[0];
      if (firstToken && firstToken !== w) {
        const comboMatches = searchCatalogFuzzy(`${firstToken} ${syn}`, 20);
        comboMatches.forEach(f => candidateMap.set(f.item.cod_arti, f.item));
      }
    });
  });

  // 4. Family-based enrichment: If matches contain specific families (e.g., TRAPO, CINTAS, TUBERIAS), pull items
  const matchedFamilies = new Set<string>();
  candidateMap.forEach(item => {
    if (item.familia) matchedFamilies.add(item.familia);
  });

  if (matchedFamilies.size > 0) {
    for (const item of allItems) {
      if (item.familia && matchedFamilies.has(item.familia)) {
        if (!candidateMap.has(item.cod_arti) && candidateMap.size < 90) {
          candidateMap.set(item.cod_arti, item);
        }
      }
    }
  }

  // Fallback if very few candidates
  if (candidateMap.size < 10) {
    allItems.slice(0, 40).forEach(i => candidateMap.set(i.cod_arti, i));
  }

  // Prepare clean compact candidate list (up to 90 items)
  const candidateList = Array.from(candidateMap.values()).slice(0, 90).map(c => ({
    cod_arti: c.cod_arti,
    descripcion: c.descripcion,
    familia: c.familia || '',
    stock: c.stock,
    unidad: c.unidad || 'UND'
  }));

  const systemInstruction = `
Eres un especialista técnico en suministros industriales, ferretería, fontanería, electricidad y construcción.
Tu tarea es mapear la jerga técnica, modismo o descripción imprecisa enviada por un técnico al artículo EXACTO o MÁS CERCANO del catálogo oficial.

Contexto del Pedido:
- Mensaje original: "${rawLine}"
- Término detectado: "${term}"

IMPORTANTE - DETECCIÓN DE MÚLTIPLES ARTÍCULOS EN UNA LÍNEA:
Si la línea solicita DOS O MÁS ARTÍCULOS DIFERENTES (ejemplos: "trapo de color y blanco", "trapo de color y trapo blanco", "cinta aislante y teflon", "desarmador plano y estrella", "abrazadera 1 pulgada y 1/2 pulgada"):
DEBES identificar CADA artículo por separado y devolver un objeto con la propiedad "items" conteniendo el array de cada artículo.

Reglas Técnicas Clave:
1. "trapo de color / colores" -> TRAP02 (TRAPO INDUSTRIAL COLORES).
2. "trapo blanco" -> TRAP01 (TRAPO INDUSTRIAL BLANCO).
3. "cinta plateada", "cinta platinada" o "cinta ducto/gris" -> CIN02 (CINTA DE ALUMINIO).
4. "cinta negra" -> CIN01 (CINTA AISLANTE).
5. "cinta blanca / teflon" -> CIN08 (CINTA TEFLÓN).
6. "drano / diablo rojo" -> DESATORADOR / SODA CÁUSTICA.
7. "huincha / wincha" -> CINTA MÉTRICA o CINTA AISLANTE según el contexto.
8. "desarmador" -> DESTORNILLADOR.
9. "franks" -> ABRAZADERAS.
10. Elige SIEMPRE el mejor "cod_arti" de la lista de candidatos adjunta.
11. REGLA ESTRICTA: La "explicacion" DEBE tener MÁXIMO 1 O 2 LÍNEAS (máximo 20 palabras).

Candidatos en inventario:
${JSON.stringify(candidateList, null, 1)}

Responde ÚNICAMENTE con un JSON en uno de estos dos formatos:

Formato A (Un solo artículo):
{
  "cod_arti": "CÓDIGO_DEL_CATÁLOGO",
  "descripcion": "DESCRIPCIÓN_OFICIAL",
  "cantidad": 1,
  "explicacion": "Explicación técnica en 1 línea.",
  "confianza": 95,
  "alias_sugerido": "término normalizado"
}

Formato B (Dos o más artículos en la misma línea):
{
  "items": [
    {
      "cod_arti": "CÓDIGO_1",
      "descripcion": "DESCRIPCIÓN_1",
      "cantidad": 1,
      "explicacion": "Explicación técnica en 1 línea.",
      "confianza": 95,
      "alias_sugerido": "término 1",
      "detectedTerm": "nombre artículo 1"
    },
    {
      "cod_arti": "CÓDIGO_2",
      "descripcion": "DESCRIPCIÓN_2",
      "cantidad": 1,
      "explicacion": "Explicación técnica en 1 línea.",
      "confianza": 95,
      "alias_sugerido": "término 2",
      "detectedTerm": "nombre artículo 2"
    }
  ]
}
`;

  const rawText = await callGeminiAPI(apiKey, systemInstruction);
  const parsed = extractAndParseJSON(rawText);

  if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
    parsed.items.forEach((sub: any) => {
      const cat = getCatalogItemByCode(sub.cod_arti);
      if (cat) sub.descripcion = cat.descripcion;
    });
    // Fill top-level fields from first item for safety
    parsed.cod_arti = parsed.items[0].cod_arti;
    parsed.descripcion = parsed.items[0].descripcion;
    parsed.explicacion = parsed.items[0].explicacion;
    parsed.confianza = parsed.items[0].confianza;
    parsed.aliasSugerido = parsed.items[0].alias_sugerido || parsed.items[0].aliasSugerido;
    return parsed as AISuggestion;
  }

  const catalogItem = getCatalogItemByCode(parsed.cod_arti);
  if (catalogItem) {
    parsed.descripcion = catalogItem.descripcion;
  }
  parsed.aliasSugerido = parsed.alias_sugerido || parsed.aliasSugerido;

  return parsed as AISuggestion;
};

