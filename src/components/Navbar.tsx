import React from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  Layers,
  Wrench,
  Settings,
  Package,
  RotateCcw
} from 'lucide-react';

export type ActiveTab = 'incoming' | 'catalog' | 'aliases' | 'upload';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  catalogCount: number;
  aliasCount: number;
  incomingOrdersCount: number;
  onLogout?: () => void;
  onSwitchToTechnician?: () => void;
  onOpenSettings?: () => void;
  onSyncToPhones?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  catalogCount,
  aliasCount,
  incomingOrdersCount,
  onLogout,
  onSwitchToTechnician,
  onOpenSettings,
  onSyncToPhones
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/90 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2 sm:h-18 gap-2 sm:gap-0">
          {/* Logo & Title */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
            <span className="font-bold text-base sm:text-lg tracking-tight text-neutral-900 font-mono">
              ALMACÉN CENTRAL
            </span>
            <div className="flex items-center gap-2 sm:hidden">
              {onSyncToPhones && (
                <button
                  type="button"
                  onClick={onSyncToPhones}
                  className="text-xs font-semibold bg-blue-600 text-white rounded px-2.5 py-1 flex items-center gap-1 shadow-sm"
                  title="Enviar fotos y stock a todos los teléfonos"
                >
                  <span>📡 Sincronizar</span>
                </button>
              )}
              {onSwitchToTechnician && (
                <button
                  type="button"
                  onClick={onSwitchToTechnician}
                  className="text-xs font-semibold bg-neutral-900 text-white rounded px-2.5 py-1 flex items-center gap-1 shadow-sm"
                >
                  <span>👷 Modo Técnico</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-neutral-500 hover:text-black border border-neutral-300 rounded px-2 py-0.5"
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              )}
            </div>
          </div>

          {/* Navigation Pill Bar */}
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 min-w-max">
              {/* Solicitudes de Campo (Bandeja Principal de Pedidos) */}
              <button
                type="button"
                onClick={() => setActiveTab('incoming')}
                className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'incoming'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Solicitudes</span>
                {incomingOrdersCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded ${
                      activeTab === 'incoming'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white animate-pulse'
                    }`}
                  >
                    {incomingOrdersCount}
                  </span>
                )}
              </button>

              {/* Inventario */}
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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

              {/* Diccionario de Alias */}
              <button
                type="button"
                onClick={() => setActiveTab('aliases')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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

              {/* Cargar Excel */}
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Cargar Excel</span>
              </button>
            </nav>

            {onSyncToPhones && (
              <button
                type="button"
                onClick={onSyncToPhones}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm items-center gap-1.5 cursor-pointer"
                title="Sincronizar todas las fotos y cambios con los teléfonos de los técnicos"
              >
                <span>📡 Sincronizar Teléfonos</span>
              </button>
            )}

            {onSwitchToTechnician && (
              <button
                type="button"
                onClick={onSwitchToTechnician}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white hover:bg-black rounded-lg transition-all shadow-sm items-center gap-1.5 cursor-pointer"
                title="Cambiar a vista de pedidos para técnicos"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Modo Técnico</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-all cursor-pointer"
                title="Configuración del Sistema"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-all cursor-pointer"
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
