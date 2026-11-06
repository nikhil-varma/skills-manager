import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/15 bg-white/90 dark:bg-[#1c1e26]/90 px-4 py-3 text-xs shadow-2xl backdrop-blur-2xl animate-slide-up max-w-md select-none">
      {isSuccess && <CheckCircle2 className="h-4 w-4 text-[#34C759] flex-shrink-0" />}
      {isError && <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />}
      {!isSuccess && !isError && <Info className="h-4 w-4 text-[#007AFF] flex-shrink-0" />}

      <span className="text-slate-800 dark:text-slate-200 font-medium">{toast.message}</span>

      <button
        onClick={onClose}
        className="ml-2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
