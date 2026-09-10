import React from 'react';
import { 
  FileText, 
  BookOpen, 
  UploadCloud, 
  Layers
} from 'lucide-react';

export type ActiveTab = 'order' | 'catalog' | 'aliases' | 'upload';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  catalogCount: number;
  aliasCount: number;
  pendingOrderCount: number;
  hasAIKey: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  catalogCount,
  aliasCount,
  pendingOrderCount,
  hasAIKey,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/90 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2 sm:h-18 gap-2 sm:gap-0">
          {/* Logo & Title */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
            <span className="font-bold text-base sm:text-lg tracking-tight text-neutral-900 font-mono">
              DEMO - ALMACÉN
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="sm:hidden text-xs text-neutral-500 hover:text-black border border-neutral-300 rounded px-2 py-0.5"
                title="Cerrar sesión"
              >
                Salir
              </button>
            )}
          </div>

          {/* Navigation Pill Bar */}
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'order'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pedidos</span>
                {pendingOrderCount > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded ${activeTab === 'order' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'}`}>
                    {pendingOrderCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Inventario</span>
                <span className={`hidden md:inline px-1.5 py-0.2 text-[10px] font-mono rounded ${activeTab === 'catalog' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {catalogCount.toLocaleString()}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('aliases')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'aliases'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Diccionario</span>
                <span className={`hidden md:inline px-1.5 py-0.2 text-[10px] font-mono rounded ${activeTab === 'aliases' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {aliasCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Excel</span>
              </button>
            </nav>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-all"
                title="Cerrar sesión"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
