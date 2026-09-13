import { CatalogItem } from '../types';

const CATEGORY_IMAGES: Record<string, string> = {
  // Cintas
  '011=CINTAS': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=80',
  'cinta_aluminio': 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300&auto=format&fit=crop&q=80',
  'cinta_aislante': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=80',
  'cinta_teflon': 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=300&auto=format&fit=crop&q=80',
  
  // Curvas y Tuberias
  '001=CURVAS': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80',
  '005=TUBERIAS': 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f3?w=300&auto=format&fit=crop&q=80',
  '004=CONEXIONES': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80',
  
  // Limpieza y Químicos
  '301=LIMPIEZA': 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=300&auto=format&fit=crop&q=80',
  'desatorador': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
  '090=TRAPO': 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=300&auto=format&fit=crop&q=80',
  
  // Pegamentos y Siliconas
  '008=PEGAMENTOS': 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=300&auto=format&fit=crop&q=80',
  'silicona': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80',
  
  // Herramientas y Fijación
  '014=HERRAMIENTAS': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80',
  '002=ABRAZADERAS': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=300&auto=format&fit=crop&q=80',
  '003=PERNOS': 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=300&auto=format&fit=crop&q=80',
  
  // Electricidad
  '010=ELECTRICIDAD': 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=300&auto=format&fit=crop&q=80',
  '012=CABLES': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80',
  
  // Válvulas y Gasfitería
  '006=VALVULAS': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&auto=format&fit=crop&q=80',
  'griferia': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80'
};

export const getProductImageUrl = (item: CatalogItem | { descripcion: string; cod_arti: string; familia?: string }): string => {
  const desc = item.descripcion.toLowerCase();
  const cod = item.cod_arti.toUpperCase();
  const fam = (item.familia || '').toUpperCase();

  // 1. Specific product types
  if (desc.includes('aluminio') && desc.includes('cinta')) return CATEGORY_IMAGES.cinta_aluminio;
  if (desc.includes('teflon') || desc.includes('ptfe')) return CATEGORY_IMAGES.cinta_teflon;
  if (desc.includes('aislante') || desc.includes('vulcaniz')) return CATEGORY_IMAGES.cinta_aislante;
  if (desc.includes('desatorador') || desc.includes('sapolio') || cod.startsWith('DES')) return CATEGORY_IMAGES.desatorador;
  if (desc.includes('trapo') || fam.includes('TRAPO')) return CATEGORY_IMAGES['090=TRAPO'];
  if (desc.includes('silicona') || desc.includes('sellador')) return CATEGORY_IMAGES.silicona;
  if (desc.includes('abrazadera') || cod.startsWith('BRA') || cod.startsWith('ABR')) return CATEGORY_IMAGES['002=ABRAZADERAS'];
  if (desc.includes('perno') || desc.includes('tornillo') || desc.includes('tuerca')) return CATEGORY_IMAGES['003=PERNOS'];
  if (desc.includes('curva') || cod.startsWith('CUR')) return CATEGORY_IMAGES['001=CURVAS'];
  if (desc.includes('tubo') || desc.includes('conduit') || fam.includes('TUBERIA')) return CATEGORY_IMAGES['005=TUBERIAS'];
  if (desc.includes('valvula') || desc.includes('llave paso') || fam.includes('VALVULA')) return CATEGORY_IMAGES['006=VALVULAS'];
  if (desc.includes('cable') || desc.includes('alambre')) return CATEGORY_IMAGES['012=CABLES'];
  if (desc.includes('grifo') || desc.includes('caño') || desc.includes('lavatorio')) return CATEGORY_IMAGES.griferia;
  if (desc.includes('desarmador') || desc.includes('alicate') || desc.includes('disco') || desc.includes('broca')) return CATEGORY_IMAGES['014=HERRAMIENTAS'];

  // 2. Family match fallback
  for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
    if (key.includes('=') && fam.includes(key.split('=')[1])) {
      return url;
    }
  }

  return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80';
};
