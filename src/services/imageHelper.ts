import { CatalogItem } from '../types';

// Clean neutral fallback placeholder icon (minimal box outline, no clipart, no text)
export const DEFAULT_PRODUCT_IMAGE = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2216%22%20fill%3D%22%2327272a%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L88%2046%20L88%2074%20L60%2088%20L32%2074%20L32%2046%20Z%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M60%2032%20L60%2088%20M60%2060%20L88%2046%20M60%2060%20L32%2046%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E";

export const getProductImageUrl = (
  item: CatalogItem | { descripcion: string; cod_arti: string; familia?: string; foto?: string; imagen?: string; image_url?: string }
): string => {
  // 1. Custom photo uploaded by user (data URI or custom URL)
  if (item.foto && item.foto.trim() && !item.foto.startsWith('data:image/svg')) {
    return item.foto.trim();
  }
  if (item.imagen && item.imagen.trim() && !item.imagen.startsWith('data:image/svg')) {
    return item.imagen.trim();
  }
  if (item.image_url && item.image_url.trim() && !item.image_url.startsWith('data:image/svg')) {
    return item.image_url.trim();
  }

  const cod = (item.cod_arti || '').toUpperCase().trim();
  const desc = (item.descripcion || '').toLowerCase();
  const fam = (item.familia || '').toUpperCase();

  // 2. Exact code matching to authentic photos in /productos/
  if (cod === 'CIN08' || cod === 'CIN01' || cod === 'CIN20' || cod === 'CIN21') return '/productos/CIN08.jpg';
  if (cod === 'CIN02') return '/productos/CIN02.jpg';
  if (cod === 'CIN03') return '/productos/cinta_teflon.jpg';
  if (cod === 'DES01' || cod.startsWith('DES')) return '/productos/DES01.jpg';
  if (cod === 'TRAP01') return '/productos/TRAP01.jpg';
  if (cod === 'TRAP02') return '/productos/TRAP02.jpg';
  if (cod === 'PEG01' || cod.startsWith('PEG')) return '/productos/PEG01.jpg';
  if (cod === 'SIL01' || cod.startsWith('SIL')) return '/productos/SIL01.jpg';
  if (cod === 'CUR06') return '/productos/CUR06.jpg';
  if (cod === 'CUR07') return '/productos/CUR07.jpg';
  if (cod === 'CUR09') return '/productos/CUR09.jpg';
  if (cod === 'CUR01' || cod.startsWith('CUR')) return '/productos/curva.jpg';
  if (cod === 'UNI47' || cod.startsWith('UNI')) return '/productos/UNI47.jpg';
  if (cod === 'BRA01' || cod.startsWith('BRA') || cod.startsWith('ABR')) return '/productos/BRA01.jpg';
  if (cod === 'PER01' || cod.startsWith('PER')) return '/productos/PER01.jpg';

  // 3. Keyword / Family matching to real photos
  if (desc.includes('aluminio') && desc.includes('cinta')) return '/productos/cinta_aluminio.jpg';
  if (desc.includes('teflon') || desc.includes('ptfe') || desc.includes('teflón')) return '/productos/cinta_teflon.jpg';
  if (desc.includes('embalaje')) return '/productos/cinta_embalaje.jpg';
  if (desc.includes('aislante') || desc.includes('super 33') || desc.includes('temflex') || desc.includes('vulcaniz')) {
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
  if (desc.includes('tubo') || fam.includes('TUBO')) return '/productos/tubo.jpg';
  if (desc.includes('canaleta') || fam.includes('CANALETA')) return '/productos/canaleta.jpg';
  if (desc.includes('candado') || fam.includes('CANDADO')) return '/productos/candado.jpg';
  if (desc.includes('guante') || fam.includes('GUANTE')) return '/productos/guantes.jpg';
  if (desc.includes('cable') || desc.includes('conductor') || fam.includes('CONDUCTOR') || fam.includes('CABLE')) return '/productos/cable.jpg';
  if (desc.includes('broca') || desc.includes('taladro')) return '/productos/broca.jpg';

  return DEFAULT_PRODUCT_IMAGE;
};
