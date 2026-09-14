import { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { IncomingOrdersView } from './components/IncomingOrdersView';
import { CatalogExplorer } from './components/CatalogExplorer';
import { AliasManager } from './components/AliasManager';
import { StockUploader } from './components/StockUploader';
import { AliasModal } from './components/AliasModal';
import { ProductEditModal } from './components/ProductEditModal';
import { ProductDetailDrawer } from './components/ProductDetailDrawer';
import { LoginScreen } from './components/LoginScreen';
import { TechnicianOrderView } from './components/TechnicianOrderView';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { CatalogItem, AliasItem } from './types';
import { initCatalog, setCatalogData, getCatalogData } from './services/catalogService';
import { initAliases, getAliases } from './services/aliasService';
import {
  TechnicianOrder,
  getTechnicianOrders,
  TECHNICIAN_ORDERS_EVENT,
  CATALOG_SYNC_EVENT
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

  // Modals state
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasModalInitialTerm, setAliasModalInitialTerm] = useState('');
  const [aliasModalInitialItem, setAliasModalInitialItem] = useState<CatalogItem | null>(null);

  // Stock Edit & Detail Drawer
  const [productEditModalOpen, setProductEditModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<CatalogItem | null>(null);

  const [productDetailDrawerOpen, setProductDetailDrawerOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<CatalogItem | null>(null);

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

  // Listen for real-time catalog changes (photos, stocks, edits from other devices)
  useEffect(() => {
    const handleCatalogSync = () => {
      initCatalog().then((loaded) => setCatalog(loaded));
    };

    window.addEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
    return () => {
      window.removeEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
    };
  }, []);

  const refreshCatalogState = () => {
    setCatalog([...getCatalogData()]);
  };

  const refreshAliases = () => {
    setAliases([...getAliases()]);
  };

  const handleOpenAliasModalFromCatalog = (item: CatalogItem) => {
    setAliasModalInitialTerm('');
    setAliasModalInitialItem(item);
    setAliasModalOpen(true);
  };

  const handleAliasSaved = (savedAlias: string, codArti: string) => {
    refreshAliases();
    showToast('success', 'Alias registrado', `"${savedAlias}" -> [${codArti}]`);
  };

  const handleOpenEditProduct = (product: CatalogItem) => {
    setSelectedProductForEdit(product);
    setProductEditModalOpen(true);
  };

  const handleProductUpdated = (_updated: CatalogItem) => {
    refreshCatalogState();
  };

  const handleOpenProductDetail = (product: CatalogItem) => {
    setSelectedProductForDetail(product);
    setProductDetailDrawerOpen(true);
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
          incomingOrdersCount={pendingIncomingCount}
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
            {/* TAB: Solicitudes de Campo (Bandeja Principal) */}
            {activeTab === 'incoming' && (
              <div className="animate-fade-in">
                <IncomingOrdersView
                  onShowToast={showToast}
                  onSwitchToTechnician={() => handleSetAppMode('technician')}
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
