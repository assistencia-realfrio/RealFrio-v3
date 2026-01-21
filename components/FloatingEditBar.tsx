import React from 'react';
import { Save, X } from 'lucide-react';

interface FloatingEditBarProps {
  isVisible: boolean;
  isSubmitting?: boolean;
  onSave: () => void;
  onCancel: () => void;
  labelSave?: string;
  labelCancel?: string;
}

const FloatingEditBar: React.FC<FloatingEditBarProps> = ({ 
  isVisible, 
  isSubmitting, 
  onSave, 
  onCancel,
  labelSave = "GUARDAR ALTERAÇÕES",
  labelCancel = "CANCELAR"
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-[0_25px_60px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-3 flex items-center gap-3">
        <button 
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          <X size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">{labelCancel}</span>
        </button>
        
        <button 
          onClick={onSave}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Save size={18} />
              <span className="text-[11px] font-black uppercase tracking-[0.15em]">{labelSave}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FloatingEditBar;