import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Check, AlertCircle, Box, MapPin, Hash, Trash2, Plus } from 'lucide-react';
import { mockData } from '../services/mockData';
import { MaterialDeliveryItem } from '../types';

const EditDelivery: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_nif: '',
    loading_address: '',
    unloading_address: '',
    at_code: '',
  });
  const [items, setItems] = useState<MaterialDeliveryItem[]>([]);

  useEffect(() => {
    if (id) {
      fetchDelivery();
    }
  }, [id]);

  const fetchDelivery = async () => {
    setLoading(true);
    try {
      const data = await mockData.getMaterialDeliveryById(id!);
      setFormData({
        client_name: data.client_name || '',
        client_nif: data.client_nif || '',
        loading_address: data.loading_address || '',
        unloading_address: data.unloading_address || '',
        at_code: data.at_code || '',
      });
      setItems((data.items || []).map((item: MaterialDeliveryItem) => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        delivered: item.delivered || false
      })));
    } catch (err: any) {
      setError("Erro ao carregar os dados da entrega.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.client_name) {
      setError("O nome do cliente é obrigatório.");
      return;
    }
    if (items.length === 0) {
      setError("Adicione pelo menos um artigo à entrega.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: any = {
        ...formData,
        items,
        notes: JSON.stringify({ client_nif: formData.client_nif })
      };

      try {
        await mockData.updateMaterialDelivery(id!, payload);
      } catch (e) {
        console.warn("Retrying without client_nif column:", e);
        const safePayload = { ...payload };
        delete safePayload.client_nif;
        await mockData.updateMaterialDelivery(id!, safePayload);
      }
      
      navigate(`/deliveries/${id}`);
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

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl border dark:border-slate-800 flex-shrink-0 shadow-sm active:scale-95 transition-all">
          <ArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>
        <div className="min-w-0">
           <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight truncate">Editar Entrega</h1>
           <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Alterar Dados da Guia</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">{error}</p>
        </div>
      )}

      {/* Form Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
          <FileText size={18} className="text-blue-500" /> Dados da Entrega
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cliente *</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                value={formData.client_name} 
                onChange={e => setFormData({...formData, client_name: e.target.value})}
                placeholder="EX: RESTAURANTE O MAR"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIF do Cliente</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                value={formData.client_nif} 
                onChange={e => setFormData({...formData, client_nif: e.target.value})}
                placeholder="EX: 500123456"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Morada de Carga</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                  value={formData.loading_address} 
                  onChange={e => setFormData({...formData, loading_address: e.target.value})}
                  placeholder="MORADA DE ORIGEM"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Morada de Descarga</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                  value={formData.unloading_address} 
                  onChange={e => setFormData({...formData, unloading_address: e.target.value})}
                  placeholder="MORADA DE DESTINO"
                />
              </div>
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
        disabled={isSaving} 
        className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl active:scale-95"
      >
        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Check size={18} />} 
        {isSaving ? 'A GUARDAR...' : 'GUARDAR ALTERAÇÕES'}
      </button>

    </div>
  );
};

export default EditDelivery;
