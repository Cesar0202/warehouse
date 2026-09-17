import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  X, 
  Check, 
  Plus, 
  Minus, 
  Package, 
  MapPin, 
  Tag, 
  FolderTree,
  Image as ImageIcon,
  Camera,
  Upload,
  Trash2,
  RotateCcw,
  Link2
} from 'lucide-react';
import { CatalogItem } from '../types';
import { updateProductDetails } from '../services/catalogService';
import { getProductImageUrl } from '../services/imageHelper';
import { uploadImageToCloud } from '../services/imageUploadService';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogItem | null;
  onProductUpdated: (updated: CatalogItem) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg?: string) => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  product,
  onProductUpdated,
  onShowToast
}) => {
  const [stock, setStock] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');
  const [familia, setFamilia] = useState('');
  const [unidad, setUnidad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [foto, setFoto] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setStock(product.stock);
      setDescripcion(product.descripcion);
      setFamilia(product.familia || '');
      setUnidad(product.unidad || '007=UNIDAD (BIENES)');
      setUbicacion(product.ubicacion || '');
      setFoto(product.foto || product.imagen || product.image_url || '');
      setShowUrlInput(false);
      setIsUploading(false);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleAdjustStock = (delta: number) => {
    setStock(prev => Math.max(0, parseFloat((prev + delta).toFixed(2))));
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Archivo inválido', 'Por favor selecciona una imagen JPG, PNG o WebP.');
      return;
    }

    setIsUploading(true);
    onShowToast('info', 'Subiendo foto', 'Guardando foto en la nube en alta calidad...');

    try {
      const cloudUrl = await uploadImageToCloud(file, (msg) => {
        console.log(msg);
      });

      if (cloudUrl) {
        setFoto(cloudUrl);
        onShowToast('success', 'Foto lista', 'Foto subida a la nube correctamente');
      }
    } catch (err) {
      console.error('Error uploading image to cloud:', err);
      onShowToast('warning', 'Aviso', 'Se guardará en formato optimizado');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const updated = updateProductDetails(product.cod_arti, {
      descripcion: descripcion.trim(),
      familia: familia.trim(),
      unidad: unidad.trim(),
      ubicacion: ubicacion.trim(),
      stock: parseFloat(String(stock)) || 0,
      foto: foto.trim()
    }, product.almacen);

    if (updated) {
      onProductUpdated(updated);
      onShowToast('success', 'Producto actualizado', `[${product.cod_arti}] Stock: ${stock}`);
      onClose();
    }
  };

  const currentPreview = foto.trim() || getProductImageUrl(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl border border-neutral-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-neutral-900">
                  Modificar Producto
                </h3>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-200 text-neutral-900">
                  {product.cod_arti}
                </span>
                {product.almacen && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {product.almacen.startsWith('02') ? 'Alm 2 (Activos)' : product.almacen.startsWith('03') ? 'Alm 3 (Temp)' : 'Alm 1 (Principal)'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                Ajuste de inventario, fotos y datos en tiempo real
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - 2 Columns on desktop, zero scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            
            {/* Left Column: Stock & Photo */}
            <div className="space-y-2.5">
              {/* Stock Section */}
              <div className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Stock Disponible
                  </span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                    stock > 0 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                  }`}>
                    {stock > 0 ? 'DISPONIBLE' : 'AGOTADO'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(-10)}
                    className="px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(-1)}
                    className="w-7 h-7 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stock === 0 ? '' : stock}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setStock(0);
                      } else {
                        const num = parseFloat(val);
                        setStock(isNaN(num) ? 0 : Math.max(0, num));
                      }
                    }}
                    className="w-20 text-center py-1 bg-white border-2 border-neutral-900 rounded-lg text-lg font-bold font-mono text-neutral-900 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustStock(1)}
                    className="w-7 h-7 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(10)}
                    className="px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Photo Management */}
              <div className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-neutral-500" />
                    <span>Foto Real</span>
                  </label>
                  {foto && (
                    <button
                      type="button"
                      onClick={() => setFoto('')}
                      className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-0.5 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-14 rounded-lg border border-neutral-300 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                    <img
                      src={currentPreview}
                      alt="Vista previa"
                      className={`w-full h-full object-cover ${isUploading ? 'opacity-40 animate-pulse' : ''}`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-[9px] text-white font-bold animate-pulse">Subiendo...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Cámara</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Subir</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-end text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-neutral-600 hover:text-black font-semibold flex items-center gap-1 underline cursor-pointer"
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>{showUrlInput ? 'Ocultar URL' : 'Pegar URL'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {showUrlInput && (
                  <div className="pt-1 border-t border-neutral-200">
                    <input
                      type="url"
                      value={foto}
                      onChange={(e) => setFoto(e.target.value)}
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs focus:border-neutral-900 outline-none font-mono text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Metadata fields */}
            <div className="space-y-2.5">
              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Descripción Oficial
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all resize-none leading-snug font-medium"
                />
              </div>

              {/* Family & Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Familia
                  </label>
                  <input
                    type="text"
                    value={familia}
                    onChange={(e) => setFamilia(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Unidad
                  </label>
                  <input
                    type="text"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Ubicación en Almacén
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: ESTANTE-A3, PASILLO-2..."
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all font-mono"
                />
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-2.5 mt-0.5 flex items-center justify-end gap-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
