
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Building, User, Phone, Mail, 
  MapPin, ChevronDown, FileText, Info, Cloud
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { useStore } from '../contexts/StoreContext';

const NewClient: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Empresa',
    address: '',
    phone: '',
    email: '',
    billing_name: '', 
    notes: '',
    google_drive_link: '',
    store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore as string
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.name || !formData.store || !formData.address) {
        throw new Error("Por favor, preencha o Nome, Morada e Loja.");
      }
      await mockData.createClient(formData);
      navigate('/clients');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-white text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Novo Parceiro</h1>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cadastro de Cliente</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 bg-slate-50 border-b border-gray-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dados Principais e Contactos</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Entidade Comercial (Nome Público) *</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="text"
                  name="name"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Hotel Avenida ou João Silva"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome para Faturação / Firma</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text"
                  name="billing_name"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.billing_name}
                  onChange={handleChange}
                  placeholder="Ex: Hotel Avenida Soc. Unip. Lda"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telemóvel / Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="tel"
                  name="phone"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9xx xxx xxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Principal</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email"
                  name="email"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="cliente@exemplo.pt"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Google Drive Link (Opcional)</label>
              <div className="relative">
                <Cloud className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="url"
                  name="google_drive_link"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.google_drive_link}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loja de Atendimento *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  required
                  name="store"
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none transition-all"
                  value={formData.store}
                  onChange={handleChange}
                  disabled={currentStore !== 'Todas'}
                >
                  <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                  <option value="Porto de Mós">PORTO DE MÓS</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Morada de Sede / Link Maps *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="text"
                  name="address"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Texto ou link https://maps.app.goo.gl/..."
                />
              </div>
              <div className="mt-3 flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <Info size={14} className="text-blue-500 flex-shrink-0" />
                <p className="text-[9px] font-black text-blue-700 uppercase leading-relaxed">
                  Nota: Ao guardar, será criado automaticamente um local de intervenção com esta morada denominado "SEDE / PRINCIPAL".
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'A PROCESSAR...' : 'CADASTRAR PARCEIRO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClient;
