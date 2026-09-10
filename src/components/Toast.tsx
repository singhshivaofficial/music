import React from 'react';
import { Sparkles, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div
      id="aether-glass-toast"
      className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#31323e]/90 backdrop-blur-2xl border border-[#bfc0d1]/30 text-white text-xs font-medium shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-bounce-short"
    >
      {type === 'success' ? (
        <CheckCircle className="w-4 h-4 text-[#60519b]" />
      ) : (
        <Info className="w-4 h-4 text-[#bfc0d1]" />
      )}
      <span>{message}</span>
      <Sparkles className="w-3.5 h-3.5 text-[#60519b]" />
    </div>
  );
};
