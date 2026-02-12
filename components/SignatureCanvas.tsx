
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize2, RotateCcw, Check, X, PenLine, Smartphone, ScreenShare } from 'lucide-react';
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
  const expandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Detetar se é um dispositivo táctil (telemóvel ou tablet)
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsEmpty(!initialValue);
  }, [initialValue]);

  const setupExpandedContext = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1e293b'; 
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  useEffect(() => {
    if (isExpanded && expandedCanvasRef.current && containerRef.current) {
      const canvas = expandedCanvasRef.current;
      const container = containerRef.current;
      
      const updateCanvasSize = () => {
        // Agora usamos a dimensão real do ecrã pós-rotação física
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        setupExpandedContext(canvas);
      };

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
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
      const dataUrl = expandedCanvasRef.current.toDataURL('image/png');
      setIsEmpty(false);
      onSave(dataUrl);
      setIsExpanded(false);
    }
  };

  if (readOnly && initialValue) {
    return (
      <div className={`border rounded-2xl bg-gray-50 dark:bg-slate-950 p-2 overflow-hidden flex flex-col items-center justify-center h-40 ${error ? 'border-red-500 bg-red-50/30' : 'border-gray-200 dark:border-slate-800'}`}>
        <span className={`text-[10px] uppercase font-bold mb-1 ${error ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>{label}</span>
        <img src={initialValue} alt={label} className={`max-h-full object-contain ${isDark ? 'brightness-200 invert' : 'mix-blend-multiply'}`} />
      </div>
    );
  }

  return (
    <>
      <div className={`border rounded-2xl shadow-sm overflow-hidden group transition-colors ${error && isEmpty ? 'border-red-500 bg-red-50/20' : 'border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
        <div className={`p-3 border-b text-[10px] font-black uppercase tracking-widest flex justify-between items-center ${error && isEmpty ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
          <span>{label}</span>
          <div className="flex gap-2">
            {!readOnly && initialValue && (
              <button type="button" onClick={handleClearAction} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><RotateCcw size={14} /></button>
            )}
            <button type="button" onClick={() => setIsExpanded(true)} className={`p-1.5 rounded-lg ${error && isEmpty ? 'text-red-600' : 'text-blue-500 dark:text-blue-400'}`}><Maximize2 size={14} /></button>
          </div>
        </div>

        <div className="w-full h-[160px] relative cursor-pointer touch-none bg-white dark:bg-slate-950" onClick={() => setIsExpanded(true)}>
          {initialValue ? (
            <div className="w-full h-full flex items-center justify-center p-4">
               <img src={initialValue} className={`max-h-full object-contain ${isDark ? 'brightness-200 invert' : 'mix-blend-multiply'}`} alt="Assinatura" />
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)]' : 'bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)]'} [background-size:20px_20px]`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${error ? 'bg-red-100 text-red-500' : 'bg-blue-50 dark:bg-slate-800 text-blue-500'}`}><PenLine size={20} /></div>
               <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${error ? 'text-red-400' : 'text-slate-300 dark:text-slate-600'}`}>{error ? 'Assinatura Obrigatória' : 'Toque para assinar'}</span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300 overflow-hidden">
          
          {/* AVISO DE ROTAÇÃO PARA MOBILE/TABLET EM PORTRAIT */}
          {isTouchDevice && isPortrait && (
            <div className="fixed inset-0 z-[1200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95 duration-500">
               <div className="relative mb-8">
                  <Smartphone size={80} className="text-white opacity-20" />
                  <ScreenShare size={48} className="text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
               </div>
               <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Rode o Dispositivo</h3>
               <p className="text-slate-400 text-sm font-medium uppercase leading-relaxed max-w-xs mb-10">
                 Para assinar com maior precisão e conforto, por favor coloque o seu telemóvel ou tablet na <span className="text-blue-400">horizontal</span>.
               </p>
               <button 
                 onClick={() => setIsExpanded(false)}
                 className="px-8 py-4 bg-white/10 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95"
               >
                 CANCELAR
               </button>
            </div>
          )}

          {/* Botão de Fecho (X) */}
          <button 
            onClick={() => setIsExpanded(false)} 
            className="fixed top-4 right-4 z-[1100] p-4 bg-white/10 text-white rounded-full hover:bg-white/20 border border-white/10 transition-colors backdrop-blur-xl active:scale-90 shadow-2xl"
          >
            <X size={24} />
          </button>
          
          <div ref={containerRef} className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
            {/* White Pad Box */}
            <div className="relative w-full h-full bg-white shadow-2xl transition-all duration-300 overflow-hidden flex items-center justify-center rounded-[2.5rem] sm:rounded-[3rem]">
              
              <canvas
                ref={expandedCanvasRef}
                onMouseDown={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
                onMouseMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
                onMouseUp={() => stopDrawing()}
                onMouseLeave={() => stopDrawing()}
                onTouchStart={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
                onTouchMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
                onTouchEnd={() => stopDrawing()}
                className="bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] cursor-crosshair block z-10 w-full h-full"
              />
              
              {/* Botões de Ação */}
              <div className="absolute bottom-8 right-8 flex gap-3 z-[20]">
                <button 
                  type="button" 
                  onClick={handleClearExpanded} 
                  className="bg-slate-50 text-slate-500 px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm active:scale-95 border border-slate-100"
                >
                  <RotateCcw size={14} /> LIMPAR
                </button>
                <button 
                  type="button" 
                  onClick={confirmExpandedSignature} 
                  className="bg-blue-600 text-white px-7 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Check size={16} /> CONFIRMAR
                </button>
              </div>

              {/* Texto de Marca d'água lateral (Landscape) */}
              <div className="absolute top-1/2 left-4 -translate-y-1/2 -rotate-90 pointer-events-none opacity-20 origin-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] whitespace-nowrap">Área de Validação Digital Real Frio</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureCanvas;
