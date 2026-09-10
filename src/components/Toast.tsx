import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none font-sans toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-300 shadow-lg animate-slide-up"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs text-neutral-900 leading-tight">{toast.title}</p>
        {toast.message && <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed font-mono">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
