import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Loader2, Check, AlertCircle, Box, MapPin, Hash, Trash2, Plus, Search, User } from 'lucide-react';
import { mockData } from '../services/mockData';
import { extractDeliveryDataFromPDF } from '../services/geminiService';
import { MaterialDeliveryItem, Client, Establishment } from '../types';

const NewDelivery: React.FC = () => {
  const navigate = useNavigate();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedEstId, setSelectedEstId] = useState<string>('');

  const [formData, setFormData] = useState({
    client_name: '',
    loading_address: 'Real Frio - CR',
    at_code: '',
  });
  const [loadingAddressType, setLoadingAddressType] = useState<'CR' | 'PM' | 'other'>('CR');
  const [items, setItems] = useState<MaterialDeliveryItem[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await mockData.getClients();
      setClients(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  };

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedEstId('');
    
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setFormData(prev => ({
          ...prev,
          client_name: client.name
        }));
        
        try {
          const ests = await mockData.getEstablishmentsByClient(clientId);
          setEstablishments(ests);
          if (ests.length > 0) {
            // Se houver apenas um (geralmente a SEDE), seleciona automaticamente
            if (ests.length === 1) {
              const sede = ests[0];
              setSelectedEstId(sede.id);
            }
          }
        } catch (err) {
          console.error("Erro ao carregar estabelecimentos:", err);
        }
      }
    } else {
      // Se desmarcar o cliente, não limpamos os campos para permitir edição manual
    }
  };

  const handleEstChange = (estId: string) => {
    setSelectedEstId(estId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Por favor, selecione um ficheiro PDF.");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      // Converter PDF para Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const extractedData = await extractDeliveryDataFromPDF(base64String);
          
          // Apenas importamos os artigos, conforme solicitado
          if (extractedData.items && Array.isArray(extractedData.items)) {
            const newItems = extractedData.items.map((i: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: i.name || 'Artigo Desconhecido',
              quantity: Number(i.quantity) || 1,
              delivered: false
            }));
            setItems(prev => [...prev, ...newItems]);
          }

          // Opcionalmente, podemos importar o código AT se existir
          if (extractedData.at_code && !formData.at_code) {
            setFormData(prev => ({ ...prev, at_code: extractedData.at_code }));
          }
        } catch (err: any) {
          setError(err.message || "Erro ao extrair dados do PDF.");
        } finally {
          setIsExtracting(false);
        }
      };
      reader.onerror = () => {
        setError("Erro ao ler o ficheiro.");
        setIsExtracting(false);
      };
    } catch (err) {
      setError("Erro inesperado ao processar ficheiro.");
      setIsExtracting(false);
    }
  };

  const handleLoadingAddressTypeChange = (type: 'CR' | 'PM' | 'other') => {
    setLoadingAddressType(type);
    if (type === 'CR') {
      setFormData(prev => ({ ...prev, loading_address: 'Real Frio - CR' }));
    } else if (type === 'PM') {
      setFormData(prev => ({ ...prev, loading_address: 'Real Frio - PM' }));
    } else {
      setFormData(prev => ({ ...prev, loading_address: '' }));
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setError("Adicione pelo menos um artigo à entrega.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        items,
        status: 'pending',
        notes: JSON.stringify({ 
          client_id: selectedClientId || null,
          establishment_id: selectedEstId || null
        })
      };

      const newDelivery = await mockData.createMaterialDelivery(payload);
      navigate(`/deliveries/${newDelivery.id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao guardar a entrega.");
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, delivered: false }]);
  };

  const updateItem = (index: number, field: keyof MaterialDeliveryItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl border dark:border-slate-800 flex-shrink-0 shadow-sm active:scale-95 transition-all">
          <ArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>
        <div className="min-w-0">
           <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight truncate">Nova Entrega</h1>
           <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Importação de Guia</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">{error}</p>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center">
        <input 
          type="file" 
          accept="application/pdf" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        
        {isExtracting ? (
          <div className="py-12 space-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">A analisar documento...</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A inteligência artificial está a extrair os dados da guia.</p>
          </div>
        ) : (
          <div className="py-8 space-y-6">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FileText size={40} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Importar Guia de Transporte</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
                Faça upload do PDF da guia. O sistema irá preencher automaticamente os dados do cliente e os artigos.
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Upload size={16} /> Selecionar PDF
            </button>
          </div>
        )}
      </div>

      {/* Form Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
          <FileText size={18} className="text-blue-500" /> Dados da Entrega
        </h3>

        <div className="space-y-4">
          {/* Seleção de Cliente */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Selecionar Cliente (Base de Dados)</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase appearance-none"
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">-- SELECIONAR CLIENTE OU INTRODUZIR MANUALMENTE --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClientId && establishments.length > 0 && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Estabelecimento / Local de Entrega</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase appearance-none"
                    value={selectedEstId}
                    onChange={(e) => handleEstChange(e.target.value)}
                  >
                    <option value="">-- SELECIONAR ESTABELECIMENTO --</option>
                    {establishments.map(e => (
                      <option key={e.id} value={e.id}>{e.name} - {e.address}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cliente</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                  value={formData.client_name} 
                  onChange={e => setFormData({...formData, client_name: e.target.value})}
                  placeholder="EX: RESTAURANTE O MAR"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Morada de Carga</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button 
                  onClick={() => handleLoadingAddressTypeChange('CR')}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${loadingAddressType === 'CR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'}`}
                >
                  Real Frio - CR
                </button>
                <button 
                  onClick={() => handleLoadingAddressTypeChange('PM')}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${loadingAddressType === 'PM' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'}`}
                >
                  Real Frio - PM
                </button>
                <button 
                  onClick={() => handleLoadingAddressTypeChange('other')}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${loadingAddressType === 'other' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'}`}
                >
                  Outra
                </button>
              </div>
              
              {loadingAddressType === 'other' && (
                <div className="relative animate-in slide-in-from-top-2 duration-200">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                    value={formData.loading_address} 
                    onChange={e => setFormData({...formData, loading_address: e.target.value})}
                    placeholder="MORADA DE ORIGEM"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Código AT (Autoridade Tributária)</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-mono font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                value={formData.at_code} 
                onChange={e => setFormData({...formData, at_code: e.target.value})}
                placeholder="EX: AT123456789"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Box size={18} className="text-blue-500" /> Artigos a Entregar
          </h3>
          <button 
            onClick={addItem}
            className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum artigo adicionado</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl">
                <div className="flex-1">
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                    value={item.name} 
                    onChange={e => updateItem(index, 'name', e.target.value)}
                    placeholder="NOME DO ARTIGO"
                  />
                </div>
                <div className="w-24">
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-center"
                    value={item.quantity} 
                    onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                  />
                </div>
                <button 
                  onClick={() => removeItem(index)}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving || isExtracting} 
        className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl active:scale-95"
      >
        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Check size={18} />} 
        {isSaving ? 'A GUARDAR...' : 'CRIAR REGISTO DE ENTREGA'}
      </button>

    </div>
  );
};

export default NewDelivery;
