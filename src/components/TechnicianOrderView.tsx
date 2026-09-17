import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingBag,
  Check,
  X,
  User,
  Wrench,
  Layers,
  RotateCcw,
  CheckCircle2,
  Package,
  FileCheck,
  Smartphone,
  Download,
  Share2,
  FileText,
  MapPin,
  Clock
} from 'lucide-react';
import { CatalogItem } from '../types';
import { searchCatalogFuzzy, getCatalogData, initCatalog } from '../services/catalogService';
import { getAliases } from '../services/aliasService';
import { getProductImageUrl } from '../services/imageHelper';
import { 
  createTechnicianOrder, 
  TechnicianOrder, 
  CATALOG_SYNC_EVENT, 
  getTechnicianOrders, 
  TECHNICIAN_ORDERS_EVENT 
} from '../services/technicianOrderService';

interface TechnicianOrderViewProps {
  catalog?: CatalogItem[];
  isLoadingCatalog?: boolean;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
  onSwitchToWarehouse?: () => void;
}

interface CartItem {
  item: CatalogItem;
  quantity: number;
}

const TECH_NAME_STORAGE = 'app_technician_name_v1';
const TECH_SEDE_STORAGE = 'app_technician_sede_v1';
const CART_STORAGE = 'app_technician_cart_v1';

export const TechnicianOrderView: React.FC<TechnicianOrderViewProps> = ({
  catalog = [],
  isLoadingCatalog = false,
  onShowToast,
  onSwitchToWarehouse
}) => {
  const [techName, setTechName] = useState(() => localStorage.getItem(TECH_NAME_STORAGE) || '');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isApp);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          onShowToast('success', '¡App instalada con éxito!');
        }
      } catch {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<TechnicianOrder[]>(() => getTechnicianOrders());
  const [workOrder, setWorkOrder] = useState('');
  const [destination, setDestination] = useState(() => localStorage.getItem(TECH_SEDE_STORAGE) || '');
  const [submittedOrder, setSubmittedOrder] = useState<TechnicianOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [internalCatalog, setInternalCatalog] = useState<CatalogItem[]>([]);
  const secretClicksRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  const handleSecretTripleTap = () => {
    const now = Date.now();
    if (now - secretClicksRef.current.lastTime < 700) {
      secretClicksRef.current.count += 1;
    } else {
      secretClicksRef.current.count = 1;
    }
    secretClicksRef.current.lastTime = now;

    if (secretClicksRef.current.count >= 3) {
      secretClicksRef.current.count = 0;
      if (onSwitchToWarehouse) {
        onSwitchToWarehouse();
      }
    }
  };

  useEffect(() => {
    if (catalog && catalog.length > 0) {
      setInternalCatalog(catalog);
    } else {
      const current = getCatalogData();
      if (current.length > 0) {
        setInternalCatalog(current);
      } else {
        initCatalog().then((loaded) => {
          setInternalCatalog(loaded);
        });
      }
    }
  }, [catalog]);

  useEffect(() => {
    const handleCatalogSync = () => {
      initCatalog().then((loaded) => {
        setInternalCatalog(loaded);
      });
    };

    const handleOrdersUpdate = () => {
      setHistoryOrders(getTechnicianOrders());
    };

    window.addEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
    window.addEventListener(TECHNICIAN_ORDERS_EVENT, handleOrdersUpdate);
    window.addEventListener('storage', handleOrdersUpdate);
    return () => {
      window.removeEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
      window.removeEventListener(TECHNICIAN_ORDERS_EVENT, handleOrdersUpdate);
      window.removeEventListener('storage', handleOrdersUpdate);
    };
  }, []);

  const myOrders = useMemo(() => {
    return [...historyOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [historyOrders]);

  // Map of colloquial names / aliases per product code (displays 2-3 most used)
  const productAliasesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const allAliases = getAliases();
    allAliases.forEach((a) => {
      const code = a.cod_arti.toUpperCase().trim();
      if (!map.has(code)) map.set(code, []);
      const list = map.get(code)!;
      const clean = a.alias.trim();
      if (!list.includes(clean) && clean.length <= 25) {
        list.push(clean);
      }
    });
    return map;
  }, [internalCatalog]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE, JSON.stringify(cart));
  }, [cart]);


  const categories = [
    { id: 'TODOS', label: 'Todo el Catálogo' },
    { id: '011=CINTAS', label: 'Cintas' },
    { id: '001=CURVAS', label: 'Curvas y Tubos' },
    { id: '301=LIMPIEZA', label: 'Limpieza y Desatorador' },
    { id: '002=ABRAZADERAS', label: 'Abrazaderas' },
    { id: '008=PEGAMENTOS', label: 'Pegamentos y Siliconas' },
    { id: '014=HERRAMIENTAS', label: 'Herramientas' }
  ];

  const isSameItem = (a: CatalogItem, b: CatalogItem) => {
    return a.cod_arti === b.cod_arti && (a.almacen || '') === (b.almacen || '') && a.descripcion === b.descripcion;
  };

  const getItemCartKey = (item: CatalogItem) => {
    return `${item.almacen || '01'}_${item.cod_arti}_${item.descripcion}`;
  };

  // The technician ordering portal consolidates all materials, tools and equipment
  // while deduplicating exact identical items across warehouses and keeping CIN01 as the sole electrical tape
  const techCatalog = useMemo(() => {
    const current = internalCatalog.length > 0 ? internalCatalog : getCatalogData();
    const seen = new Set<string>();
    const list: CatalogItem[] = [];

    current.forEach((item) => {
      const key = item.cod_arti.toUpperCase().trim();
      const desc = item.descripcion.toUpperCase().trim();

      // Exclude other cinta aislante codes (strictly CIN01 for cinta aislante)
      if (key !== 'CIN01' && desc.includes('CINTA AISLANTE')) {
        return;
      }

      // Deduplicate exact same item (same code + same description)
      const dedupKey = `${key}|||${desc}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        list.push(item);
      }
    });

    return list;
  }, [internalCatalog]);

  const searchResults = useMemo(() => {
    const allAliases = getAliases();
    const q = searchTerm.trim().toUpperCase();

    if (q.length > 0) {
      const aliasMatches = allAliases.filter((a) => a.alias.toUpperCase().includes(q));
      const finalMap = new Map<string, { item: CatalogItem; score: number; matchedAlias?: string }>();

      aliasMatches.forEach((am) => {
        const foundList = techCatalog.filter((c) => c.cod_arti.toUpperCase() === am.cod_arti.toUpperCase());
        foundList.forEach(found => {
          finalMap.set(getItemCartKey(found), { item: found, score: 600, matchedAlias: am.alias });
        });
      });

      const terms = q.split(/\s+/).filter(Boolean);

      techCatalog.forEach((item) => {
        const cod = item.cod_arti.toUpperCase().trim();
        const desc = item.descripcion.toUpperCase().trim();
        const fam = (item.familia || '').toUpperCase().trim();

        let score = 0;

        // 1. Exact full description match
        if (desc === q) score = 1000;
        // 2. Exact code match
        else if (cod === q) score = 900;
        // 3. Description starts with search query (e.g. "EXTRACTOR DE AIRE...")
        else if (desc.startsWith(q)) score = 500;
        // 4. Code starts with search query
        else if (cod.startsWith(q)) score = 400;
        // 5. Whole word match in description
        else if (new RegExp(`(?:^|\\s)${q}(?:$|\\s|\\,|\\.|\\-)`).test(desc)) score = 300;
        // 6. Substring in description
        else if (desc.includes(q)) score = 200;
        // 7. All search terms in description
        else if (terms.length > 1 && terms.every(t => desc.includes(t))) score = 150;
        // 8. Code contains search query
        else if (cod.includes(q)) score = 100;
        // 9. All terms found across desc, cod, fam
        else if (terms.every(t => desc.includes(t) || cod.includes(t) || fam.includes(t))) {
          score = 20; // Lower tier if only matched via family/category
        }

        const itemKey = getItemCartKey(item);
        const existing = finalMap.get(itemKey);
        if (score > 0 && (!existing || score > existing.score)) {
          finalMap.set(itemKey, { item, score });
        }
      });

      // Sort by score descending!
      let scoredList = Array.from(finalMap.values()).sort((a, b) => b.score - a.score);

      if (selectedCategory !== 'TODOS') {
        const famKey = selectedCategory.split('=')[1] || selectedCategory;
        scoredList = scoredList.filter((r) => (r.item.familia || '').toUpperCase().includes(famKey));
      }

      return scoredList.slice(0, 60).map((r) => r.item);
    }

    const POPULAR_PRIORITY_CODES = [
      'CIN01', // Cinta aislante 1000
      'CIN06', // Cinta teflon
      'CIN02', // Cinta aluminio
      'EXT15', // Extension electrica
      'DES01', // Desatorador Sapolio
      'TRAP01', // Trapo blanco
      'TRAP02', // Trapo color
      'PEG01', // Pegamento PVC / Africano
      'SIL01', // Silicona
      'CUR06', // Curva 3/4"
      'CUR09', // Curva 1/2"
      'CUR07', // Curva 1"
      'UNI47', // Union conduit 1
      'BRA01', // Abrazadera
      'PER01'  // Perno
    ];

    if (selectedCategory !== 'TODOS') {
      const famKey = selectedCategory.split('=')[1] || selectedCategory;
      return techCatalog.filter((i) => (i.familia || '').toUpperCase().includes(famKey)).slice(0, 60);
    }

    // Default view: Prioritize the most requested/popular items
    const aliasCodes = new Set(allAliases.map((a) => a.cod_arti.toUpperCase().trim()));
    const sorted = [...techCatalog].sort((a, b) => {
      const codeA = a.cod_arti.toUpperCase().trim();
      const codeB = b.cod_arti.toUpperCase().trim();
      const descA = a.descripcion.toLowerCase();
      const descB = b.descripcion.toLowerCase();

      const idxA = POPULAR_PRIORITY_CODES.indexOf(codeA);
      const idxB = POPULAR_PRIORITY_CODES.indexOf(codeB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      let scoreA = 0;
      let scoreB = 0;
      if (aliasCodes.has(codeA)) scoreA += 200;
      if (aliasCodes.has(codeB)) scoreB += 200;

      if (descA.includes('cinta')) scoreA += 100;
      if (descB.includes('cinta')) scoreB += 100;
      if (descA.includes('teflon') || descA.includes('aislante')) scoreA += 90;
      if (descB.includes('teflon') || descB.includes('aislante')) scoreB += 90;
      if (descA.includes('trapo')) scoreA += 80;
      if (descB.includes('trapo')) scoreB += 80;
      if (descA.includes('extension')) scoreA += 78;
      if (descB.includes('extension')) scoreB += 78;
      if (descA.includes('desatorador')) scoreA += 75;
      if (descB.includes('desatorador')) scoreB += 75;
      if (descA.includes('silicona') || descA.includes('pegamento')) scoreA += 70;
      if (descB.includes('silicona') || descB.includes('pegamento')) scoreB += 70;
      if (descA.includes('curva') || descA.includes('tubo')) scoreA += 50;
      if (descB.includes('curva') || descB.includes('tubo')) scoreB += 50;

      if (a.stock > 0) scoreA += 10;
      if (b.stock > 0) scoreB += 10;

      return scoreB - scoreA;
    });

    return sorted.slice(0, 48);
  }, [searchTerm, selectedCategory, techCatalog]);

  const getItemQuantityInCart = (item: CatalogItem): number => {
    const found = cart.find((c) => isSameItem(c.item, item));
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => isSameItem(c.item, item));
      if (existing) {
        return prev.map((c) => (isSameItem(c.item, item) ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (item: CatalogItem, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(item);
      return;
    }
    setCart((prev) => prev.map((c) => (isSameItem(c.item, item) ? { ...c, quantity: qty } : c)));
  };

  const handleRemoveFromCart = (item: CatalogItem) => {
    setCart((prev) => prev.filter((c) => !isSameItem(c.item, item)));
  };

  const handleClearCart = () => {
    setCart([]);
    setIsCartOpen(false);
    setSubmittedOrder(null);
    onShowToast('info', 'Carrito vaciado');
  };

  const handleSendOrderToWarehouse = () => {
    if (cart.length === 0) {
      onShowToast('warning', 'El carrito está vacío', 'Agrega al menos un artículo antes de enviar.');
      return;
    }

    if (!techName.trim()) {
      onShowToast('warning', 'Nombre requerido', 'Por favor ingresa tu nombre de técnico para enviar la solicitud.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = createTechnicianOrder(
        techName.trim(),
        cart,
        workOrder.trim(),
        destination.trim()
      );
      setSubmittedOrder(created);
      setCart([]);
      setWorkOrder('');
      onShowToast(
        'success',
        '¡Solicitud enviada al Almacén!',
        `Código ${created.orderNumber} recibido en el panel de almacén.`
      );
    } catch (e: any) {
      console.error(e);
      onShowToast('error', 'Error al enviar pedido', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItemsCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div
                onClick={handleSecretTripleTap}
                className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center shadow-inner cursor-pointer select-none shrink-0"
                title="Materiales"
              >
                <Wrench className="w-5 h-5 text-neutral-200" />
              </div>
              <div>
                <h1
                  onClick={handleSecretTripleTap}
                  className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight select-none cursor-pointer"
                >
                  Solicitud de Materiales
                </h1>
                <p className="text-[11px] text-neutral-400">
                  Catálogo rápido para técnicos en campo
                </p>
              </div>
            </div>

            {/* Header Actions: Mis Pedidos & Install App */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Ver mi historial de pedidos"
              >
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>Mis Pedidos</span>
                {myOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-white text-black rounded-full font-mono text-[10px] font-bold">
                    {myOrders.length}
                  </span>
                )}
              </button>

              {!isStandalone && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Instalar como App en el teléfono"
                >
                  <Smartphone className="w-4 h-4 text-neutral-400" />
                  <span>Instalar App</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por jerga, marca o código: teflón, cinta, drano, codo..."
                className="w-full pl-10 pr-10 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categories Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none mt-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === cat.id
                      ? 'bg-white text-black font-bold border-white shadow-sm'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-400 px-1">
          <span className="font-bold text-neutral-200">
            {searchTerm ? `Resultados para "${searchTerm}"` : 'Materiales Más Solicitados'}
          </span>
          {cart.length > 0 && (
            <span className="text-emerald-400 font-semibold font-mono text-xs">
              {cart.length} en carrito ({totalItemsCount} unid.)
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoadingCatalog && internalCatalog.length === 0 ? (
          <div className="p-16 text-center bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-3">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-400 font-mono">Cargando catálogo de materiales...</p>
          </div>
        ) : searchResults.length === 0 ? (
          /* Empty Search State */
          <div className="p-12 sm:p-16 text-center bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-base">
                No se encontraron artículos {searchTerm ? `para "${searchTerm}"` : ''}
              </p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Prueba buscando con palabras comunes, marcas o sinónimos (ej: pegamento, teflón, trapo).
              </p>
            </div>
          </div>
        ) : (
          /* Responsive Grid of Product Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {searchResults.map((item) => {
              const qtyInCart = getItemQuantityInCart(item);
              const imgUrl = getProductImageUrl(item);
              const itemKey = getItemCartKey(item);

              return (
                <div
                  key={itemKey}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    qtyInCart > 0
                      ? 'bg-neutral-900 border-neutral-600 ring-1 ring-white/10'
                      : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  {/* Product Photo Thumbnail */}
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center shadow-inner">
                    {imgUrl && !imgUrl.startsWith('data:image/svg') ? (
                      <img
                        src={imgUrl}
                        alt={item.descripcion}
                        className="w-full h-full object-cover bg-white"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-neutral-600 stroke-[1.5]" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-950/90 text-neutral-300 border border-neutral-800 backdrop-blur-xs">
                      {item.cod_arti}
                    </span>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {item.descripcion}
                      </h3>

                      {/* Colloquial Name Badges (up to 2 or 3) */}
                      {(() => {
                        const aliases = (productAliasesMap.get(item.cod_arti.toUpperCase().trim()) || []).slice(0, 3);
                        if (aliases.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {aliases.map((al, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700/70"
                              >
                                {al}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 flex items-center justify-end">
                      {qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-4 py-2 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Agregar</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-neutral-950 border border-neutral-700 rounded-xl p-1 gap-1.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item, qtyInCart - 1)}
                            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-sm text-white">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item, qtyInCart + 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-neutral-200 text-black flex items-center justify-center font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setSubmittedOrder(null);
                setIsCartOpen(true);
              }}
              className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center text-xs font-bold font-mono">
                  {cart.length}
                </div>
                <span>Ver Pedido ({totalItemsCount} unid.)</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span>Continuar</span>
                <Send className="w-4 h-4 fill-black" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Slide-Up Cart Sheet Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-neutral-300" />
                <h3 className="font-bold text-base text-white">
                  {submittedOrder ? 'Solicitud Confirmada' : `Resumen de Solicitud (${cart.length} artículos)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setSubmittedOrder(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {submittedOrder ? (
              /* SUCCESS STATE */
              <div className="p-6 sm:p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800 text-white border border-neutral-700 mx-auto flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-neutral-200" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                    {submittedOrder.orderNumber}
                  </span>
                  <h4 className="text-xl font-bold text-white">
                    Pedido Enviado al Almacén
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Tu solicitud ha llegado directamente al panel de pedidos del almacén para su despacho.
                  </p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Técnico:</span>
                    <strong className="text-white">{submittedOrder.technicianName}</strong>
                  </div>
                  {submittedOrder.workOrder && (
                    <div className="flex justify-between text-neutral-400">
                      <span>OT:</span>
                      <strong className="text-white">{submittedOrder.workOrder}</strong>
                    </div>
                  )}
                  {submittedOrder.destination && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Sede / Llegada:</span>
                      <strong className="text-white">{submittedOrder.destination}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>Total artículos:</span>
                    <strong className="text-white">
                      {submittedOrder.totalItems} ({submittedOrder.totalUnits} unidades)
                    </strong>
                  </div>
                  {submittedOrder.note && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Nota:</span>
                      <span className="text-neutral-200 italic">{submittedOrder.note}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setIsCartOpen(false);
                  }}
                  className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Entendido / Hacer Otro Pedido
                </button>
              </div>
            ) : (
              /* REGULAR CART FLOW */
              <>
                {/* Modal Scrollable Items List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Formulario de Datos: Técnico, OT, Sede */}
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                    {/* Nombre del Técnico */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Nombre del Técnico <span className="text-red-400 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={techName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTechName(val);
                          localStorage.setItem(TECH_NAME_STORAGE, val);
                        }}
                        placeholder="Ej: Fernando, Juan Pérez..."
                        autoFocus={!techName.trim()}
                        className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-neutral-500 rounded-xl text-xs sm:text-sm font-semibold text-white placeholder-neutral-500 outline-none transition-all"
                      />
                    </div>

                    {/* OT y Sede */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                          Orden de Trabajo (OT)
                        </label>
                        <input
                          type="text"
                          value={workOrder}
                          onChange={(e) => setWorkOrder(e.target.value)}
                          placeholder="Ej: OT-10492"
                          className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-neutral-500 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-neutral-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                          Sede / Punto de Llegada
                        </label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDestination(val);
                            localStorage.setItem(TECH_SEDE_STORAGE, val);
                          }}
                          placeholder="Ej: Sede Central"
                          className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-neutral-500 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-neutral-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {cart.map((c) => {
                      const imgUrl = getProductImageUrl(c.item);
                      const itemKey = getItemCartKey(c.item);
                      return (
                        <div
                          key={itemKey}
                          className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-3"
                        >
                          {imgUrl && !imgUrl.startsWith('data:image/svg') ? (
                            <img
                              src={imgUrl}
                              alt={c.item.descripcion}
                              className="w-12 h-12 rounded-lg object-cover bg-white border border-neutral-800 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{c.item.descripcion}</p>
                            <p className="text-[11px] font-mono text-neutral-400">
                              [{c.item.cod_arti}] • {c.item.unidad || 'UND'}
                            </p>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(c.item, c.quantity - 1)}
                              className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-xs text-white">
                              {c.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(c.item, c.quantity + 1)}
                              className="w-6 h-6 rounded bg-white hover:bg-neutral-200 text-black font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(c.item)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Modal Footer / Direct Warehouse Submission */}
                <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 space-y-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting || cart.length === 0}
                    onClick={handleSendOrderToWarehouse}
                    className="w-full py-3.5 px-4 bg-white hover:bg-neutral-200 active:scale-98 disabled:opacity-40 text-black font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-4 h-4 stroke-[2.5]" />
                    <span>Enviar Pedido al Almacén</span>
                  </button>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1.5 py-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Vaciar Carrito</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Install App Guide Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-neutral-200" />
                <h3 className="font-bold text-base text-white">Instalar App en el Celular</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Para tener acceso directo en tu pantalla de inicio como una aplicación nativa:
            </p>

            {/* Android Instructions */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                En Android (Google Chrome / Brave / Edge)
              </span>
              <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                <li>Toca el menú de <strong>3 puntos (⋮)</strong> arriba a la derecha.</li>
                <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
                <li>Confirma en <strong>Instalar</strong>.</li>
              </ol>
            </div>

            {/* iPhone Instructions */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                En iPhone / iPad (Safari)
              </span>
              <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                <li>Toca el botón <strong>Compartir</strong> (ícono [↑]).</li>
                <li>Desliza hacia abajo y toca <strong>"Agregar a pantalla de inicio"</strong> (+).</li>
                <li>Toca <strong>"Agregar"</strong> arriba a la derecha.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Order History Slide-Up / Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-neutral-300" />
                <h3 className="font-bold text-base text-white">
                  Historial de Pedidos ({myOrders.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {myOrders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 mx-auto flex items-center justify-center text-neutral-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">No tienes pedidos registrados</p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Tus solicitudes enviadas aparecerán aquí para que puedas consultar su estado y materiales.
                  </p>
                </div>
              ) : (
                myOrders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <div
                      key={order.id}
                      className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800/90 space-y-3 shadow-sm"
                    >
                      {/* Order Top Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                        <div>
                          <span className="font-mono font-bold text-xs text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                            {order.orderNumber}
                          </span>
                          <span className="text-[11px] text-neutral-400 ml-2">
                            {dateStr}
                          </span>
                        </div>

                        {/* Status badge */}
                        <div>
                          {order.status === 'attended' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Atendido</span>
                            </span>
                          ) : order.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                              <X className="w-3 h-3" />
                              <span>Cancelado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                        {order.workOrder && (
                          <div>
                            <span>OT: </span>
                            <strong className="text-white font-mono">{order.workOrder}</strong>
                          </div>
                        )}
                        {order.destination && (
                          <div>
                            <span>Sede: </span>
                            <strong className="text-white">{order.destination}</strong>
                          </div>
                        )}
                        <div>
                          <span>Técnico: </span>
                          <strong className="text-white">{order.technicianName}</strong>
                        </div>
                        <div>
                          <span>Total: </span>
                          <strong className="text-white">{order.totalItems} art. ({order.totalUnits} unid.)</strong>
                        </div>
                      </div>

                      {/* Items List inside Order */}
                      <div className="bg-neutral-900/80 rounded-xl p-2.5 border border-neutral-800/80 space-y-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                          Materiales solicitados:
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-neutral-300 py-0.5 border-b border-neutral-800/40 last:border-0">
                              <span className="truncate pr-2">{it.descripcion}</span>
                              <span className="font-mono font-bold text-white shrink-0">
                                {it.quantity} {it.unidad || 'UND'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
