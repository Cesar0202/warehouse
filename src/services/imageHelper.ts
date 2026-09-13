import { CatalogItem } from '../types';

// Clean neutral fallback icon (minimal grey hardware outline, no clipart or text)
export const DEFAULT_PRODUCT_IMAGE = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2216%22%20fill%3D%22%2327272a%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L88%2046%20L88%2074%20L60%2088%20L32%2074%20L32%2046%20Z%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L60%2088%20M60%2060%20L88%2046%20M60%2060%20L32%2046%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E";

export const getProductImageUrl = (
  item: CatalogItem | { descripcion: string; cod_arti: string; familia?: string; foto?: string; imagen?: string; image_url?: string }
): string => {
  // 1. If explicit user-uploaded base64 or valid URL is set, return it
  if (item.foto && item.foto.trim() && !item.foto.includes('unsplash.com')) return item.foto.trim();
  if (item.imagen && item.imagen.trim() && !item.imagen.includes('unsplash.com')) return item.imagen.trim();
  if (item.image_url && item.image_url.trim() && !item.image_url.includes('unsplash.com')) return item.image_url.trim();

  const cod = item.cod_arti ? item.cod_arti.toUpperCase().trim() : '';
  const desc = (item.descripcion || '').toLowerCase();
  const fam = (item.familia || '').toUpperCase();

  // 2. Exact code matching to real photos in /productos/
  if (cod === 'CIN08' || cod === 'CIN01' || cod === 'CIN20' || cod === 'CIN21') {
    return '/productos/cinta_aislante.jpg';
  }
  if (cod === 'CIN02') return '/productos/cinta_aluminio.jpg';
  if (cod === 'CIN03') return '/productos/cinta_embalaje.jpg';
  if (cod === 'DES01' || cod.startsWith('DES')) return '/productos/desatorador.jpg';
  if (cod === 'TRAP01') return '/productos/trapo.jpg';
  if (cod === 'TRAP02') return '/productos/trapo_color.jpg';
  if (cod === 'PEG01' || cod.startsWith('PEG')) return '/productos/pegamento.jpg';
  if (cod === 'SIL01' || cod.startsWith('SIL')) return '/productos/silicona.jpg';
  if (cod.startsWith('CUR') || cod === 'CUR06' || cod === 'CUR07' || cod === 'CUR09') return '/productos/curva.jpg';
  if (cod.startsWith('UNI') || cod === 'UNI47') return '/productos/union.jpg';
  if (cod.startsWith('BRA') || cod.startsWith('ABR')) return '/productos/abrazadera.jpg';
  if (cod.startsWith('PER') || cod === 'PER01') return '/productos/perno.jpg';

  // 3. Keyword / Family matching to real photos
  if (desc.includes('aluminio') && desc.includes('cinta')) return '/productos/cinta_aluminio.jpg';
  if (desc.includes('teflon') || desc.includes('ptfe')) return '/productos/cinta_teflon.jpg';
  if (desc.includes('embalaje')) return '/productos/cinta_embalaje.jpg';
  if (desc.includes('aislante') || desc.includes('temflex') || desc.includes('super 33') || desc.includes('vulcaniz')) {
    return '/productos/cinta_aislante.jpg';
  }
  if (desc.includes('cinta') || fam.includes('CINTA')) return '/productos/cinta_aislante.jpg';
  if (desc.includes('desatorador') || desc.includes('sapolio') || desc.includes('drano') || fam.includes('LIMPIEZA')) {
    return '/productos/desatorador.jpg';
  }
  if (desc.includes('trapo') || fam.includes('TRAPO')) {
    return desc.includes('color') ? '/productos/trapo_color.jpg' : '/productos/trapo.jpg';
  }
  if (desc.includes('silicona') || desc.includes('sellador')) return '/productos/silicona.jpg';
  if (desc.includes('pegamento') || desc.includes('africano') || desc.includes('cemento') || fam.includes('PEGAMENTO')) {
    return '/productos/pegamento.jpg';
  }
  if (desc.includes('abrazadera') || fam.includes('ABRAZADERA')) return '/productos/abrazadera.jpg';
  if (desc.includes('perno') || desc.includes('tornillo') || desc.includes('tuerca')) return '/productos/perno.jpg';
  if (desc.includes('curva') || fam.includes('CURVA')) return '/productos/curva.jpg';
  if (desc.includes('union') || desc.includes('unión')) return '/productos/union.jpg';
  if (desc.includes('cable') || desc.includes('conductor') || fam.includes('CONDUCTOR') || fam.includes('CABLE')) return '/productos/cable.jpg';
  if (desc.includes('broca') || desc.includes('taladro')) return '/productos/broca.jpg';

  return DEFAULT_PRODUCT_IMAGE;
};
