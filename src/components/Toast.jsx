import React from 'react';
import { useUI } from '../store.jsx';
import { cx } from '../ui.jsx';

const TONES = {
  default: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
};

export default function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div
      className={cx(
        'fixed bottom-6 right-6 z-50 max-w-sm rounded-xl px-4 py-3 text-[12px] font-medium shadow-pop animate-toast-in',
        TONES[toast.tone] || TONES.default
      )}
    >
      {toast.msg}
    </div>
  );
}
