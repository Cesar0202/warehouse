import React from 'react';
import { 
  Play, 
  Trash2, 
  ClipboardPaste, 
  ArrowRight,
  MessageSquareQuote
} from 'lucide-react';

interface OrderInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onProcessOrder: () => void;
  isProcessing: boolean;
}

export const OrderInput: React.FC<OrderInputProps> = ({
  inputText,
  setInputText,
  onProcessOrder,
  isProcessing
}) => {
  const lineCount = inputText.trim() ? inputText.split(/\r?\n/).filter(l => l.trim().length > 0).length : 0;

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setInputText(clipText);
      }
    } catch (err) {
      console.warn('Clipboard read error', err);
    }
  };

  const handleProcess = () => {
    onProcessOrder();
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-7 space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-neutral-900 tracking-tight">
              Entrada de Pedido Desestructurado
            </h3>
            <p className="text-xs text-neutral-500 font-medium">
              Pega el texto tal cual llega desde WhatsApp, correo o notas. El sistema detectará cantidades y jergas.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Pegar</span>
          </button>
          {inputText && (
            <button
              type="button"
              onClick={() => setInputText('')}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              title="Limpiar campo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Textarea Area */}
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Pega aquí el pedido técnico...`}
          rows={6}
          className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs sm:text-sm font-mono placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all resize-y leading-relaxed"
        />

        {lineCount > 0 && (
          <div className="absolute right-3.5 bottom-3.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-[11px] font-mono font-semibold text-neutral-600 shadow-sm">
            {lineCount} {lineCount === 1 ? 'línea detectada' : 'líneas detectadas'}
          </div>
        )}
      </div>

      {/* Bottom Bar: Process Button */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={handleProcess}
          disabled={!inputText.trim() || isProcessing}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-black active:scale-98 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Procesando pedido...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Procesar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
