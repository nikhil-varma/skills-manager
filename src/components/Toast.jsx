import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 text-xs shadow-2xl backdrop-blur-xl animate-slide-up max-w-md">
      {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
      {isError && <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
      {!isSuccess && !isError && <Info className="h-4 w-4 text-indigo-400 flex-shrink-0" />}

      <span className="text-slate-200 font-medium">{toast.message}</span>

      <button
        onClick={onClose}
        className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
