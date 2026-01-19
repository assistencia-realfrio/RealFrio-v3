import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize2, RotateCcw, Check, X } from 'lucide-react';

interface SignatureCanvasProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialValue?: string | null;
  readOnly?: boolean;
  error?: boolean;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ label, onSave, onClear, initialValue, readOnly, error }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sincronizar o estado de vazio quando o valor inicial mudar externamente
  useEffect(() => {
    setIsEmpty(!initialValue);
  }, [initialValue]);

  // Inicializa o canvas principal (pequeno)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !readOnly && !initialValue) {
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = 160;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [readOnly, initialValue]);

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
      
      const handleResize = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        setupExpandedContext(canvas);

        const ctx = canvas.getContext('2d');
        if (ctx && tempCanvas.width > 0) {
           ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
        }
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
    setIsEmpty(false);
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

  const stopDrawing = (canvas: HTMLCanvasElement) => {
    if (readOnly) return;
    setIsDrawing(false);
    if (!isExpanded) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const handleClearAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    setIsEmpty(true);
    onClear();
  };

  const handleClearExpanded = () => {
    if (expandedCanvasRef.current) {
      const ctx = expandedCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, expandedCanvasRef.current.width, expandedCanvasRef.current.height);
      }
      setIsEmpty(true);
    }
  };

  const confirmExpandedSignature = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (expandedCanvasRef.current) {
      if (isEmpty) {
        onClear();
      } else {
        const dataUrl = expandedCanvasRef.current.toDataURL('image/png');
        onSave(dataUrl);
      }
      setIsExpanded(false);
    }
  };

  if (readOnly && initialValue) {
    return (
      <div className={`border rounded-lg bg-gray-50 p-2 overflow-hidden flex flex-col items-center justify-center h-40 ${error ? 'border-red-500 bg-red-50/30' : 'border-gray-200'}`}>
        <span className={`text-[10px] uppercase font-bold mb-1 ${error ? 'text-red-500' : 'text-gray-400'}`}>{label}</span>
        <img src={initialValue} alt={`Assinatura ${label}`} className="max-h-full object-contain mix-blend-multiply" />
      </div>
    );
  }

  return (
    <>
      <div className={`border rounded-lg shadow-sm overflow-hidden group transition-colors ${error && isEmpty ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/20' : 'border-gray-300 bg-white'}`}>
        <div className={`p-2 border-b text-xs font-bold uppercase tracking-wider flex justify-between items-center ${error && isEmpty ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500'}`}>
          <span>{label}</span>
          <div className="flex gap-2">
            {!readOnly && (
              <button 
                type="button"
                onClick={handleClearAction} 
                className={`transition-colors p-1 rounded-md ${error && isEmpty ? 'text-red-400 hover:text-red-600 hover:bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                title="Limpar Assinatura"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button 
              type="button"
              onClick={() => setIsExpanded(true)}
              className={`p-1 ${error && isEmpty ? 'text-red-600' : 'text-blue-500 hover:text-blue-700'}`}
              title="Expandir para assinar"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        <div 
          className="w-full h-[160px] relative cursor-pointer touch-none"
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {initialValue ? (
            <div className={`w-full h-full flex items-center justify-center p-2 ${error ? 'bg-red-50/10' : 'bg-gray-50'}`}>
               <img src={initialValue} className="max-h-full object-contain mix-blend-multiply" />
               <div className="absolute top-1 right-1 bg-white/80 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={12} className="text-gray-400" />
               </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={(e) => canvasRef.current && startDrawing(e, canvasRef.current)}
              onMouseMove={(e) => canvasRef.current && draw(e, canvasRef.current)}
              onMouseUp={() => canvasRef.current && stopDrawing(canvasRef.current)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={(e) => canvasRef.current && startDrawing(e, canvasRef.current)}
              onTouchMove={(e) => canvasRef.current && draw(e, canvasRef.current)}
              onTouchEnd={() => canvasRef.current && stopDrawing(canvasRef.current)}
              className={`w-full h-full ${error && isEmpty ? 'bg-[radial-gradient(#fecaca_1px,transparent_1px)]' : 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]'} [background-size:16px_16px]`}
            />
          )}
          {isEmpty && !initialValue && (
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-sm italic ${error ? 'text-red-400' : 'text-gray-300'}`}>
              {error ? 'Assinatura Obrigatória' : 'Toque para assinar'}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full flex justify-between items-center px-2 mb-2 sm:mb-4">
            <h3 className="text-white font-bold text-lg uppercase tracking-widest">Assinatura: {label}</h3>
            <button onClick={() => setIsExpanded(false)} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"><X size={24} /></button>
          </div>
          <div ref={containerRef} className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full flex-1 touch-none">
            <canvas
              ref={expandedCanvasRef}
              onMouseDown={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
              onMouseMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
              onMouseUp={() => expandedCanvasRef.current && stopDrawing(expandedCanvasRef.current)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={(e) => expandedCanvasRef.current && startDrawing(e, expandedCanvasRef.current)}
              onTouchMove={(e) => expandedCanvasRef.current && draw(e, expandedCanvasRef.current)}
              onTouchEnd={() => expandedCanvasRef.current && stopDrawing(expandedCanvasRef.current)}
              className="w-full h-full bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px] cursor-crosshair block"
            />
            <div className="absolute bottom-6 right-6 flex gap-4 z-10">
              <button type="button" onClick={handleClearExpanded} className="bg-gray-100 text-gray-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition-all shadow-md active:scale-95"><RotateCcw size={20} /> <span className="hidden sm:inline">LIMPAR</span></button>
              <button type="button" onClick={confirmExpandedSignature} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl transform active:scale-95 transition-all"><Check size={20} /> <span>CONFIRMAR</span></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureCanvas;
