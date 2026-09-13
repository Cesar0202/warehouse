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
  Sparkles,
  Layers,
  Phone,
  ClipboardCopy,
  RotateCcw,
  CheckCircle2,
  PackageCheck,
  PackageX
} from 'lucide-react';
import { CatalogItem, AliasItem } from '../types';
import { searchCatalogFuzzy, getCatalogData } from '../services/catalogService';
import { getAliases } from '../services/aliasService';
import { getProductImageUrl } from '../services/imageHelper';

interface TechnicianOrderViewProps {
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
    { id: 'TODOS', label: '🔥 Todo el Catálogo' },
    { id: '011=CINTAS', label: 'Cintas' },
    { id: '001=CURVAS', label: 'Curvas y Tubos' },
    { id: '301=LIMPIEZA', label: 'Limpieza / Desatorador' },
    { id: '002=ABRAZADERAS', label: 'Abrazaderas' },
    { id: '008=PEGAMENTOS', label: 'Pegamentos y Siliconas' },
    { id: '014=HERRAMIENTAS', label: 'Herramientas' }
  ];

  const searchResults = useMemo(() => {
    const allAliases = getAliases();
    const q = searchTerm.trim().toLowerCase();

    if (q.length > 0) {
      const matches = searchCatalogFuzzy(q, 40);
      const aliasMatches = allAliases.filter(a => a.alias.toLowerCase().includes(q));
      const finalMap = new Map<string, { item: CatalogItem; score: number; matchedAlias?: string }>();

      aliasMatches.forEach(am => {
        const catalogItems = getCatalogData();
        const found = catalogItems.find(c => c.cod_arti.toUpperCase() === am.cod_arti.toUpperCase());
        if (found) {
          finalMap.set(found.cod_arti, { item: found, score: 100, matchedAlias: am.alias });
        }
      });

      matches.forEach(m => {
        if (!finalMap.has(m.item.cod_arti)) {
          finalMap.set(m.item.cod_arti, { item: m.item, score: m.score });
        }
      });

      let resultsList = Array.from(finalMap.values()).map(r => r.item);

      if (selectedCategory !== 'TODOS') {
        const famKey = selectedCategory.split('=')[1] || selectedCategory;
        resultsList = resultsList.filter(i => (i.familia || '').toUpperCase().includes(famKey));
      }

      return resultsList.slice(0, 30);
    }

    const all = getCatalogData();
    if (selectedCategory !== 'TODOS') {
      const famKey = selectedCategory.split('=')[1] || selectedCategory;
      return all.filter(i => (i.familia || '').toUpperCase().includes(famKey)).slice(0, 30);
    }

    return all.filter(i => i.stock > 0).slice(0, 25);
  }, [searchTerm, selectedCategory]);

  const getItemQuantityInCart = (codArti: string): number => {
    const found = cart.find(c => c.item.cod_arti === codArti);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item: CatalogItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.cod_arti === item.cod_arti);
      if (existing) {
        return prev.map(c => c.item.cod_arti === item.cod_arti ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (codArti: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(codArti);
      return;
    }
    setCart(prev => prev.map(c => c.item.cod_arti === codArti ? { ...c, quantity: qty } : c));
  };

  const handleRemoveFromCart = (codArti: string) => {
    setCart(prev => prev.filter(c => c.item.cod_arti !== codArti));
  };

  const handleClearCart = () => {
    if (confirm('¿Vaciar toda tu lista de pedido?')) {
      setCart([]);
      setIsCartOpen(false);
      onShowToast('info', 'Pedido vaciado');
    }
  };

  const generateWhatsAppMessage = (): string => {
    const dateStr = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    let text = '*SOLICITUD DE MATERIALES - ALMACEN*\n';
    text += `*Tecnico:* ${techName || 'Tecnico de Campo'}\n`;
    text += `*Fecha:* ${dateStr}\n`;
    if (orderNote.trim()) {
      text += `*Nota:* ${orderNote.trim()}\n`;
    }
    text += `\n*ITEMS SOLICITADOS (${cart.length} articulos):*\n`;

    cart.forEach((c, idx) => {
      const stockInfo = c.item.stock >= c.quantity ? `✓ Stock: ${c.item.stock}` : `⚠ Disp: ${c.item.stock}`;
      text += `${idx + 1}. *${c.quantity}* ${c.item.unidad || 'UND'} x [${c.item.cod_arti}] ${c.item.descripcion} (${stockInfo})\n`;
    });

    text += '\n_Generado desde App Almacen PWA_';
    return text;
  };

  const handleSendWhatsApp = () => {
    if (cart.length === 0) {
      onShowToast('warning', 'Carrito vacío', 'Agrega al menos un artículo a tu pedido.');
      return;
    }

    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const cleanPhone = warehousePhone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, '_blank');
    onShowToast('success', 'Abriendo WhatsApp...', 'Revisa y presiona enviar en WhatsApp.');
  };

  const totalItemsCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans pb-28">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black font-extrabold flex items-center justify-center text-sm shadow-md">
              👷
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                Pedidos de Campo
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>Técnico:</span>
                {isEditingName ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveName(techName); }} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      placeholder="Tu nombre..."
                      autoFocus
                      className="w-28 px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white outline-none focus:border-white"
                    />
                    <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="font-semibold text-white underline underline-offset-2 hover:text-neutral-300 flex items-center gap-1"
                  >
                    <span>{techName || 'Ingresar nombre'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToWarehouse && (
              <button
                type="button"
                onClick={onSwitchToWarehouse}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-200 transition-colors flex items-center gap-1.5"
                title="Acceder al panel de almacén"
              >
                <span>📦</span>
                <span>Almacén</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Search Bar with Instant Autocomplete */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar material o jerga: teflón, drano, cinta..."
              className="w-full pl-10 pr-10 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-500 focus:border-white focus:ring-1 focus:ring-white outline-none transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Categories Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none mt-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black font-bold shadow'
                    : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content / Products List */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <span>
            {searchTerm ? `Mostrando ${searchResults.length} resultados para "${searchTerm}"` : 'Catálogo de Artículos y Jergas'}
          </span>
          {cart.length > 0 && (
            <span className="text-emerald-400 font-semibold font-mono">
              {cart.length} en carrito ({totalItemsCount} unid.)
            </span>
          )}
        </div>

        {/* Products Grid / Cards */}
        {searchResults.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950 rounded-2xl border border-neutral-800 mt-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 mx-auto flex items-center justify-center text-xl">
              🔍
            </div>
            <p className="text-neutral-300 font-semibold text-sm">
              No encontramos "{searchTerm}"
            </p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Prueba escribiendo otra jerga, marca o código oficial del material.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {searchResults.map((item) => {
              const qtyInCart = getItemQuantityInCart(item.cod_arti);
              const imgUrl = getProductImageUrl(item);
              const hasStock = item.stock > 0;

              return (
                <div
                  key={item.cod_arti}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                    qtyInCart > 0 
                      ? 'bg-neutral-900 border-emerald-500/80 ring-1 ring-emerald-500/40' 
                      : 'bg-neutral-950 border-neutral-800/90 hover:border-neutral-700'
                  }`}
                >
                  {/* Product Photo Thumbnail */}
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                    <img
                      src={imgUrl}
                      alt={item.descripcion}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 text-neutral-300 backdrop-blur-xs">
                      {item.cod_arti}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {item.descripcion}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {/* Stock Badge */}
                      {hasStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Stock: {item.stock} {item.unidad || 'UND'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-neutral-900 text-neutral-500 border border-neutral-800">
                          Agotado (0)
                        </span>
                      )}

                      {item.ubicacion && (
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                          Ubic: {item.ubicacion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action / Stepper Controls */}
                  <div className="shrink-0 flex flex-col items-end justify-center">
                    {qtyInCart === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="px-3 py-2 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Pedir</span>
                      </button>
                    ) : (
                      <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl p-1 gap-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.cod_arti, qtyInCart - 1)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-mono font-extrabold text-sm text-emerald-400">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.cod_arti, qtyInCart + 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-neutral-200 text-black flex items-center justify-center font-bold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs font-bold">
                  {cart.length}
                </div>
                <span>Ver Mi Pedido ({totalItemsCount} unid.)</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Continuar</span>
                <Send className="w-4 h-4 ml-1" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Slide-Up Cart Sheet Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  Resumen de Solicitud ({cart.length} artículos)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Technician Info */}
              <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span>Técnico solicitante: <strong className="text-white">{techName || 'No especificado'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-emerald-400 hover:underline text-[11px] font-semibold"
                >
                  Cambiar
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cart.map((c) => {
                  const imgUrl = getProductImageUrl(c.item);
                  return (
                    <div
                      key={c.item.cod_arti}
                      className="p-3 bg-neutral-900/50 rounded-xl border border-neutral-800 flex items-center gap-3"
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
                      <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(c.item.cod_arti, c.quantity - 1)}
                          className="w-6 h-6 rounded bg-neutral-800 text-white flex items-center justify-center text-xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs text-emerald-400">
                          {c.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(c.item.cod_arti, c.quantity + 1)}
                          className="w-6 h-6 rounded bg-white text-black font-bold flex items-center justify-center text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(c.item.cod_arti)}
                        className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Order Note */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Nota / Observación (Opcional):
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ej: Para obra central, piso 3, urgente..."
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:border-white outline-none"
                />
              </div>

              {/* Phone config */}
              <div className="pt-2 border-t border-neutral-800/80">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Almacén:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(!isEditingPhone)}
                    className="text-[11px] text-neutral-400 hover:text-white underline"
                  >
                    {isEditingPhone ? 'Cerrar' : warehousePhone ? warehousePhone : 'Configurar número'}
                  </button>
                </div>
                {isEditingPhone && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="text"
                      defaultValue={warehousePhone}
                      placeholder="Ej: +51 987 654 321"
                      id="phone_input_field"
                      className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('phone_input_field') as HTMLInputElement | null;
                        if (input) handleSavePhone(input.value);
                      }}
                      className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-lg"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / WhatsApp Primary Action */}
            <div className="p-4 bg-neutral-900 border-t border-neutral-800 space-y-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 fill-black" />
                <span>📲 Enviar Pedido por WhatsApp</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateWhatsAppMessage();
                    navigator.clipboard.writeText(msg);
                    onShowToast('success', 'Texto copiado al portapapeles');
                  }}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 py-1"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  <span>Copiar texto limpio</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 py-1"
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