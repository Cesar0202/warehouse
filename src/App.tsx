import { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { OrderInput } from './components/OrderInput';
import { OrderResultsTable } from './components/OrderResultsTable';
import { CatalogExplorer } from './components/CatalogExplorer';
import { AliasManager } from './components/AliasManager';
import { StockUploader } from './components/StockUploader';
import { CatalogSearchModal } from './components/CatalogSearchModal';
import { AliasModal } from './components/AliasModal';
import { ProductEditModal } from './components/ProductEditModal';
import { ProductDetailDrawer } from './components/ProductDetailDrawer';
import { AddItemModal } from './components/AddItemModal';
import { LoginScreen } from './components/LoginScreen';
import { TechnicianOrderView } from './components/TechnicianOrderView';
import { IncomingOrdersView } from './components/IncomingOrdersView';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { CatalogItem, AliasItem, ParsedLineResult, AISuggestion } from './types';
import { initCatalog, setCatalogData, getCatalogItemByCode, getCatalogData } from './services/catalogService';
import { initAliases, getAliases, addOrUpdateAlias } from './services/aliasService';
import { processOrderText } from './services/orderParser';
import { hasGeminiApiKey, decipherTermWithAI } from './services/aiAgentService';
import {
  TechnicianOrder,
  getTechnicianOrders,
  TECHNICIAN_ORDERS_EVENT
} from './services/technicianOrderService';

export function App() {
  const [appMode, setAppMode] = useState<'technician' | 'warehouse'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1' || params.get('almacen') === '1') {
        return 'warehouse';
      }
    } catch {}
    const saved = localStorage.getItem('app_mode');
    if (saved === 'warehouse') return 'warehouse';
    return 'technician';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('warehouse_auth_session') === 'true';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('incoming');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [aliases, setAliases] = useState<AliasItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Incoming Technician Orders
  const [incomingOrders, setIncomingOrders] = useState<TechnicianOrder[]>(() => getTechnicianOrders());

  // Order processing state
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResults, setOrderResults] = useState<ParsedLineResult[]>([]);
  const [isDecipheringBatch, setIsDecipheringBatch] = useState(false);

  // Modals state
  const [catalogSearchModalOpen, setCatalogSearchModalOpen] = useState(false);
  const [selectedLineForSearch, setSelectedLineForSearch] = useState<ParsedLineResult | null>(null);

  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasModalInitialTerm, setAliasModalInitialTerm] = useState('');
  const [aliasModalInitialItem, setAliasModalInitialItem] = useState<CatalogItem | null>(null);

  // Stock Edit & Detail Drawer
  const [productEditModalOpen, setProductEditModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<CatalogItem | null>(null);

  const [productDetailDrawerOpen, setProductDetailDrawerOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<CatalogItem | null>(null);

  // Add Item Modal state
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);

  // Settings Modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const hasAIKey = hasGeminiApiKey();

  // Initial load
  useEffect(() => {
    const loadAppData = async () => {
      setIsLoadingData(true);
      try {
        const [loadedCatalog, loadedAliases] = await Promise.all([
          initCatalog(),
          initAliases()
        ]);
        setCatalog(loadedCatalog);
        setAliases(loadedAliases);
      } catch (error) {
        console.error('Error initializing application data', error);
        showToast('error', 'Error al cargar catálogo');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadAppData();
  }, []);

  // Listen for incoming technician orders
  useEffect(() => {
    const handleOrdersChange = () => {
      const current = getTechnicianOrders();
      setIncomingOrders(current);
    };

    window.addEventListener(TECHNICIAN_ORDERS_EVENT, handleOrdersChange);
    window.addEventListener('storage', handleOrdersChange);
    return () => {
      window.removeEventListener(TECHNICIAN_ORDERS_EVENT, handleOrdersChange);
      window.removeEventListener('storage', handleOrdersChange);
    };
  }, []);

  const refreshCatalogState = () => {
    setCatalog([...getCatalogData()]);
  };

  const refreshAliases = () => {
    setAliases([...getAliases()]);
  };

  // Handle Order Processing
  const handleProcessOrder = () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const parsed = processOrderText(inputText);
        setOrderResults(parsed);

        const high = parsed.filter(p => p.confidenceLevel === 'high').length;
        const low = parsed.filter(p => p.confidenceLevel === 'low').length;

        if (low > 0) {
          showToast('warning', 'Pedido procesado con observaciones', `${high} de ${parsed.length} artículos identificados.`);
        } else {
          showToast('success', 'Pedido procesado exitosamente', `Se homologaron ${parsed.length} artículos.`);
        }
      } catch (e: any) {
        console.error(e);
        showToast('error', 'Error en el procesamiento', e.message);
      } finally {
        setIsProcessing(false);
      }
    }, 120);
  };

  // Load an incoming technician order directly into the dispatch table
  const handleLoadOrderToDispatch = (order: TechnicianOrder) => {
    const rows: ParsedLineResult[] = order.items.map((item, idx) => {
      const catalogItem = getCatalogItemByCode(item.cod_arti) || {
        cod_arti: item.cod_arti,
        descripcion: item.descripcion,
        familia: 'MATERIALES',
        unidad: item.unidad || 'UND',
        stock: 999,
        ubicacion: item.ubicacion || '',
        foto: item.foto
      };

      return {
        id: `line-tech-${order.id}-${idx}-${Date.now()}`,
        rawLine: `[${item.cod_arti}] ${item.descripcion} x ${item.quantity} ${item.unidad}`,
        detectedTerm: item.descripcion,
        requestedQty: item.quantity,
        matchedItem: catalogItem,
        confidenceLevel: 'high',
        matchScore: 100,
        matchType: 'manual',
        selected: true,
        notes: `Solicitud ${order.orderNumber} (Técnico: ${order.technicianName})`
      };
    });

    setOrderResults(rows);
    setActiveTab('order');
    showToast(
      'success',
      `Solicitud ${order.orderNumber} cargada`,
      `Se prepararon ${rows.length} artículos del técnico ${order.technicianName} en la mesa de despacho.`
    );
  };

  const handleUpdateLineResult = (id: string, updated: Partial<ParsedLineResult>) => {
    setOrderResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const handleDeleteLineResult = (id: string) => {
    setOrderResults((prev) => prev.filter((item) => item.id !== id));
  };

  // AI Agent: Decipher Single Line
  const handleDecipherLineWithAI = async (line: ParsedLineResult) => {
    if (!hasAIKey) {
      showToast('warning', 'API Key no configurada', 'Coloca VITE_GEMINI_API_KEY en tu archivo .env.');
      return;
    }

    handleUpdateLineResult(line.id, { isDecipheringAI: true });

    try {
      const suggestion = await decipherTermWithAI(line.detectedTerm, line.rawLine);

      if (suggestion.items && Array.isArray(suggestion.items) && suggestion.items.length > 1) {
        const newRows: ParsedLineResult[] = suggestion.items.map((subItem, idx) => {
          const catalogItem = getCatalogItemByCode(subItem.cod_arti);
          const termLabel = subItem.detectedTerm || subItem.aliasSugerido || (catalogItem ? catalogItem.descripcion : subItem.cod_arti);
          return {
            id: `line-split-${line.id}-${idx}-${Date.now()}`,
            rawLine: line.rawLine,
            detectedTerm: termLabel,
            requestedQty: subItem.cantidad ?? line.requestedQty,
            matchedItem: catalogItem || null,
            confidenceLevel: (subItem.confianza ?? 90) >= 80 ? 'high' : 'medium',
            matchScore: subItem.confianza ?? 90,
            matchType: 'ai_agent',
            aiSuggestion: subItem,
            selected: true
          };
        });

        setOrderResults((prev) => {
          const targetIndex = prev.findIndex((r) => r.id === line.id);
          if (targetIndex === -1) return prev;
          const updated = [...prev];
          updated.splice(targetIndex, 1, ...newRows);
          return updated;
        });

        showToast(
          'success',
          'Línea compuesta dividida con éxito',
          `Se crearon ${newRows.length} registros separados para cada artículo.`
        );
        return;
      }

      const catalogItem = getCatalogItemByCode(suggestion.cod_arti);

      handleUpdateLineResult(line.id, {
        isDecipheringAI: false,
        aiSuggestion: suggestion,
        matchedItem: catalogItem || line.matchedItem,
        requestedQty: suggestion.cantidad ?? line.requestedQty,
        confidenceLevel: suggestion.confianza >= 80 ? 'high' : 'medium',
        matchScore: suggestion.confianza,
        matchType: 'ai_agent',
        selected: true
      });

      showToast('success', 'Término descifrado por Agente IA', `"${line.detectedTerm}" -> [${suggestion.cod_arti}] ${suggestion.descripcion}`);
    } catch (error: any) {
      console.error(error);
      handleUpdateLineResult(line.id, { isDecipheringAI: false });
      showToast('error', 'Error del Agente IA', error.message || 'No se pudo descifrar el término.');
    }
  };

  // AI Agent: Decipher All Unresolved Batch
  const handleDecipherAllUnresolvedWithAI = async () => {
    if (!hasAIKey) {
      showToast('warning', 'API Key no configurada', 'Coloca VITE_GEMINI_API_KEY en tu archivo .env o en Configuración IA.');
      return;
    }

    const unresolved = orderResults.filter(r => !r.matchedItem || r.confidenceLevel === 'low' || r.confidenceLevel === 'medium');
    if (unresolved.length === 0) {
      showToast('info', 'No hay términos pendientes');
      return;
    }

    setIsDecipheringBatch(true);
    let resolvedCount = 0;

    const concurrency = 3;
    for (let i = 0; i < unresolved.length; i += concurrency) {
      const chunk = unresolved.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (line) => {
          try {
            handleUpdateLineResult(line.id, { isDecipheringAI: true });
            const suggestion = await decipherTermWithAI(line.detectedTerm, line.rawLine);

            if (suggestion.items && Array.isArray(suggestion.items) && suggestion.items.length > 1) {
              const newRows: ParsedLineResult[] = suggestion.items.map((subItem, idx) => {
                const catalogItem = getCatalogItemByCode(subItem.cod_arti);
                const termLabel = subItem.detectedTerm || subItem.aliasSugerido || (catalogItem ? catalogItem.descripcion : subItem.cod_arti);
                return {
                  id: `line-split-${line.id}-${idx}-${Date.now()}`,
                  rawLine: line.rawLine,
                  detectedTerm: termLabel,
                  requestedQty: subItem.cantidad ?? line.requestedQty,
                  matchedItem: catalogItem || null,
                  confidenceLevel: (subItem.confianza ?? 90) >= 80 ? 'high' : 'medium',
                  matchScore: subItem.confianza ?? 90,
                  matchType: 'ai_agent',
                  aiSuggestion: subItem,
                  selected: true
                };
              });

              setOrderResults((prev) => {
                const targetIndex = prev.findIndex((r) => r.id === line.id);
                if (targetIndex === -1) return prev;
                const updated = [...prev];
                updated.splice(targetIndex, 1, ...newRows);
                return updated;
              });
              resolvedCount += newRows.length;
              return;
            }

            const catalogItem = getCatalogItemByCode(suggestion.cod_arti);

            handleUpdateLineResult(line.id, {
              isDecipheringAI: false,
              aiSuggestion: suggestion,
              matchedItem: catalogItem || line.matchedItem,
              requestedQty: suggestion.cantidad ?? line.requestedQty,
              confidenceLevel: suggestion.confianza >= 80 ? 'high' : 'medium',
              matchScore: suggestion.confianza,
              matchType: 'ai_agent',
              selected: true
            });
            resolvedCount++;
          } catch (err) {
            console.warn(`Error resolving line "${line.detectedTerm}":`, err);
            handleUpdateLineResult(line.id, { isDecipheringAI: false });
          }
        })
      );
    }

    setIsDecipheringBatch(false);
    showToast('success', 'Procesamiento IA completado', `${resolvedCount} artículos resueltos.`);
  };

  const handleAcceptAISuggestion = (line: ParsedLineResult, suggestion: AISuggestion) => {
    const aliasToSave = suggestion.aliasSugerido || line.detectedTerm;
    addOrUpdateAlias(aliasToSave, suggestion.cod_arti, suggestion.explicacion, true);
    refreshAliases();

    const catalogItem = getCatalogItemByCode(suggestion.cod_arti);
    handleUpdateLineResult(line.id, {
      matchedItem: catalogItem || line.matchedItem,
      confidenceLevel: 'high',
      matchScore: 100,
      matchType: 'alias_exact',
      matchedViaAlias: aliasToSave,
      aiSuggestion: undefined,
      selected: true
    });

    showToast('success', '¡Jerga aprendida y guardada!', `"${aliasToSave}" registrada en el diccionario.`);
  };

  const handleOpenCatalogSearchForLine = (line: ParsedLineResult) => {
    setSelectedLineForSearch(line);
    setCatalogSearchModalOpen(true);
  };

  const handleSelectCatalogItemForLine = (item: CatalogItem) => {
    if (!selectedLineForSearch) return;
    handleUpdateLineResult(selectedLineForSearch.id, {
      matchedItem: item,
      confidenceLevel: 'high',
      matchScore: 100,
      matchType: 'manual',
      selected: true
    });
    showToast('success', 'Artículo asignado', `[${item.cod_arti}] ${item.descripcion}`);
  };

  const handleOpenAliasModalFromRow = (line: ParsedLineResult) => {
    setAliasModalInitialTerm(line.detectedTerm);
    setAliasModalInitialItem(line.matchedItem);
    setAliasModalOpen(true);
  };

  const handleOpenAliasModalFromCatalog = (item: CatalogItem) => {
    setAliasModalInitialTerm('');
    setAliasModalInitialItem(item);
    setAliasModalOpen(true);
  };

  const handleAliasSaved = (savedAlias: string, codArti: string) => {
    refreshAliases();
    showToast('success', 'Alias registrado', `"${savedAlias}" -> [${codArti}]`);

    if (orderResults.length > 0) {
      handleProcessOrder();
    }
  };

  const handleOpenEditProduct = (product: CatalogItem) => {
    setSelectedProductForEdit(product);
    setProductEditModalOpen(true);
  };

  const handleProductUpdated = (_updated: CatalogItem) => {
    refreshCatalogState();
    if (orderResults.length > 0) {
      handleProcessOrder();
    }
  };

  const handleOpenProductDetail = (product: CatalogItem) => {
    setSelectedProductForDetail(product);
    setProductDetailDrawerOpen(true);
  };

  const handleAddDirectItem = (item: CatalogItem, qty: number) => {
    const newLine: ParsedLineResult = {
      id: `line-manual-${Date.now()}-${Math.random()}`,
      rawLine: `Manual: ${item.cod_arti} x ${qty}`,
      detectedTerm: item.descripcion,
      requestedQty: qty,
      matchedItem: item,
      confidenceLevel: 'high',
      matchScore: 100,
      matchType: 'manual',
      selected: true
    };
    setOrderResults((prev) => [newLine, ...prev]);
    showToast('success', 'Artículo añadido a la lista', `[${item.cod_arti}] ${item.descripcion} (${qty})`);
  };

  const handleLogout = () => {
    localStorage.removeItem('warehouse_auth_session');
    setIsAuthenticated(false);
  };

  const handleSetAppMode = (mode: 'technician' | 'warehouse') => {
    localStorage.setItem('app_mode', mode);
    setAppMode(mode);
  };

  const pendingIncomingCount = incomingOrders.filter((o) => o.status === 'pending').length;

  if (appMode === 'technician') {
    return (
      <>
        <TechnicianOrderView
          catalog={catalog}
          isLoadingCatalog={isLoadingData}
          onShowToast={showToast}
          onSwitchToWarehouse={() => handleSetAppMode('warehouse')}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={() => setIsAuthenticated(true)}
          onSwitchToTechnician={() => handleSetAppMode('technician')}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Formal Navbar */}
      <div className="print:hidden">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          catalogCount={catalog.length}
          aliasCount={aliases.length}
          pendingOrderCount={orderResults.length}
          incomingOrdersCount={pendingIncomingCount}
          hasAIKey={hasAIKey}
          onLogout={handleLogout}
          onSwitchToTechnician={() => handleSetAppMode('technician')}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 print:p-0 print:m-0 print:max-w-none">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 print:hidden">
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-300 shadow-sm flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider font-mono">
              Cargando base de datos de inventario...
            </p>
          </div>
        ) : (
          <>
            {/* TAB: Incoming Requests from Technicians */}
            {activeTab === 'incoming' && (
              <div className="animate-fade-in print:hidden">
                <IncomingOrdersView
                  onLoadOrderToDispatch={handleLoadOrderToDispatch}
                  onShowToast={showToast}
                  onSwitchToTechnician={() => handleSetAppMode('technician')}
                />
              </div>
            )}

            {/* TAB: Order Processing / Dispatch */}
            {activeTab === 'order' && (
              <div className="space-y-8 animate-fade-in print:space-y-0">
                <div className="print:hidden">
                  <OrderInput
                    inputText={inputText}
                    setInputText={setInputText}
                    onProcessOrder={handleProcessOrder}
                    isProcessing={isProcessing}
                    onOpenAddItem={() => setAddItemModalOpen(true)}
                  />
                </div>

                <OrderResultsTable
                  results={orderResults}
                  onUpdateResult={handleUpdateLineResult}
                  onDeleteResult={handleDeleteLineResult}
                  onOpenCatalogSearch={handleOpenCatalogSearchForLine}
                  onOpenAliasModal={handleOpenAliasModalFromRow}
                  onOpenAddItem={() => setAddItemModalOpen(true)}
                  onDecipherLineWithAI={handleDecipherLineWithAI}
                  onDecipherAllUnresolvedWithAI={handleDecipherAllUnresolvedWithAI}
                  onAcceptAISuggestion={handleAcceptAISuggestion}
                  isDecipheringBatch={isDecipheringBatch}
                  hasAIKey={hasAIKey}
                  onOpenAISettings={() => {
                    showToast('info', 'Agente IA', 'Configura VITE_GEMINI_API_KEY en tu archivo .env.');
                  }}
                  onShowToast={showToast}
                />
              </div>
            )}

            {/* TAB: Catalog Explorer */}
            {activeTab === 'catalog' && (
              <div className="animate-fade-in print:hidden">
                <CatalogExplorer
                  catalog={catalog}
                  onOpenEditModal={handleOpenEditProduct}
                  onOpenDetailDrawer={handleOpenProductDetail}
                  onOpenAliasModalForCatalogItem={handleOpenAliasModalFromCatalog}
                  onCatalogUpdated={refreshCatalogState}
                  onShowToast={showToast}
                />
              </div>
            )}

            {/* TAB: Alias Manager */}
            {activeTab === 'aliases' && (
              <div className="animate-fade-in print:hidden">
                <AliasManager
                  aliases={aliases}
                  catalog={catalog}
                  onRefreshAliases={refreshAliases}
                  onShowToast={showToast}
                />
              </div>
            )}

            {/* TAB: Stock Excel Uploader */}
            {activeTab === 'upload' && (
              <div className="animate-fade-in print:hidden">
                <StockUploader
                  onCatalogUpdated={(newItems) => {
                    setCatalog(newItems);
                    setCatalogData(newItems);
                  }}
                  onShowToast={showToast}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals & Drawers */}
      <AddItemModal
        isOpen={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onAddItem={handleAddDirectItem}
      />

      <CatalogSearchModal
        isOpen={catalogSearchModalOpen}
        onClose={() => setCatalogSearchModalOpen(false)}
        onSelectItem={handleSelectCatalogItemForLine}
        initialQuery={selectedLineForSearch?.detectedTerm || ''}
      />

      <AliasModal
        isOpen={aliasModalOpen}
        onClose={() => setAliasModalOpen(false)}
        initialAlias={aliasModalInitialTerm}
        initialCatalogItem={aliasModalInitialItem}
        onAliasSaved={handleAliasSaved}
      />

      <ProductEditModal
        isOpen={productEditModalOpen}
        onClose={() => setProductEditModalOpen(false)}
        product={selectedProductForEdit}
        onProductUpdated={handleProductUpdated}
        onShowToast={showToast}
      />

      <ProductDetailDrawer
        isOpen={productDetailDrawerOpen}
        onClose={() => setProductDetailDrawerOpen(false)}
        product={selectedProductForDetail}
        onOpenEdit={handleOpenEditProduct}
        onOpenCreateAlias={handleOpenAliasModalFromCatalog}
        onShowToast={showToast}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Formal Footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-4 text-xs text-neutral-500 font-sans print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end">
          <span className="px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono text-[11px] font-semibold border border-neutral-200">
            {catalog.length.toLocaleString()} artículos en inventario
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
