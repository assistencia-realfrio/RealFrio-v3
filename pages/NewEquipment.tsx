
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, ArrowLeft, HardDrive, MapPin, ChevronDown
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Establishment } from '../types';

const NewEquipment: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    establishment_id: '',
    type: '',
    brand: '',
    model: '',
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
    setLoading(true);
    try {
      if (!formData.establishment_id || !formData.type || !formData.brand || !formData.serial_number) {
        throw new Error("Por favor, preencha os campos obrigatórios.");
      }
      await mockData.createEquipment({
        ...formData,
        client_id: clientId
      });
      navigate(`/clients/${clientId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!client) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-white text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Registo Ativo</h1>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{client.name.toUpperCase()}</p>
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
              {establishments.length === 0 && (
                <p className="text-[9px] text-red-500 font-bold uppercase mt-2 ml-1">Atenção: Deve criar um local na ficha do cliente antes.</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Máquina *</label>
              <div className="relative">
                <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required type="text" name="type"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.type} onChange={handleChange}
                  placeholder="Ex: Ar Condicionado, Forno, Máquina de Gelo"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Marca *</label>
              <input 
                required type="text" name="brand"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                value={formData.brand} onChange={handleChange}
                placeholder="Fabricante"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Modelo</label>
              <input 
                type="text" name="model"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                value={formData.model} onChange={handleChange}
                placeholder="Versão ou Código"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Número de Série (S/N) *</label>
              <input 
                required type="text" name="serial_number"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-mono font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                value={formData.serial_number} onChange={handleChange}
                placeholder="XXXXXXXX"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Instalação</label>
              <input 
                type="date" name="install_date"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                value={formData.install_date} onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading || !formData.establishment_id}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'A PROCESSAR...' : 'CADASTRAR EQUIPAMENTO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewEquipment;
