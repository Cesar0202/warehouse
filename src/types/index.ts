export interface CatalogItem {
  cod_arti: string;
  descripcion: string;
  familia: string;
  unidad: string;
  stock: number;
  ubicacion: string;
}

export interface AliasItem {
  alias: string;
  cod_arti: string;
  nota?: string;
  isCustom?: boolean;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AISuggestion {
  cod_arti: string;
  descripcion: string;
  explicacion: string;
  confianza: number;
  aliasSugerido: string;
}

export interface ParsedLineResult {
  id: string;
  rawLine: string;
  detectedTerm: string;
  requestedQty: number;
  matchedItem: CatalogItem | null;
  confidenceLevel: ConfidenceLevel; // 'high' (>=80% or exact alias), 'medium' (60-79%), 'low' (<60% or not found)
  matchScore: number; // 0 to 100
  matchType: 'alias_exact' | 'alias_fuzzy' | 'catalog_fuzzy' | 'ai_agent' | 'manual' | 'not_found';
  matchedViaAlias?: string;
  alternativeMatches?: {
    item: CatalogItem;
    score: number;
  }[];
  aiSuggestion?: AISuggestion;
  isDecipheringAI?: boolean;
  selected: boolean;
  notes?: string;
}

export interface ProcessingSummary {
  totalLines: number;
  highConfidence: number;
  mediumConfidence: number;
  unidentified: number;
  inStockCount: number;
  lowStockCount: number;
}
