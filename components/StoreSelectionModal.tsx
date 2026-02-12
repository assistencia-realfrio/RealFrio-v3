
import React from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, Building2, Layers, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import BrandLogo from './BrandLogo';

const StoreSelectionModal: React.FC = () => {
  const { showSelectionModal, setStore } = useStore();
  const location = useLocation();

  // Se estivermos na página pública de aprovação de orçamento, nunca mostrar este modal
  const isPublicQuotePage = location.pathname.startsWith('/proposal/');

  if (!showSelectionModal || isPublicQuotePage) return null;

  const options = [
    { 
      id: 'Caldas da Rainha', 
      label: 'Caldas da Rainha', 
      icon: Building2, 
      color: 'bg-blue-600', 
      light: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400'
    },
    { 
      id: 'Porto de Mós', 
      label: 'Porto de Mós', 
      icon: MapPin, 
      color: 'bg-red-600', 
      light: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400'
    },
    { 
      id: 'Todas', 
      label: 'Ambas as Lojas', 
      icon: Layers, 
      color: 'bg-slate-900', 
      light: 'bg-slate-50 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
        
        <div className="p-10 text-center space-y-6">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" />
          </div>
          
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Bem-vindo ao Sistema
            </h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-3 flex items-center justify-center gap-2">
              <Sparkles size={12} /> Selecione o Local de Trabalho
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStore(opt.id as any)}
                className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-[2rem] transition-all active:scale-[0.98] text-left shadow-sm hover:shadow-xl"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl ${opt.light} flex items-center justify-center ${opt.text} group-hover:${opt.color} group-hover:text-white transition-all shadow-inner`}>
                    <opt.icon size={28} />
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${opt.text} group-hover:text-slate-900 dark:group-hover:text-white`}>
                      {opt.label}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {opt.id === 'Todas' ? 'Visão Global do Sistema' : 'Focar nesta unidade'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] pt-4">
            Pode alterar esta seleção a qualquer momento no menu lateral
          </p>
        </div>

        <div className="bg-slate-900 dark:bg-black p-6 text-center">
           <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.5em]">Real Frio Tech • Gestão de Assistência</p>
        </div>
      </div>
    </div>
  );
};

export default StoreSelectionModal;
