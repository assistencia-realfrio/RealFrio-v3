
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, ArrowLeft, HardDrive, ChevronDown, MapPin, Trash2
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
          brand: eq.brand,
          model: eq.model,
          serial_number: eq.serial_number,
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
      if (!formData.establishment_id || !formData.type || !formData.brand || !formData.serial_number) {
        throw new Error("Por favor, preencha os campos obrigatórios.");
      }
      await mockData.updateEquipment(id, formData);
      alert("Ativo atualizado com sucesso!");
      navigate(-1);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar equipamento.");
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
        <button onClick={() => navigate(-1)} className="p-3 bg-white text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Editar Ativo</h1>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gestão de Equipamento</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
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
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none"
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
                <input required type="text" name="type" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.type} onChange={handleChange} placeholder="Ex: Ar Condicionado" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Marca *</label>
              <input required type="text" name="brand" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" value={formData.brand} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Modelo</label>
              <input type="text" name="model" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" value={formData.model} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Número de Série (S/N) *</label>
              <input required type="text" name="serial_number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-mono font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" value={formData.serial_number} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Instalação</label>
              <input type="date" name="install_date" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" value={formData.install_date} onChange={handleChange} />
            </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <Save size={20} />
              {isSubmitting ? 'A GUARDAR...' : 'GUARDAR ALTERAÇÕES'}
            </button>
            <button type="button" onClick={handleDelete} className="w-full text-red-500 font-black text-[10px] uppercase tracking-widest py-3 border border-red-100 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
              <Trash2 size={16} /> Eliminar Ativo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEquipment;
