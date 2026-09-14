import { CatalogItem } from '../types';

// Clean neutral fallback placeholder icon (minimal box outline, no clipart, no text)
export const DEFAULT_PRODUCT_IMAGE = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2216%22%20fill%3D%22%2327272a%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L88%2046%20L88%2074%20L60%2088%20L32%2074%20L32%2046%20Z%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L60%2088%20M60%2060%20L88%2046%20M60%2060%20L32%2046%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E";

export const getProductImageUrl = (
  item: CatalogItem | { descripcion: string; cod_arti: string; familia?: string; foto?: string; imagen?: string; image_url?: string }
): string => {
  // ONLY return a photo if the user has explicitly uploaded a real photo
  if (item.foto && item.foto.trim() && !item.foto.startsWith('data:image/svg')) {
    return item.foto.trim();
  }
  if (item.imagen && item.imagen.trim() && !item.imagen.startsWith('data:image/svg')) {
    return item.imagen.trim();
  }
  if (item.image_url && item.image_url.trim() && !item.image_url.startsWith('data:image/svg')) {
    return item.image_url.trim();
  }

  // Pure clean neutral hardware box icon (no random stock photos, no guessing)
  return DEFAULT_PRODUCT_IMAGE;
};
