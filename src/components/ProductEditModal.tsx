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
    });

    if (updated) {
      onProductUpdated(updated);
      onShowToast('success', 'Producto actualizado', `[${product.cod_arti}] Stock: ${stock}`);
      onClose();
    }
  };

  const currentPreview = foto.trim() || getProductImageUrl(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl border border-neutral-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-900">
                  Modificar Producto
                </h3>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-200 text-neutral-900">
                  {product.cod_arti}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Ajuste de inventario, fotos y datos en tiempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Stock Section */}
          <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Stock Disponible
              </span>
              <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-neutral-200 text-neutral-900 border border-neutral-300">
                {stock > 0 ? 'DISPONIBLE' : 'AGOTADO'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAdjustStock(-10)}
                className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(-1)}
                className="w-9 h-9 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold"
              >
                <Minus className="w-4 h-4" />
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
                className="w-28 text-center py-2 bg-white border-2 border-neutral-900 rounded-lg text-xl font-bold font-mono text-neutral-900 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => handleAdjustStock(1)}
                className="w-9 h-9 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(10)}
                className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold"
              >
                +10
              </button>
            </div>
          </div>

          {/* Photo Management Section (Camera / Upload / Reset) */}
          <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-600" />
                <span>Foto Real del Producto</span>
              </label>
              {foto && (
                <button
                  type="button"
                  onClick={() => setFoto('')}
                  className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Quitar foto personalizada</span>
                </button>
              )}
            </div>

            {/* Hidden file & camera inputs */}
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

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-neutral-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative group">
                <img
                  src={currentPreview}
                  alt="Vista previa"
                  className={`w-full h-full object-cover ${isUploading ? 'opacity-40 animate-pulse' : ''}`}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-[10px] text-white font-bold animate-pulse">Subiendo...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-bold transition-all shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-neutral-700" />
                    <span>Tomar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-bold transition-all shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-neutral-700" />
                    <span>Subir Archivo</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                  <span>Soporta cámara de celular y fotos de PC</span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-neutral-700 hover:text-black font-semibold flex items-center gap-1 underline"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{showUrlInput ? 'Ocultar URL' : 'Pegar URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {showUrlInput && (
              <div className="pt-2 border-t border-neutral-200">
                <input
                  type="url"
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                  placeholder="https://ejemplo.com/foto-material.jpg"
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:border-neutral-900 outline-none font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Descripción Oficial
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Family & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Familia
              </label>
              <input
                type="text"
                value={familia}
                onChange={(e) => setFamilia(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Unidad
              </label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Ubicación en Almacén
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: ESTANTE-A3, PASILLO-2..."
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:bg-white focus:border-neutral-900 outline-none transition-all"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
