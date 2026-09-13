import React, { useState, useMemo, useEffect } from 'react';
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
  Phone,
  ClipboardCopy,
  RotateCcw,
  Warehouse,
  CheckCircle2,
  Package,
  MapPin,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CatalogItem } from '../types';
import { searchCatalogFuzzy, getCatalogData, initCatalog } from '../services/catalogService';
import { getAliases } from '../services/aliasService';
import { getProductImageUrl } from '../services/imageHelper';

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
const WAREHOUSE_PHONE_STORAGE = 'app_warehouse_whatsapp_phone_v1';
const CART_STORAGE = 'app_technician_cart_v1';

export const TechnicianOrderView: React.FC<TechnicianOrderViewProps> = ({
  catalog = [],
  isLoadingCatalog = false,
  onShowToast,
  onSwitchToWarehouse
}) => {
  const [techName, setTechName] = useState(() => localStorage.getItem(TECH_NAME_STORAGE) || '');
  const [isEditingName, setIsEditingName] = useState(!localStorage.getItem(TECH_NAME_STORAGE));
  const [warehousePhone, setWarehousePhone] = useState(() => localStorage.getItem(WAREHOUSE_PHONE_STORAGE) || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

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
  const [internalCatalog, setInternalCatalog] = useState<CatalogItem[]>([]);

  // Ensure catalog is initialized
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
    localStorage.setItem(TECH_NAME_STORAGE, trimmed);
    setIsEditingName(false);
  };

  const handleSavePhone = (phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    setWarehousePhone(clean);
    localStorage.setItem(WAREHOUSE_PHONE_STORAGE, clean);
    setIsEditingPhone(false);
    onShowToast('success', 'Número de WhatsApp guardado');
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

    if (selectedCategory !== 'TODOS') {
      const famKey = selectedCategory.split('=')[1] || selectedCategory;
      return currentCatalog.filter((i) => (i.familia || '').toUpperCase().includes(famKey)).slice(0, 60);
    }

    // Default view: show catalog items with stock or first batch
    const inStock = currentCatalog.filter((i) => i.stock > 0);
    if (inStock.length > 0) {
      return inStock.slice(0, 48);
    }
    return currentCatalog.slice(0, 48);
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
    onShowToast('info', 'Carrito vaciado');
  };

  const generateWhatsAppMessage = () => {
    const dateStr = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let msg = `*SOLICITUD DE MATERIALES - CAMPO*\n`;
    msg += `------------------------------------\n`;
    msg += `*Técnico:* ${techName ? techName.toUpperCase() : 'NO ESPECIFICADO'}\n`;
    msg += `*Fecha/Hora:* ${dateStr}\n`;
    if (orderNote.trim()) {
      msg += `*Nota:* ${orderNote.trim()}\n`;
    }
    msg += `------------------------------------\n\n`;
    msg += `*DETALLE DEL PEDIDO:*\n`;

    cart.forEach((c, idx) => {
      msg += `${idx + 1}. [${c.item.cod_arti}] ${c.item.descripcion}\n`;
      msg += `   *Cantidad:* ${c.quantity} ${c.item.unidad || 'UND'}`;
      if (c.item.ubicacion) {
        msg += ` | *Ubicación:* ${c.item.ubicacion}`;
      }
      msg += `\n`;
    });

    const totalUnits = cart.reduce((acc, c) => acc + c.quantity, 0);
    msg += `\n------------------------------------\n`;
    msg += `*Total de Artículos:* ${cart.length} (${totalUnits} unidades)\n`;
    msg += `_Enviado desde el Sistema de Pedidos de Campo_`;

    return msg;
  };

  const handleSendWhatsApp = () => {
    if (cart.length === 0) {
      onShowToast('warning', 'El carrito está vacío', 'Agrega al menos un artículo antes de enviar.');
      return;
    }

    if (!techName.trim()) {
      setIsEditingName(true);
      onShowToast('warning', 'Nombre requerido', 'Por favor ingresa tu nombre de técnico arriba.');
      return;
    }

    const message = generateWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);

    let phoneParam = warehousePhone ? warehousePhone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
    onShowToast('success', 'Abriendo WhatsApp...', 'Revisa el pedido y presiona enviar.');
  };

  const totalItemsCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Logo / Tech Info */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center shadow-inner">
                  <Wrench className="w-5 h-5 text-neutral-200" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                    Solicitud de Materiales
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Técnico:</span>
                    {isEditingName ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveName(techName);
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={techName}
                          onChange={(e) => setTechName(e.target.value)}
                          placeholder="Tu nombre..."
                          autoFocus
                          className="w-32 px-2 py-0.5 bg-neutral-800 border border-neutral-600 rounded text-xs text-white outline-none focus:border-white"
                        />
                        <button
                          type="submit"
                          className="p-1 bg-white text-black hover:bg-neutral-200 rounded text-xs font-bold cursor-pointer"
                          title="Guardar nombre"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="font-semibold text-white underline underline-offset-2 hover:text-neutral-300 cursor-pointer"
                      >
                        {techName || 'Ingresar nombre'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Warehouse switch button for mobile */}
              <div className="sm:hidden">
                {onSwitchToWarehouse && (
                  <button
                    type="button"
                    onClick={onSwitchToWarehouse}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-medium text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>Almacén</span>
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Warehouse button */}
            <div className="hidden sm:flex items-center gap-3">
              {onSwitchToWarehouse && (
                <button
                  type="button"
                  onClick={onSwitchToWarehouse}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Panel de Almacén</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="mt-3.5 sm:mt-4">
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
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <span>
            {searchTerm
              ? `Resultados para "${searchTerm}" (${searchResults.length} artículos)`
              : `Catálogo de Materiales (${searchResults.length} artículos disponibles)`}
          </span>
          {cart.length > 0 && (
            <span className="text-emerald-400 font-semibold font-mono">
              {cart.length} en lista ({totalItemsCount} unid.)
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
              const hasStock = item.stock > 0;

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
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700/80 shrink-0">
                    <img
                      src={imgUrl}
                      alt={item.descripcion}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-950/90 text-neutral-300 border border-neutral-800">
                      {item.cod_arti}
                    </span>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {item.descripcion}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {/* Stock Badge */}
                        {hasStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Stock: {item.stock} {item.unidad || 'UND'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Agotado (0)
                          </span>
                        )}

                        {item.ubicacion && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700">
                            <MapPin className="w-2.5 h-2.5" />
                            {item.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-2 flex items-center justify-end">
                      {qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
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
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
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
                  Resumen de Solicitud ({cart.length} artículos)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Technician Info Box */}
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span>
                    Técnico: <strong className="text-white">{techName || 'No especificado'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-emerald-400 hover:underline text-[11px] font-semibold cursor-pointer"
                >
                  Cambiar
                </button>
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
                      <img
                        src={imgUrl}
                        alt={c.item.descripcion}
                        className="w-12 h-12 rounded-lg object-cover bg-neutral-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{c.item.descripcion}</p>
                        <p className="text-[11px] font-mono text-neutral-400">
                          [{c.item.cod_arti}] • Stock: {c.item.stock} {c.item.unidad || 'UND'}
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

              {/* Phone config */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Almacén:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(!isEditingPhone)}
                    className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    {isEditingPhone ? 'Cerrar' : warehousePhone ? warehousePhone : 'Configurar número'}
                  </button>
                </div>
                {isEditingPhone && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      defaultValue={warehousePhone}
                      placeholder="Ej: +51 987 654 321"
                      id="phone_input_field"
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('phone_input_field') as HTMLInputElement | null;
                        if (input) handleSavePhone(input.value);
                      }}
                      className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / WhatsApp Primary Action */}
            <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 space-y-2.5">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 fill-black" />
                <span>Enviar Pedido por WhatsApp</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateWhatsAppMessage();
                    navigator.clipboard.writeText(msg);
                    onShowToast('success', 'Texto copiado al portapapeles');
                  }}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 py-1 cursor-pointer"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  <span>Copiar texto limpio</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 py-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Vaciar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
