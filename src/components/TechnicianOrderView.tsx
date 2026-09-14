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
  Share2
} from 'lucide-react';
import { CatalogItem } from '../types';
import { searchCatalogFuzzy, getCatalogData, initCatalog } from '../services/catalogService';
import { getAliases } from '../services/aliasService';
import { getProductImageUrl } from '../services/imageHelper';
import { createTechnicianOrder, TechnicianOrder } from '../services/technicianOrderService';

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
const CART_STORAGE = 'app_technician_cart_v1';

export const TechnicianOrderView: React.FC<TechnicianOrderViewProps> = ({
  catalog = [],
  isLoadingCatalog = false,
  onShowToast,
  onSwitchToWarehouse
}) => {
  const [techName, setTechName] = useState(() => localStorage.getItem(TECH_NAME_STORAGE) || '');
  const [isEditingNameHeader, setIsEditingNameHeader] = useState(!localStorage.getItem(TECH_NAME_STORAGE));
  const [isEditingNameModal, setIsEditingNameModal] = useState(false);
  const [tempModalName, setTempModalName] = useState(techName);

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
  const [orderNote, setOrderNote] = useState('');
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
    localStorage.setItem(CART_STORAGE, JSON.stringify(cart));
  }, [cart]);

  const handleSaveName = (name: string) => {
    const trimmed = name.trim();
    setTechName(trimmed);
    setTempModalName(trimmed);
    localStorage.setItem(TECH_NAME_STORAGE, trimmed);
    setIsEditingNameHeader(false);
    setIsEditingNameModal(false);
  };

  const categories = [
    { id: 'TODOS', label: 'Todo el Catálogo' },
    { id: '011=CINTAS', label: 'Cintas' },
    { id: '001=CURVAS', label: 'Curvas y Tubos' },
    { id: '301=LIMPIEZA', label: 'Limpieza y Desatorador' },
    { id: '002=ABRAZADERAS', label: 'Abrazaderas' },
    { id: '008=PEGAMENTOS', label: 'Pegamentos y Siliconas' },
    { id: '014=HERRAMIENTAS', label: 'Herramientas' }
  ];

  const searchResults = useMemo(() => {
    const currentCatalog = internalCatalog.length > 0 ? internalCatalog : getCatalogData();
    const allAliases = getAliases();
    const q = searchTerm.trim().toLowerCase();

    if (q.length > 0) {
      const matches = searchCatalogFuzzy(q, 60);
      const aliasMatches = allAliases.filter((a) => a.alias.toLowerCase().includes(q));
      const finalMap = new Map<string, { item: CatalogItem; score: number; matchedAlias?: string }>();

      aliasMatches.forEach((am) => {
        const found = currentCatalog.find((c) => c.cod_arti.toUpperCase() === am.cod_arti.toUpperCase());
        if (found) {
          finalMap.set(found.cod_arti, { item: found, score: 100, matchedAlias: am.alias });
        }
      });

      matches.forEach((m) => {
        if (!finalMap.has(m.item.cod_arti)) {
          finalMap.set(m.item.cod_arti, { item: m.item, score: m.score });
        }
      });

      let resultsList = Array.from(finalMap.values()).map((r) => r.item);

      if (selectedCategory !== 'TODOS') {
        const famKey = selectedCategory.split('=')[1] || selectedCategory;
        resultsList = resultsList.filter((i) => (i.familia || '').toUpperCase().includes(famKey));
      }

      return resultsList.slice(0, 60);
    }

    const POPULAR_PRIORITY_CODES = [
      'CIN08', // Cinta teflon
      'CIN01', // Cinta aislante negra
      'CIN02', // Cinta aluminio
      'DES01', // Desatorador Sapolio
      'TRAP01', // Trapo blanco
      'TRAP02', // Trapo color
      'PEG01', // Pegamento PVC
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
      return currentCatalog.filter((i) => (i.familia || '').toUpperCase().includes(famKey)).slice(0, 60);
    }

    // Default view: Prioritize the most requested/popular items
    const aliasCodes = new Set(allAliases.map((a) => a.cod_arti.toUpperCase().trim()));
    const sorted = [...currentCatalog].sort((a, b) => {
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
  }, [searchTerm, selectedCategory, internalCatalog]);

  const getItemQuantityInCart = (codArti: string): number => {
    const found = cart.find((c) => c.item.cod_arti === codArti);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.cod_arti === item.cod_arti);
      if (existing) {
        return prev.map((c) => (c.item.cod_arti === item.cod_arti ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (codArti: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(codArti);
      return;
    }
    setCart((prev) => prev.map((c) => (c.item.cod_arti === codArti ? { ...c, quantity: qty } : c)));
  };

  const handleRemoveFromCart = (codArti: string) => {
    setCart((prev) => prev.filter((c) => c.item.cod_arti !== codArti));
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
      setIsEditingNameModal(true);
      setTempModalName('');
      onShowToast('warning', 'Nombre requerido', 'Por favor ingresa tu nombre de técnico para registrar la solicitud.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = createTechnicianOrder(techName, cart, orderNote);
      setSubmittedOrder(created);
      setCart([]);
      setOrderNote('');
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

            {/* Prominent Technician Name Box & Install App Button */}
            <div className="flex flex-wrap items-center gap-2">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Instalar como App en el teléfono"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Instalar App</span>
                </button>
              )}

              <div className="bg-neutral-800/95 border border-neutral-700 rounded-xl px-3.5 py-2 flex items-center justify-between sm:justify-start gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-neutral-400 font-medium">Técnico:</span>
                </div>
                {isEditingNameHeader ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveName(techName);
                    }}
                    className="flex items-center gap-1.5 flex-1 max-w-xs"
                  >
                    <input
                      type="text"
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      placeholder="Escribe tu nombre..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-600 rounded-lg text-xs sm:text-sm font-semibold text-white outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                      title="Guardar nombre"
                    >
                      Guardar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingNameHeader(true)}
                    className="flex items-center gap-2 font-bold text-sm text-white hover:text-neutral-200 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {techName || 'Toca aquí para poner tu nombre'}
                    </span>
                    <span className="text-xs text-blue-400 font-medium underline underline-offset-2">
                      (Cambiar)
                    </span>
                  </button>
                )}
              </div>
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
              const qtyInCart = getItemQuantityInCart(item.cod_arti);
              const imgUrl = getProductImageUrl(item);

              return (
                <div
                  key={item.cod_arti}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    qtyInCart > 0
                      ? 'bg-neutral-900 border-emerald-500/80 ring-1 ring-emerald-500/30'
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
                            onClick={() => handleUpdateQuantity(item.cod_arti, qtyInCart - 1)}
                            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono font-extrabold text-sm text-emerald-400">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.cod_arti, qtyInCart + 1)}
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
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs font-bold">
                  {cart.length}
                </div>
                <span>Ver Mi Pedido ({totalItemsCount} unid.)</span>
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
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
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
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-800 text-emerald-400 border border-neutral-700">
                    {submittedOrder.orderNumber}
                  </span>
                  <h4 className="text-xl font-extrabold text-white">
                    ¡Pedido Enviado al Almacén!
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
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Entendido / Hacer Otro Pedido
                </button>
              </div>
            ) : (
              /* REGULAR CART FLOW */
              <>
                {/* Modal Scrollable Items List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Technician Info Box with Inline Editing */}
                  <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
                    {isEditingNameModal ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveName(tempModalName);
                        }}
                        className="space-y-2"
                      >
                        <label className="block text-[11px] font-semibold text-neutral-400">
                          Tu Nombre o Código de Técnico:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempModalName}
                            onChange={(e) => setTempModalName(e.target.value)}
                            placeholder="Escribe tu nombre..."
                            autoFocus
                            className="flex-1 px-3.5 py-2 bg-neutral-900 border border-emerald-500 rounded-xl text-xs sm:text-sm font-bold text-white outline-none"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl cursor-pointer shrink-0"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempModalName(techName);
                              setIsEditingNameModal(false);
                            }}
                            className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-800 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-neutral-800 text-emerald-400 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                              Técnico Responsable
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {techName || <span className="text-amber-400 italic">No especificado</span>}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTempModalName(techName);
                            setIsEditingNameModal(true);
                          }}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-neutral-700"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-2.5">
                    {cart.map((c) => {
                      const imgUrl = getProductImageUrl(c.item);
                      return (
                        <div
                          key={c.item.cod_arti}
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
                              onClick={() => handleUpdateQuantity(c.item.cod_arti, c.quantity - 1)}
                              className="w-6 h-6 rounded bg-neutral-800 text-white flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-xs text-emerald-400">
                              {c.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(c.item.cod_arti, c.quantity + 1)}
                              className="w-6 h-6 rounded bg-white text-black font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(c.item.cod_arti)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Note */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                      Nota u Observación (Opcional):
                    </label>
                    <input
                      type="text"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Ej: Piso 3, urgente, proyecto central..."
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:border-neutral-500 outline-none"
                    />
                  </div>
                </div>

                {/* Modal Footer / Direct Warehouse Submission */}
                <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 space-y-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting || cart.length === 0}
                    onClick={handleSendOrderToWarehouse}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
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
                <Smartphone className="w-5 h-5 text-blue-400" />
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
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                📱 En Android (Google Chrome / Brave / Edge)
              </span>
              <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                <li>Toca el menú de <strong>3 puntos (⋮)</strong> arriba a la derecha.</li>
                <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
                <li>Confirma en <strong>Instalar</strong>.</li>
              </ol>
            </div>

            {/* iPhone Instructions */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                🍏 En iPhone / iPad (Safari)
              </span>
              <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                <li>Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba <strong>[↑]</strong>).</li>
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
    </div>
  );
};
