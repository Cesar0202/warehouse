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
import { ToastContainer, ToastMessage } from './components/Toast';

import { CatalogItem, AliasItem, ParsedLineResult, AISuggestion } from './types';
import { initCatalog, setCatalogData, getCatalogItemByCode, getCatalogData } from './services/catalogService';
import { initAliases, getAliases, addOrUpdateAlias } from './services/aliasService';
import { processOrderText } from './services/orderParser';
import { hasGeminiApiKey, decipherTermWithAI } from './services/aiAgentService';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('warehouse_auth_session') === 'true';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [aliases, setAliases] = useState<AliasItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
      const catalogItem = getCatalogItemByCode(suggestion.cod_arti);

      handleUpdateLineResult(line.id, {
        isDecipheringAI: false,
        aiSuggestion: suggestion,
        matchedItem: catalogItem || line.matchedItem,
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

  // AI Agent: Decipher All Unresolved Batch in Parallel
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

    // Process up to 3 concurrent requests at a time for high speed without rate-limiting
    const concurrency = 3;
    for (let i = 0; i < unresolved.length; i += concurrency) {
      const chunk = unresolved.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (line) => {
          try {
            handleUpdateLineResult(line.id, { isDecipheringAI: true });
            const suggestion = await decipherTermWithAI(line.detectedTerm, line.rawLine);
            const catalogItem = getCatalogItemByCode(suggestion.cod_arti);

            handleUpdateLineResult(line.id, {
              isDecipheringAI: false,
              aiSuggestion: suggestion,
              matchedItem: catalogItem || line.matchedItem,
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
    showToast('success', 'Procesamiento IA completado', `${resolvedCount} de ${unresolved.length} términos resueltos.`);
  };

  // Accept AI Suggestion & auto-save to Alias Dictionary
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

  // Open Catalog search for a specific line
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

  // Open Alias Modal from table row
  const handleOpenAliasModalFromRow = (line: ParsedLineResult) => {
    setAliasModalInitialTerm(line.detectedTerm);
    setAliasModalInitialItem(line.matchedItem);
    setAliasModalOpen(true);
  };

  // Open Alias Modal for a catalog item from explorer
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

  // Product Edit Handlers
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

  // Product Detail Handlers
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

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
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
          hasAIKey={hasAIKey}
          onLogout={handleLogout}
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
            {/* TAB: Order Processing */}
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
