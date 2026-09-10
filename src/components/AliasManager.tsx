import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Search, 
  Layers, 
  BookMarked, 
  FileCode,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { AliasItem, CatalogItem } from '../types';
import { addOrUpdateAlias, deleteAlias, resetDefaultAliases, saveAliases } from '../services/aliasService';
import { getCatalogItemByCode } from '../services/catalogService';

interface AliasManagerProps {
  aliases: AliasItem[];
  catalog: CatalogItem[];
  onRefreshAliases: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const AliasManager: React.FC<AliasManagerProps> = ({
  aliases,
  onRefreshAliases,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newCodArti, setNewCodArti] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editingOriginalAlias, setEditingOriginalAlias] = useState<string | null>(null);

  const filteredAliases = useMemo(() => {
    if (!searchTerm.trim()) return aliases;
    const q = searchTerm.toLowerCase();
    return aliases.filter(a => {
      const matchAlias = a.alias.toLowerCase().includes(q);
      const matchCod = a.cod_arti.toLowerCase().includes(q);
      const matchNote = a.nota?.toLowerCase().includes(q);
      const item = getCatalogItemByCode(a.cod_arti);
      const matchDesc = item?.descripcion.toLowerCase().includes(q);
      return matchAlias || matchCod || matchNote || matchDesc;
    });
  }, [aliases, searchTerm]);

  const handleStartEdit = (item: AliasItem) => {
    setEditingOriginalAlias(item.alias);
    setNewAlias(item.alias);
    setNewCodArti(item.cod_arti);
    setNewNote(item.nota || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingOriginalAlias(null);
    setNewAlias('');
    setNewCodArti('');
    setNewNote('');
  };

  const handleAddOrUpdateAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim() || !newCodArti.trim()) return;

    const catalogItem = getCatalogItemByCode(newCodArti);
    if (!catalogItem) {
      onShowToast('warning', 'Código no registrado', `"${newCodArti}" no existe en el inventario actual.`);
    }

    if (editingOriginalAlias && editingOriginalAlias !== newAlias.trim().toLowerCase()) {
      deleteAlias(editingOriginalAlias);
    }

    addOrUpdateAlias(newAlias.trim(), newCodArti.trim(), newNote.trim(), true);
    onRefreshAliases();

    if (editingOriginalAlias) {
      onShowToast('success', 'Alias actualizado', `"${newAlias}" -> [${newCodArti.toUpperCase()}]`);
      setEditingOriginalAlias(null);
    } else {
      onShowToast('success', 'Alias registrado', `"${newAlias}" -> [${newCodArti.toUpperCase()}]`);
    }

    setNewAlias('');
    setNewCodArti('');
    setNewNote('');
  };

  const handleDelete = (aliasText: string) => {
    if (confirm(`¿Eliminar alias "${aliasText}"?`)) {
      deleteAlias(aliasText);
      onRefreshAliases();
      onShowToast('info', 'Alias eliminado');
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Restablecer diccionario a valores predeterminados?')) {
      await resetDefaultAliases();
      onRefreshAliases();
      onShowToast('success', 'Diccionario restablecido');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(aliases, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'alias.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('success', 'alias.json descargado');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          saveAliases(parsed);
          onRefreshAliases();
          onShowToast('success', 'Alias importados con éxito', `${parsed.length} reglas cargadas.`);
        } else {
          throw new Error('Formato JSON inválido.');
        }
      } catch (err: any) {
        onShowToast('error', 'Error al importar JSON', err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Diccionario
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>

          <label className="px-3.5 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Importar JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Restaurar a valores predeterminados"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Alias Card */}
      <div className={`bg-white rounded-xl border p-5 sm:p-6 shadow-sm transition-all ${editingOriginalAlias ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200/90'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
            {editingOriginalAlias ? (
              <>
                <Edit3 className="w-4 h-4 text-neutral-900" />
                <span>Modificar Jerga / Alias: <span className="font-mono underline">{editingOriginalAlias}</span></span>
              </>
            ) : (
              <>
                <BookMarked className="w-4 h-4 text-neutral-800" />
                <span>Registrar Nueva Jerga / Alias Manual</span>
              </>
            )}
          </h3>
          {editingOriginalAlias && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar edición</span>
            </button>
          )}
        </div>

        <form onSubmit={handleAddOrUpdateAlias} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Jerga o Nombre Coloquial
            </label>
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Ej: drano, franks, teflon 3/4..."
              required
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Código Oficial (Cod.Arti.)
            </label>
            <input
              type="text"
              value={newCodArti}
              onChange={(e) => setNewCodArti(e.target.value.toUpperCase())}
              placeholder="Ej: DES01, CUR06..."
              required
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs font-mono font-bold focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Nota u Observación (Opcional)
            </label>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ej: Nombre comercial antiguo"
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-2 flex items-end gap-1.5">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {editingOriginalAlias ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Actualizar</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Guardar</span>
                </>
              )}
            </button>
            {editingOriginalAlias && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-2 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-all"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Aliases Table Card */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-hidden">
        {/* Table Filter */}
        <div className="p-4 sm:px-5 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por alias, código o descripción..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:border-neutral-900 outline-none transition-all"
            />
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {filteredAliases.length} de {aliases.length} alias
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-neutral-800">
            <thead className="bg-neutral-100 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center font-mono">#</th>
                <th className="py-3 px-4 min-w-[180px]">Jerga / Alias</th>
                <th className="py-3 px-4 min-w-[120px]">Código Oficial</th>
                <th className="py-3 px-4 min-w-[280px]">Artículo en Catálogo</th>
                <th className="py-3 px-4 min-w-[160px]">Nota / Origen</th>
                <th className="py-3 px-4 text-right w-24">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-sans">
              {filteredAliases.map((item, idx) => {
                const catalogItem = getCatalogItemByCode(item.cod_arti);
                const isItemBeingEdited = editingOriginalAlias === item.alias;

                return (
                  <tr 
                    key={`${item.alias}-${idx}`} 
                    className={`transition-colors ${isItemBeingEdited ? 'bg-neutral-100/80 font-medium' : 'hover:bg-neutral-50'}`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-neutral-400 text-xs">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {item.alias}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300">
                        {item.cod_arti}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {catalogItem ? (
                        <div>
                          <p className="font-medium text-neutral-900 leading-snug">{catalogItem.descripcion}</p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            Stock: {catalogItem.stock} {catalogItem.unidad || 'UND'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-xs italic">Código no existe en catálogo actual</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-neutral-500 text-xs">
                      {item.nota || '-'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                          title="Editar alias"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.alias)}
                          className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                          title="Eliminar alias"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
