
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, ArrowLeft, HardDrive, MapPin, ChevronDown, Loader2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Establishment, Equipment } from '../types';

const NewEquipment: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    establishment_id: '',
    type: '',
    brand: '',
    model: '',
    pnc: '',
    serial_number: '',
    install_date: ''
  });

  useEffect(() => {
    if (clientId) {
      mockData.getClientById(clientId).then(setClient);
      mockData.getEstablishmentsByClient(clientId).then(setEstablishments);
    }
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setIsSubmitting(true);
    try {
      if (!formData.establishment_id || !formData.type) {
        throw new Error("Por favor, preencha a Localização e o Tipo de Máquina.");
      }

      const payload: Partial<Equipment> = {
        client_id: clientId,
        establishment_id: formData.establishment_id,
        type: formData.type.toUpperCase().trim(),
        brand: formData.brand.trim() ? formData.brand.toUpperCase().trim() : null,
        model: formData.model.trim() ? formData.model.toUpperCase().trim() : null,
        pnc: formData.pnc.trim() ? formData.pnc.toUpperCase().trim() : null,
        serial_number: formData.serial_number.trim() ? formData.serial_number.toUpperCase().trim() : null,
        install_date: formData.install_date || null
      };

      await mockData.createEquipment(payload);
      navigate(`/clients/${clientId}`);
    } catch (err: any) {
      console.error("Erro ao criar equipamento:", err);
      if (err.code === '23505') {
        alert("ERRO: Este Número de Série (" + formData.serial_number.toUpperCase() + ") já se encontra registado no sistema.");
      } else {
        alert("ERRO NO CADASTRO: " + (err.message || "Verifique os dados inseridos."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!client) return (
    <div className="h-full flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95 border border-transparent dark:border-slate-800">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Registo Ativo</h1>
           <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{client.name.toUpperCase()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Localização de Instalação *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select
                  name="establishment_id"
                  value={formData.establishment_id}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none transition-all"
                >
                  <option value="">Selecione um local...</option>
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Máquina *</label>
              <div className="relative">
                <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required type="text" name="type"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                  value={formData.type} onChange={handleChange}
                  placeholder="Ex: Ar Condicionado"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Marca <span className="text-blue-500">(Recomendado)</span></label>
              <input 
                type="text" name="brand"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                value={formData.brand} onChange={handleChange}
                placeholder="---"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Modelo <span className="text-blue-500">(Recomendado)</span></label>
              <input 
                type="text" name="model"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                value={formData.model} onChange={handleChange}
                placeholder="---"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">PNC (Product Number Code)</label>
              <input 
                type="text" name="pnc"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                value={formData.pnc} onChange={handleChange}
                placeholder="Opcional"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Número de Série (S/N) <span className="text-blue-500">(Recomendado)</span></label>
              <input 
                type="text" name="serial_number"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-mono font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                value={formData.serial_number} onChange={handleChange}
                placeholder="S/N OU DESCONHECIDO"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Instalação</label>
              <input 
                type="date" name="install_date"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={formData.install_date} onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit" disabled={isSubmitting || !formData.establishment_id}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
            {isSubmitting ? 'A PROCESSAR...' : 'CADASTRAR EQUIPAMENTO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewEquipment;
