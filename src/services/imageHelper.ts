import { CatalogItem } from '../types';

export const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  cinta_aislante_negra: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=350&auto=format&fit=crop&q=80',
  cinta_aluminio: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=350&auto=format&fit=crop&q=80',
  cinta_teflon: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=350&auto=format&fit=crop&q=80',
  cinta_masking: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=350&auto=format&fit=crop&q=80',
  cinta_vulcanizante: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=350&auto=format&fit=crop&q=80',

  desatorador: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=350&auto=format&fit=crop&q=80',
  trapo_blanco: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=350&auto=format&fit=crop&q=80',
  trapo_color: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=350&auto=format&fit=crop&q=80',

  pegamento: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=350&auto=format&fit=crop&q=80',
  silicona: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=350&auto=format&fit=crop&q=80',

  curva_conduit: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=80',
  union_conduit: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=350&auto=format&fit=crop&q=80',
  tuberia_conduit: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f3?w=350&auto=format&fit=crop&q=80',

  abrazadera: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=350&auto=format&fit=crop&q=80',
  perno: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=350&auto=format&fit=crop&q=80',
  herramientas: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=350&auto=format&fit=crop&q=80',
  cables: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=350&auto=format&fit=crop&q=80',
  valvulas: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=350&auto=format&fit=crop&q=80'
};

export const CODE_IMAGES: Record<string, string> = {
  CIN08: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=350&auto=format&fit=crop&q=80',
  CIN01: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=350&auto=format&fit=crop&q=80',
  CIN02: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=350&auto=format&fit=crop&q=80',
  DES01: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=350&auto=format&fit=crop&q=80',
  TRAP01: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=350&auto=format&fit=crop&q=80',
  TRAP02: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=350&auto=format&fit=crop&q=80',
  PEG01: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=350&auto=format&fit=crop&q=80',
  SIL01: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=350&auto=format&fit=crop&q=80',
  CUR01: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=80',
  CUR06: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=80',
  CUR07: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=80',
  CUR09: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=80',
  UNI47: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=350&auto=format&fit=crop&q=80',
  BRA01: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=350&auto=format&fit=crop&q=80',
  PER01: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=350&auto=format&fit=crop&q=80'
};

export const getProductImageUrl = (
  item: CatalogItem | { descripcion: string; cod_arti: string; familia?: string; foto?: string; imagen?: string; image_url?: string }
): string => {
  if (item.foto && item.foto.trim()) return item.foto.trim();
  if (item.imagen && item.imagen.trim()) return item.imagen.trim();
  if (item.image_url && item.image_url.trim()) return item.image_url.trim();

  const cod = item.cod_arti.toUpperCase().trim();
  const desc = item.descripcion.toLowerCase();
  const fam = (item.familia || '').toUpperCase();

  if (CODE_IMAGES[cod]) {
    return CODE_IMAGES[cod];
  }

  if (desc.includes('aluminio') && desc.includes('cinta')) return DEFAULT_PRODUCT_IMAGES.cinta_aluminio;
  if (desc.includes('teflon') || desc.includes('ptfe')) return DEFAULT_PRODUCT_IMAGES.cinta_teflon;
  if (desc.includes('masking')) return DEFAULT_PRODUCT_IMAGES.cinta_masking;
  if (desc.includes('aislante') || desc.includes('templex') || desc.includes('super 33') || desc.includes('vulcaniz')) {
    return DEFAULT_PRODUCT_IMAGES.cinta_aislante_negra;
  }
  if (desc.includes('desatorador') || desc.includes('sapolio') || cod.startsWith('DES')) return DEFAULT_PRODUCT_IMAGES.desatorador;
  if (desc.includes('trapo') && desc.includes('blanco')) return DEFAULT_PRODUCT_IMAGES.trapo_blanco;
  if (desc.includes('trapo')) return DEFAULT_PRODUCT_IMAGES.trapo_color;
  if (desc.includes('silicona') || desc.includes('sellador')) return DEFAULT_PRODUCT_IMAGES.silicona;
  if (desc.includes('pegamento') || desc.includes('africano') || desc.includes('cemento')) return DEFAULT_PRODUCT_IMAGES.pegamento;
  if (desc.includes('curva') || cod.startsWith('CUR')) return DEFAULT_PRODUCT_IMAGES.curva_conduit;
  if (desc.includes('union') || desc.includes('unión') || cod.startsWith('UNI')) return DEFAULT_PRODUCT_IMAGES.union_conduit;
  if (desc.includes('abrazadera') || cod.startsWith('BRA') || cod.startsWith('ABR')) return DEFAULT_PRODUCT_IMAGES.abrazadera;
  if (desc.includes('perno') || desc.includes('tornillo') || desc.includes('tuerca') || cod.startsWith('PER')) return DEFAULT_PRODUCT_IMAGES.perno;
  if (desc.includes('tubo') || desc.includes('conduit') || fam.includes('TUBERIA')) return DEFAULT_PRODUCT_IMAGES.tuberia_conduit;
  if (desc.includes('cable') || desc.includes('alambre') || fam.includes('CABLE')) return DEFAULT_PRODUCT_IMAGES.cables;
  if (desc.includes('valvula') || desc.includes('llave paso') || fam.includes('VALVULA')) return DEFAULT_PRODUCT_IMAGES.valvulas;

  if (fam.includes('CINTA')) return DEFAULT_PRODUCT_IMAGES.cinta_aislante_negra;
  if (fam.includes('CURVA')) return DEFAULT_PRODUCT_IMAGES.curva_conduit;
  if (fam.includes('LIMPIEZA')) return DEFAULT_PRODUCT_IMAGES.desatorador;
  if (fam.includes('PEGAMENTO')) return DEFAULT_PRODUCT_IMAGES.pegamento;
  if (fam.includes('HERRAMIENTA')) return DEFAULT_PRODUCT_IMAGES.herramientas;

  return DEFAULT_PRODUCT_IMAGES.herramientas;
};
