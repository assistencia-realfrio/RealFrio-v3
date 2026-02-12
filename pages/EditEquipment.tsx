
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, ArrowLeft, HardDrive, ChevronDown, MapPin, Trash2, Loader2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Establishment, Equipment } from '../types';

const EditEquipment: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const eq = await mockData.getEquipmentById(id!);
      if (eq) {
        setFormData({
          establishment_id: eq.establishment_id,
          type: eq.type,
          brand: eq.brand || '',
          model: eq.model || '',
          pnc: eq.pnc || '',
          serial_number: eq.serial_number || '',
          install_date: eq.install_date || ''
        });
        
        const ests = await mockData.getEstablishmentsByClient(eq.client_id);
        setEstablishments(ests);
      } else {
        alert("Equipamento não encontrado.");
        navigate(-1);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao carregar dados do equipamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      if (!formData.establishment_id || !formData.type) {
        throw new Error("Por favor, preencha a Localização e o Tipo de Máquina.");
      }

      const payload: Partial<Equipment> = {
        establishment_id: formData.establishment_id,
        type: formData.type.toUpperCase().trim(),
        brand: formData.brand.trim() ? formData.brand.toUpperCase().trim() : null,
        model: formData.model.trim() ? formData.model.toUpperCase().trim() : null,
        pnc: formData.pnc.trim() ? formData.pnc.toUpperCase().trim() : null,
        serial_number: formData.serial_number.trim() ? formData.serial_number.toUpperCase().trim() : null,
        install_date: formData.install_date || null
      };

      await mockData.updateEquipment(id, payload);
      navigate(-1);
    } catch (err: any) {
      console.error("Erro ao atualizar equipamento:", err);
      alert("ERRO AO ATUALIZAR: " + (err.message || "Verifique os dados."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm("Eliminar este ativo definitivamente do sistema? Esta ação não pode ser desfeita.")) {
      setIsSubmitting(true);
      try {
        await mockData.deleteEquipment(id);
        navigate('/equipments');
      } catch (err: any) {
        alert(err.message || "Erro ao eliminar equipamento.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95 border border-transparent dark:border-slate-800">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Editar Ativo</h1>
           <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Gestão de Equipamento</p>
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
                <input required type="text" name="type" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={formData.type} onChange={handleChange} placeholder="Ex: Ar Condicionado" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Marca <span className="text-blue-500">(Recomendado)</span></label>
              <input type="text" name="brand" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={formData.brand} onChange={handleChange} placeholder="---" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Modelo <span className="text-blue-500">(Recomendado)</span></label>
              <input type="text" name="model" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={formData.model} onChange={handleChange} placeholder="---" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">PNC (Product Number Code)</label>
              <input type="text" name="pnc" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={formData.pnc} onChange={handleChange} placeholder="Opcional" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Número de Série (S/N) <span className="text-blue-500">(Recomendado)</span></label>
              <input type="text" name="serial_number" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-mono font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={formData.serial_number} onChange={handleChange} placeholder="S/N OU DESCONHECIDO" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Instalação</label>
              <input type="date" name="install_date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none" value={formData.install_date} onChange={handleChange} />
            </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
              {isSubmitting ? 'A GUARDAR...' : 'GUARDAR ALTERAÇÕES'}
            </button>
            <button type="button" onClick={handleDelete} className="w-full text-red-500 font-black text-[10px] uppercase tracking-widest py-3 border border-red-100 dark:border-red-900/30 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2">
              <Trash2 size={16} /> Eliminar Ativo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEquipment;
