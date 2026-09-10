import { ParsedLineResult, ConfidenceLevel } from '../types';
import { findExactAlias, findFuzzyAlias, normalizeString, getAliases } from './aliasService';
import { getCatalogItemByCode, searchCatalogFuzzy } from './catalogService';

interface ExtractedQuantity {
  qty: number;
  cleanedText: string;
}

/**
 * Smart Regex-based extraction of quantities and units
 * Handles:
 * - "drano 2 botellas", "2 botellas de drano", "- 2 franks", "- 4 curvas conduit de 3/4"
 * - "teflon 2 rollos", "1 union conduit de 1", "drano", "x3 cinta 3m", "sapolio 2 galones"
 */
export const extractQuantityAndTerm = (rawLine: string): ExtractedQuantity => {
  let text = rawLine.trim();

  // 1. Clean list bullets like '-', '*', '•', '+', '>', '[ ]', '[x]'
  text = text.replace(/^[\-\*•\+\>\[\]]+\s*/, '').trim();

  // 2. Clean numbered list markers like "1. ", "1) ", "1.- " BUT NOT "1 pulgada" or "2 franks"
  text = text.replace(/^\d+[\.\)]\s+/, '').trim();

  const unitPattern = '(?:und|unid|unidades|unidad|rollos|rollo|piezas|pzas|pza|tubos|tubo|paquetes|paq|cajas|cja|frascos|frasco|botellas|botella|bot|latas|lata|tarros|tarro|potes|pote|bidones|bidon|baldes|balde|galones|gal|litros|lt|lts|metros|mts|m|docenas|doc|pares|par|tiras|tira|varillas|varilla|planchas|plancha|juegos|juego|set|kit)';

  // Pattern 1: Leading quantity (e.g. "2 franks", "4 curvas conduit", "x3 cintas", "10 und abrazaderas", "2 botellas de drano")
  const leadingRegex = new RegExp(
    `^(?:cant(?:idad)?[\\:\\=\\s]+|x\\s*)?(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern}\\s+)?(?:de\\s+)?(.*)$`,
    'i'
  );
  let match = text.match(leadingRegex);
  if (match && match[2] && match[2].trim().length > 0) {
    const rawVal = match[1].replace(',', '.');
    const qty = parseFloat(rawVal) || 1;
    const term = match[2].trim();
    return { qty, cleanedText: term };
  }

  // Pattern 2: Trailing quantity (e.g. "drano 2 botellas", "drano 2", "teflon 2 rollos", "drano x 2", "curvas conduit cant 4")
  const trailingRegex = new RegExp(
    `^(.*?)\\s+(?:cant(?:idad)?[\\:\\=\\s]+|x\\s*)?(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern})?$`,
    'i'
  );
  match = text.match(trailingRegex);
  if (match && match[1] && match[2]) {
    const term = match[1].trim();
    // Don't treat pipe dimension "curva 3/4" as trailing qty
    if (!term.endsWith('/') && !term.match(/\b\d+$/)) {
      const rawVal = match[2].replace(',', '.');
      const qty = parseFloat(rawVal) || 1;
      return { qty, cleanedText: term };
    }
  }

  // Pattern 3: Infix quantity (e.g. "drano 2 botellas grandes", "curvas 4 un de 3/4")
  const infixRegex = new RegExp(
    `^([a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+?)\\s+(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitPattern})?\\s+(.+)$`,
    'i'
  );
  match = text.match(infixRegex);
  if (match && match[1] && match[2] && match[3]) {
    const term = `${match[1]} ${match[3]}`.trim();
    const rawVal = match[2].replace(',', '.');
    const qty = parseFloat(rawVal) || 1;
    return { qty, cleanedText: term };
  }

  return {
    qty: 1,
    cleanedText: text
  };
};

/**
 * Filter out pure conversational or greetings lines
 */
export const isIgnorableLine = (line: string): boolean => {
  const norm = normalizeString(line);
  if (!norm || norm.length < 2) return true;

  const greetings = [
    'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hola', 'saludos',
    'estimados', 'estimado', 'enviar para la sede', 'enviar para obra', 'adjunto pedido',
    'pedido para el dia', 'materiales para manana', 'materiales solicitados',
    'por favor enviar', 'gracias', 'atentamente', 'atte', 'saludos cordiales',
    'favor de despachar', 'nota', 'urgente', 'sede central', 'obra'
  ];

  if (greetings.some(g => norm === g || norm.startsWith(g + ' ') || norm.endsWith(' ' + g))) {
    if (!/\d/.test(line) && line.length < 35) {
      return true;
    }
  }

  return false;
};

/**
 * Smart Alias Token Finder
 * Checks if any registered alias is contained as an exact word / phrase inside the search string
 */
export const findContainedAlias = (searchTarget: string) => {
  const normTarget = normalizeString(searchTarget);
  const allAliases = getAliases();

  // Sort aliases by length descending so multi-word aliases match before single-word
  const sorted = [...allAliases].sort((a, b) => b.alias.length - a.alias.length);

  for (const item of sorted) {
    const normAlias = normalizeString(item.alias);
    if (!normAlias) continue;

    // Check if alias is present with word boundaries
    const regex = new RegExp(`(?:^|\\s)${normAlias}(?:$|\\s)`, 'i');
    if (regex.test(normTarget)) {
      return item;
    }
  }
  return null;
};

/**
 * Main Order Processing Pipeline
 */
export const processOrderText = (rawInputText: string): ParsedLineResult[] => {
  if (!rawInputText.trim()) return [];

  // Split lines by newline or semicolon
  const rawLines = rawInputText
    .split(/\r?\n|\;/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: ParsedLineResult[] = [];

  rawLines.forEach((line, idx) => {
    if (isIgnorableLine(line)) return;

    const { qty, cleanedText } = extractQuantityAndTerm(line);
    const searchTarget = cleanedText.length > 0 ? cleanedText : line;

    // STEP 1: Exact / Normalized Match in Aliases
    let matchedAlias = findExactAlias(searchTarget);

    // STEP 1.1: If not exact full string, check if an alias is contained as phrase (e.g. "drano 2 botellas")
    if (!matchedAlias) {
      matchedAlias = findContainedAlias(searchTarget) || undefined;
    }

    if (matchedAlias) {
      const catalogItem = getCatalogItemByCode(matchedAlias.cod_arti);
      if (catalogItem) {
        results.push({
          id: `line-${idx}-${Date.now()}-${Math.random()}`,
          rawLine: line,
          detectedTerm: searchTarget,
          requestedQty: qty,
          matchedItem: catalogItem,
          confidenceLevel: 'high',
          matchScore: 100,
          matchType: 'alias_exact',
          matchedViaAlias: matchedAlias.alias,
          selected: true
        });
        return;
      }
    }

    // STEP 2: Fuzzy Match in Aliases (Score >= 75%)
    const fuzzyAlias = findFuzzyAlias(searchTarget, 75);
    if (fuzzyAlias) {
      const catalogItem = getCatalogItemByCode(fuzzyAlias.alias.cod_arti);
      if (catalogItem) {
        results.push({
          id: `line-${idx}-${Date.now()}-${Math.random()}`,
          rawLine: line,
          detectedTerm: searchTarget,
          requestedQty: qty,
          matchedItem: catalogItem,
          confidenceLevel: fuzzyAlias.score >= 80 ? 'high' : 'medium',
          matchScore: fuzzyAlias.score,
          matchType: 'alias_fuzzy',
          matchedViaAlias: fuzzyAlias.alias.alias,
          selected: true
        });
        return;
      }
    }

    // STEP 3: Fuzzy Match in Official Catalog (Fuse.js on Descripción / Familia / Cod.Arti)
    const catalogMatches = searchCatalogFuzzy(searchTarget, 5);

    if (catalogMatches.length > 0) {
      const topMatch = catalogMatches[0];
      const alternatives = catalogMatches.slice(1);

      let confidenceLevel: ConfidenceLevel = 'low';
      if (topMatch.score >= 80) {
        confidenceLevel = 'high';
      } else if (topMatch.score >= 50) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }

      results.push({
        id: `line-${idx}-${Date.now()}-${Math.random()}`,
        rawLine: line,
        detectedTerm: searchTarget,
        requestedQty: qty,
        matchedItem: topMatch.score >= 50 ? topMatch.item : null,
        confidenceLevel,
        matchScore: topMatch.score,
        matchType: topMatch.score >= 50 ? 'catalog_fuzzy' : 'not_found',
        alternativeMatches: alternatives,
        selected: topMatch.score >= 50
      });
      return;
    }

    // Not found
    results.push({
      id: `line-${idx}-${Date.now()}-${Math.random()}`,
      rawLine: line,
      detectedTerm: searchTarget,
      requestedQty: qty,
      matchedItem: null,
      confidenceLevel: 'low',
      matchScore: 0,
      matchType: 'not_found',
      selected: false
    });
  });

  return results;
};
