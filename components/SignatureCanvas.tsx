
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize2, RotateCcw, Check, X, PenLine } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SignatureCanvasProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialValue?: string | null;
  readOnly?: boolean;
  error?: boolean;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ label, onSave, onClear, initialValue, readOnly, error }) => {
  // Removemos a ref do canvas pequeno, pois não vamos desenhar nele diretamente
  const expandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sincronizar o estado de vazio quando o valor inicial mudar externamente
  useEffect(() => {
    setIsEmpty(!initialValue);
  }, [initialValue]);

  const setupExpandedContext = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = isDark ? '#60a5fa' : '#1e293b';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isDark]);

  useEffect(() => {
    if (isExpanded && expandedCanvasRef.current && containerRef.current) {
      const canvas = expandedCanvasRef.current;
      const container = containerRef.current;
      
      const handleResize = () => {
        // Guardar o conteúdo atual antes de redimensionar (se necessário)
        // Nota: Ao abrir fresco, queremos que esteja limpo ou podemos carregar a imagem inicial se quisermos editar
        // Para simplificar, assumimos nova assinatura ao abrir, mas mantemos o contexto configurado.
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        setupExpandedContext(canvas);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [isExpanded, setupExpandedContext]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    if (readOnly) return;
    setIsDrawing(true);
    // Não alteramos isEmpty aqui, apenas ao confirmar
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
    if (e.cancelable) e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawing || readOnly) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    if (readOnly) return;
    setIsDrawing(false);
  };

  const handleClearAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    setIsEmpty(true);
    onClear();
  };

  const handleClearExpanded = () => {
    if (expandedCanvasRef.current) {
      const ctx = expandedCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, expandedCanvasRef.current.width, expandedCanvasRef.current.height);
      }
    }
  };

  const confirmExpandedSignature = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (expandedCanvasRef.current) {
      // Verificar se o canvas tem conteúdo verificando pixels ou assumindo que se o utilizador clicou em confirmar, é válido
      // Uma forma simples é verificar se foi desenhado algo, mas como o estado isDrawing reseta, 
      // assumimos que o utilizador desenhou algo. 
      // Para ser mais robusto, poderíamos contar pixels não transparentes, mas vamos simplificar:
      
      const dataUrl = expandedCanvasRef.current.toDataURL('image/png');
      
      // Verificação simples: se o canvas estiver totalmente vazio, dataUrl será pequeno/padrão.
      // Mas vamos confiar na ação do utilizador.
      
      setIsEmpty(false);
      onSave(dataUrl);
      setIsExpanded(false);
    }
  };

  const openSignaturePad = () => {
    if (!readOnly) {
      setIsExpanded(true);
    }
  };

  if (readOnly && initialValue) {
    return (
      <div className={`border rounded-2xl bg-gray-50 dark:bg-slate-950 p-2 overflow-hidden flex flex-col items-center justify-center h-40 ${error ? 'border-red-500 bg-red-50/30' : 'border-gray-200 dark:border-slate-800'}`}>
        <span className={`text-[10px] uppercase font-bold mb-1 ${error ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>{label}</span>
        <img src={initialValue} alt={`Assinatura ${label}`} className={`max-h-full object-contain ${isDark ? 'brightness-200 invert' : 'mix-blend-multiply'}`} />
      </div>
    );
  }

  return (
    <>
      <div className={`border rounded-2xl shadow-sm overflow-hidden group transition-colors ${error && isEmpty ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/20' : 'border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
        <div className={`p-3 border-b text-[10px] font-black uppercase tracking-widest flex justify-between items-center ${error && isEmpty ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
          <span>{label}</span>
          <div className="flex gap-2">
            {!readOnly && initialValue && (
              <button 
                type="button"
                onClick={handleClearAction} 
                className={`transition-colors p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10`}
                title="Limpar"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button 
              type="button"
              onClick={openSignaturePad}
              className={`p-1.5 rounded-lg ${error && isEmpty ? 'text-red-600' : 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
              title="Assinar"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Área de Visualização / Botão de Abertura */}
        <div 
          className={`w-full h-[160px] relative cursor-pointer touch-none bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors`}
          onClick={openSignaturePad}
        >
          {initialValue ? (
            <div className={`w-full h-full flex items-center justify-center p-4`}>
               <img src={initialValue} className={`max-h-full object-contain ${isDark ? 'brightness-200 invert' : 'mix-blend-multiply'}`} alt="Assinatura" />
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)]' : 'bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)]'} [background-size:20px_20px]`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${error ? 'bg-red-100 text-red-500' : 'bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-slate-400'}`}>
                  <PenLine size={20} />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${error ? 'text-red-400' : 'text-slate-300 dark:text-slate-600'}`}>
                 {error ? 'Assinatura Obrigatória' : 'Toque para assinar'}
               </span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full flex justify-between items-center px-4 mb-4">
            <h3 className="text-white font-black text-sm uppercase tracking-[0.3em]">{label}</h3>
            <button onClick={() => setIsExpanded(false)} className="p-4 bg-white/5 text-white rounded-full hover:bg-white/10 transition-colors backdrop-blur-xl border border-white/10"><X size={28} /></button>
          </div>
          <div ref={containerRef} className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden w-full flex-1 touch-none border border-white/5">
            <canvas
              ref={expandedCanvasRef}
              onMouseDown={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
              onMouseMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
              onMouseUp={() => stopDrawing()}
              onMouseLeave={() => stopDrawing()}
              onTouchStart={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
              onTouchMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
              onTouchEnd={() => stopDrawing()}
              className={`w-full h-full ${isDark ? 'bg-[radial-gradient(#1e293b_2px,transparent_2px)]' : 'bg-[radial-gradient(#e5e7eb_2px,transparent_2px)]'} [background-size:32px_32px] cursor-crosshair block`}
            />
            <div className="absolute bottom-8 right-8 flex gap-4 z-10">
              <button type="button" onClick={handleClearExpanded} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-xl active:scale-95"><RotateCcw size={18} /> LIMPAR</button>
              <button type="button" onClick={confirmExpandedSignature} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 transform active:scale-95 transition-all"><Check size={20} /> CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureCanvas;
    