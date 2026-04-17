import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Calendar, Wrench, AlertTriangle, 
  CheckCircle2, X, ChevronRight, Fuel, FileText, 
  MoreVertical, Trash2, Edit2, Car, RefreshCw, AlertCircle
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Vehicle, MaintenanceRecord, FuelRecord } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const FleetManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'fleet' | 'schedule'>('fleet');
  const [vehicleDetailTab, setVehicleDetailTab] = useState<'maintenance' | 'fuel'>('maintenance');
  
  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isBulkFuelModalOpen, setIsBulkFuelModalOpen] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [prefilledFuelData, setPrefilledFuelData] = useState<Partial<FuelRecord> | null>(null);
  const [bulkFuelData, setBulkFuelData] = useState<Partial<FuelRecord>[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelRecord | null>(null);

  useEffect(() => {
    fetchVehicles();
    fetchAllMaintenance();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      fetchMaintenanceRecords(selectedVehicle.id);
      fetchFuelRecords(selectedVehicle.id);
    }
  }, [selectedVehicle]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await mockData.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMaintenance = async () => {
    try {
      const data = await mockData.getAllMaintenanceRecords();
      setAllMaintenance(data);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    }
  };

  const fetchMaintenanceRecords = async (vehicleId: string) => {
    try {
      const data = await mockData.getMaintenanceRecords(vehicleId);
      setMaintenanceRecords(data);
    } catch (error) {
      console.error("Erro ao carregar registos:", error);
    }
  };

  const fetchFuelRecords = async (vehicleId: string) => {
    try {
      const data = await mockData.getFuelRecords(vehicleId);
      setFuelRecords(data);
    } catch (error) {
      console.error("Erro ao carregar abastecimentos:", error);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const getInt = (name: string) => {
      const val = formData.get(name) as string;
      return val ? parseInt(val) : 0;
    };

    const vehicleData = {
      license_plate: (formData.get('license_plate') as string)?.toUpperCase() || '',
      brand: formData.get('brand') as string || '',
      model: formData.get('model') as string || '',
      year: getInt('year') || new Date().getFullYear(),
      current_mileage: getInt('current_mileage'),
      next_revision_mileage: getInt('next_revision_mileage') || null,
      next_inspection_date: formData.get('next_inspection_date') as string || null,
      insurance_expiry_date: formData.get('insurance_expiry_date') as string || null,
      status: formData.get('status') as any,
      assigned_to: formData.get('assigned_to') as string || '',
    };

    try {
      if (editingVehicle) {
        await mockData.updateVehicle(editingVehicle.id, vehicleData);
      } else {
        await mockData.createVehicle(vehicleData);
      }
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      alert("Erro ao guardar veículo.");
    }
  };

  const openFuelModalWithData = (data: Partial<FuelRecord>) => {
    setPrefilledFuelData(data);
    setIsFuelModalOpen(true);
  };

  const handleSaveFuel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    
    const formData = new FormData(e.currentTarget);
    const fuelData = {
      vehicle_id: selectedVehicle.id,
      date: formData.get('date') as string,
      mileage: parseInt(formData.get('mileage') as string),
      total_value: parseFloat(formData.get('total_value') as string),
      liters: parseFloat(formData.get('liters') as string),
    };

    try {
      if (editingFuel) {
        await mockData.updateFuelRecord(editingFuel.id, fuelData);
      } else {
        await mockData.createFuelRecord(fuelData);
      }
      setIsFuelModalOpen(false);
      setPrefilledFuelData(null);
      setEditingFuel(null);
      fetchFuelRecords(selectedVehicle.id);
      
      // Se a quilometragem do abastecimento for maior que a atual do veículo, atualizar veículo
      if (fuelData.mileage > selectedVehicle.current_mileage) {
        await mockData.updateVehicle(selectedVehicle.id, { current_mileage: fuelData.mileage });
        fetchVehicles();
      }
    } catch (error) {
      alert("Erro ao guardar abastecimento.");
    }
  };

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm("Tem a certeza que deseja eliminar este registo?")) return;
    try {
      await mockData.deleteFuelRecord(id);
      if (selectedVehicle) fetchFuelRecords(selectedVehicle.id);
    } catch (error) {
      alert("Erro ao eliminar registo.");
    }
  };

  const handleSaveBulkFuel = async () => {
    if (!selectedVehicle || bulkFuelData.length === 0) return;
    
    try {
      setLoading(true);
      let successCount = 0;
      let errorMsgs: string[] = [];

      for (const record of bulkFuelData) {
        try {
          await mockData.createFuelRecord({
            vehicle_id: selectedVehicle.id,
            date: record.date || new Date().toISOString().split('T')[0],
            mileage: record.mileage || selectedVehicle.current_mileage,
            total_value: record.total_value || 0,
            liters: record.liters || 0,
          });
          successCount++;
        } catch (e: any) {
          console.error("Erro ao inserir registo individual:", e);
          errorMsgs.push(e.message || "Erro desconhecido");
        }
      }
      
      if (successCount > 0) {
        const kms = bulkFuelData.map(r => r.mileage || 0);
        const maxMileage = Math.max(...kms, 0);
        if (maxMileage > selectedVehicle.current_mileage) {
          await mockData.updateVehicle(selectedVehicle.id, { current_mileage: maxMileage });
        }
      }

      setIsBulkFuelModalOpen(false);
      setBulkFuelData([]);
      if (selectedVehicle) {
        fetchFuelRecords(selectedVehicle.id);
        fetchVehicles();
      }

      if (errorMsgs.length > 0) {
        if (errorMsgs.some(m => m.includes('vehicle_fuel_records') || m.includes('PGRST205'))) {
          alert("ERRO DE SCHEMA: A tabela 'vehicle_fuel_records' não foi encontrada. Por favor, execute o script SQL de configuração no seu painel Supabase.");
        } else {
          alert(`Importação concluída com avisos: ${successCount} registos importados, ${errorMsgs.length} falhas.`);
        }
      } else {
        alert(`${successCount} registos importados com sucesso.`);
      }
    } catch (error: any) {
      console.error("Erro fatal na importação em massa:", error);
      alert(`Erro crítico ao importar: ${error.message || "Por favor, verifique a ligação à base de dados."}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVehicle) return;

    setIsParsingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "application/pdf"
                }
              },
              {
                text: "Analise este documento (pode ser um talão individual ou uma listagem tabular de abastecimentos) e extraia todos os registos encontrados em formato JSON. Para cada registo, extraia: date (YYYY-MM-DD), mileage (número), total_value (número), liters (número). Se faltar o ano na data, assuma o ano mais provável indicado no cabeçalho ou o ano atual. Responda apenas com o JSON contendo um array 'records'."
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  records: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        mileage: { type: Type.NUMBER },
                        total_value: { type: Type.NUMBER },
                        liters: { type: Type.NUMBER }
                      },
                      required: ["date", "total_value", "liters"]
                    }
                  }
                },
                required: ["records"]
              }
            }
          });

          const data = JSON.parse(response.text || '{"records":[]}');
          const records = data.records || [];
          
          setIsParsingPdf(false);

          if (records.length === 1) {
            openFuelModalWithData(records[0]);
          } else if (records.length > 1) {
            setBulkFuelData(records);
            setIsBulkFuelModalOpen(true);
          } else {
            alert("Nenhum dado de abastecimento encontrado no documento.");
          }
        } catch (error) {
          console.error("Erro no processamento do Gemini:", error);
          alert("Não foi possível extrair dados automaticamente do PDF. Por favor, preencha manualmente.");
          setIsParsingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao ler ficheiro:", error);
      setIsParsingPdf(false);
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vehicleId = editingMaintenance ? editingMaintenance.vehicle_id : selectedVehicle?.id;
    if (!vehicleId) return;

    const recordData = {
      vehicle_id: vehicleId,
      type: formData.get('type') as any,
      date: formData.get('date') as string || new Date().toISOString().split('T')[0],
      mileage: parseInt(formData.get('mileage') as string) || 0,
      description: (formData.get('description') as string || '').toUpperCase(),
      cost: parseFloat(formData.get('cost') as string) || 0,
      provider: (formData.get('provider') as string || '').toUpperCase(),
      next_scheduled_date: formData.get('next_scheduled_date') as string || null,
      status: formData.get('status') as any,
      notes: (formData.get('notes') as string || '').toUpperCase(),
    };

    try {
      if (editingMaintenance) {
        await mockData.updateMaintenanceRecord(editingMaintenance.id, recordData);
      } else {
        await mockData.createMaintenanceRecord(recordData);
      }
      
      // Se for revisão e estiver concluída, atualizar quilometragem do veículo e próxima revisão
      if (recordData.type === 'revision' && recordData.status === 'completed') {
         const nextRev = recordData.mileage + 15000;
         await mockData.updateVehicle(vehicleId, {
           current_mileage: recordData.mileage,
           next_revision_mileage: nextRev,
           status: 'active'
         });
      } else if (recordData.status === 'completed') {
        const v = vehicles.find(v => v.id === vehicleId);
        if (v && v.status === 'maintenance') {
          await mockData.updateVehicle(vehicleId, { status: 'active' });
        }
      }

      setIsMaintenanceModalOpen(false);
      setEditingMaintenance(null);
      fetchVehicles();
      fetchAllMaintenance();
      if (selectedVehicle) fetchMaintenanceRecords(selectedVehicle.id);
    } catch (error) {
      alert("Erro ao guardar registo.");
    }
  };

  const handleCompleteMaintenance = (record: MaintenanceRecord) => {
    setEditingMaintenance({ ...record, status: 'completed' });
    setIsMaintenanceModalOpen(true);
  };

  const handleReleaseFromWorkshop = async (vehicle: Vehicle) => {
    if (!window.confirm(`Deseja marcar a reparação da viatura ${vehicle.license_plate} como concluída?`)) return;
    try {
      // Encontrar a manutenção pendente mais recente para este veículo
      const pendingMaintenance = allMaintenance
        .filter(m => m.vehicle_id === vehicle.id && m.status === 'scheduled')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (pendingMaintenance) {
        await handleCompleteMaintenance(pendingMaintenance);
      } else {
        // Se não houver manutenção registada, apenas muda o status do veículo
        await mockData.updateVehicle(vehicle.id, { status: 'active' });
        fetchVehicles();
      }
    } catch (error) {
      alert("Erro ao libertar viatura da oficina.");
    }
  };
  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Tem a certeza?")) return;
    try {
      await mockData.deleteVehicle(id);
      if (selectedVehicle?.id === id) setSelectedVehicle(null);
      fetchVehicles();
      fetchAllMaintenance();
    } catch (error) {
      alert("Erro ao apagar veículo.");
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">GESTÃO DE FROTA</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Frota & Manutenção Realfrio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setEditingVehicle(null); setIsVehicleModalOpen(true); }}
            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-slate-900/10 dark:shadow-none"
          >
            <Plus size={18} /> Nova Viatura
          </button>
        </div>
      </div>

      {/* Navigation & Selection Block (Centered) */}
      <div className="flex flex-col items-center gap-6 py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-[48px] mb-6 border border-slate-100 dark:border-slate-800/50">
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'fleet' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 font-bold'}`}
          >
            Viatura Ativa
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 font-bold'}`}
          >
            Agenda Geral
          </button>
        </div>

        {/* Inputs (Centered) */}
        {activeTab === 'fleet' && (
          <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl px-6 animate-in fade-in zoom-in duration-500">
            {/* Search */}
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="PROCURAR MATRÍCULA..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/10 outline-none w-full transition-all shadow-sm"
              />
            </div>

            {/* Dropdown */}
            <div className="relative w-full">
              <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <select 
                className="pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/10 outline-none w-full appearance-none transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                value={selectedVehicle?.id || ''}
                onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === e.target.value) || null)}
              >
                <option value="">SELECIONAR VIATURA...</option>
                {filteredVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.license_plate} — {v.brand} {v.model}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fleet' && selectedVehicle && (
          <button 
            onClick={() => { setSelectedVehicle(null); setSearchTerm(''); }}
            className="flex items-center gap-2 group -mt-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <RefreshCw size={12} className="text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Limpar Filtros e Seleção</span>
          </button>
        )}
      </div>

      {activeTab === 'fleet' ? (
        <div className="space-y-8">
          {!selectedVehicle ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[40px] shadow-sm animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                <Car size={40} />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Nenhuma Viatura Selecionada</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs">Escolha uma viatura no menu acima para começar a gerir a frota e manutenções.</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
                {/* Unified Info Header */}
                <div className="p-8 pb-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
                    {/* Left: Plate & Basic Info */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                       <h2 className="text-4xl md:text-5xl font-black bg-blue-600 text-white px-6 py-3 rounded-3xl uppercase tracking-tighter shadow-xl shadow-blue-500/30 shrink-0 transform -rotate-1">
                         {selectedVehicle.license_plate}
                       </h2>
                       <div className="text-center sm:text-left">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ano: {selectedVehicle.year}</p>
                         <p className="text-2xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">
                           {selectedVehicle.brand} <span className="text-slate-400 font-bold">{selectedVehicle.model}</span>
                         </p>
                       </div>
                    </div>

                    {/* Right: Key Metrics & Actions */}
                    <div className="flex flex-wrap items-center justify-center xl:justify-end gap-8 pt-6 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-center xl:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quilometragem</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                          {selectedVehicle.current_mileage.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-0.5">KM</span>
                        </p>
                      </div>
                      <div className="text-center xl:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          selectedVehicle.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${selectedVehicle.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {selectedVehicle.status === 'active' ? 'Operacional' : 'Em Manutenção'}
                        </span>
                      </div>
                      <div className="flex gap-2 pl-4 border-l border-slate-100 dark:border-slate-800">
                         <button 
                           onClick={() => { setEditingVehicle(selectedVehicle); setIsVehicleModalOpen(true); }} 
                           className="p-3.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all shadow-sm group"
                           title="Editar Viatura"
                         >
                           <Edit2 size={20} className="group-hover:scale-110 transition-transform" />
                         </button>
                         <button 
                           onClick={() => handleDeleteVehicle(selectedVehicle.id)} 
                           className="p-3.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all shadow-sm group"
                           title="Eliminar Viatura"
                         >
                           <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-y border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"><Calendar size={20} className="text-blue-500" /></div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Inspeção</p>
                         <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedVehicle.next_inspection_date ? new Date(selectedVehicle.next_inspection_date).toLocaleDateString() : '---'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"><FileText size={20} className="text-emerald-500" /></div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Seguro</p>
                         <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedVehicle.insurance_expiry_date ? new Date(selectedVehicle.insurance_expiry_date).toLocaleDateString() : '---'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-5 sm:col-span-2 lg:col-span-1">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:scale-105 transition-transform"><Truck size={22} className="text-amber-500" /></div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Condutor Habitual</p>
                         <p className="text-base font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{selectedVehicle.assigned_to || 'Não Atribuído'}</p>
                      </div>
                   </div>
                   <div className="flex items-center justify-center lg:justify-end">
                      {selectedVehicle.status === 'maintenance' && (
                        <button 
                          onClick={() => handleReleaseFromWorkshop(selectedVehicle)}
                          className="w-full lg:w-auto text-[10px] font-black text-emerald-600 uppercase tracking-widest py-3 px-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm"
                        >
                          Concluir Manutenção
                        </button>
                      )}
                   </div>
                </div>
                {/* Next Schedule Alert */}
                {maintenanceRecords.find(r => r.status === 'scheduled') && (
                  <div className="mx-6 mt-4 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-blue-600" />
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Próximo Agendamento</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {maintenanceRecords.find(r => r.status === 'scheduled')?.description} - {new Date(maintenanceRecords.find(r => r.status === 'scheduled')!.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCompleteMaintenance(maintenanceRecords.find(r => r.status === 'scheduled')!)}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title="Concluir Agora"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">Agendado</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Separator / Title Section */}
              <div className="pt-8 pb-4 flex flex-col items-center">
                 <div className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-4" />
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Gestão de Atividade e Registos</h3>
              </div>

              {/* Interactive Content Section (Tabs & Lists) */}
              <div className="mt-4 space-y-6">
                 {/* View Tabs */}
                 <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setVehicleDetailTab('maintenance')}
                    className={`py-4 px-10 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg ${
                      vehicleDetailTab === 'maintenance' 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-105 ring-4 ring-slate-900/10' 
                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    Métricas & Manutenção
                  </button>
                  <button 
                    onClick={() => setVehicleDetailTab('fuel')}
                    className={`py-4 px-10 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg ${
                      vehicleDetailTab === 'fuel' 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-105 ring-4 ring-slate-900/10' 
                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    Registos de Abastecimento
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
                  {/* Maintenance History View */}
                  {vehicleDetailTab === 'maintenance' && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Wrench size={16} className="text-slate-400" /> Histórico de Manutenção
                      </h3>
                      <button 
                        onClick={() => { setEditingMaintenance(null); setIsMaintenanceModalOpen(true); }}
                        className="text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        + Adicionar Registo
                      </button>
                    </div>

                    <div className="space-y-4">
                      {maintenanceRecords.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          <p className="text-xs text-slate-400 font-medium uppercase">Sem registos de manutenção</p>
                        </div>
                      ) : (
                        maintenanceRecords.map(record => (
                          <div key={record.id} className="group relative flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                record.type === 'revision' ? 'bg-blue-100 text-blue-600' :
                                record.type === 'repair' ? 'bg-red-100 text-red-600' :
                                record.type === 'inspection' ? 'bg-purple-100 text-purple-600' :
                                'bg-slate-200 text-slate-600'
                              }`}>
                                {record.type === 'revision' ? <RefreshCw size={18} /> : 
                                 record.type === 'repair' ? <Wrench size={18} /> :
                                 record.type === 'inspection' ? <FileText size={18} /> : <AlertTriangle size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                  <h4 className="font-bold text-slate-900 dark:text-white uppercase text-sm">{record.description}</h4>
                                  <span className="text-xs font-mono font-medium text-slate-500">{new Date(record.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 uppercase">{record.provider} • {record.mileage.toLocaleString()} km</p>
                                {record.notes && <p className="text-xs text-slate-400 mt-2 italic">"{record.notes}"</p>}
                              </div>
                            </div>
                            
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                <p className="font-bold text-slate-900 dark:text-white">{record.cost.toFixed(2)}€</p>
                                <div className="flex items-center gap-1">
                                  {record.status === 'scheduled' && (
                                    <button onClick={() => handleCompleteMaintenance(record)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Concluir"><CheckCircle2 size={16} /></button>
                                  )}
                                  <button onClick={() => { setEditingMaintenance(record); setIsMaintenanceModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Edit2 size={16} /></button>
                                </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                record.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>{record.status === 'completed' ? 'Concluído' : 'Agendado'}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Fuel History View */}
                {vehicleDetailTab === 'fuel' && (
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Fuel size={16} className="text-emerald-500" /> Registo de Consumos
                      </h3>
                      <div className="flex gap-2">
                        <label className="cursor-pointer text-[10px] font-bold uppercase bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                          <FileText size={14} /> Importar PDF
                          <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={isParsingPdf} />
                        </label>
                        <button 
                          onClick={() => setIsFuelModalOpen(true)}
                          className="text-[10px] font-bold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          + Novo Abastecimento
                        </button>
                      </div>
                    </div>

                    {isParsingPdf && (
                        <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 animate-pulse">
                            <RefreshCw size={16} className="text-emerald-600 animate-spin" />
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">A analisar PDF com Inteligência Artificial...</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      {fuelRecords.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          <p className="text-xs text-slate-400 font-medium uppercase">Sem registos de combustível</p>
                        </div>
                      ) : (
                        fuelRecords.map(record => (
                          <div key={record.id} className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:border-emerald-500/30 transition-all group">
                             {/* Date & Total Section */}
                             <div className="flex items-center justify-between md:items-start md:flex-col md:min-w-[120px] gap-2">
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
                                   <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{new Date(record.date).toLocaleDateString()}</p>
                                </div>
                                <div className="md:mt-2 text-right md:text-left">
                                   <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-0.5 md:hidden">Total</p>
                                   <p className="text-xl font-black text-emerald-600">{record.total_value.toFixed(2)} €</p>
                                </div>
                             </div>

                             {/* Metrics Section */}
                             <div className="grid grid-cols-2 gap-8 flex-1 md:pl-6 md:border-l border-slate-100 dark:border-slate-800">
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> KM
                                   </p>
                                   <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">{record.mileage.toLocaleString()} <span className="text-[10px] font-normal text-slate-400 ml-1">km</span></p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Litros
                                   </p>
                                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{record.liters.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 ml-1">L</span></p>
                                </div>
                             </div>

                             {/* Actions Section */}
                             <div className="flex items-center justify-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50 dark:border-slate-800">
                                <button 
                                  onClick={() => { setEditingFuel(record); setIsFuelModalOpen(true); }} 
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all group/btn"
                                >
                                  <Edit2 size={14} className="group-hover/btn:scale-110 transition-transform" />
                                  <span className="text-[10px] font-black uppercase tracking-widest md:hidden lg:inline-block">Editar</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteFuel(record.id)} 
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group/btn"
                                >
                                  <Trash2 size={14} className="group-hover/btn:scale-110 transition-transform" />
                                  <span className="text-[10px] font-black uppercase tracking-widest md:hidden lg:inline-block">Apagar</span>
                                </button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Agendamentos Próximos */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" /> Agendamentos Futuros
            </h3>
            <div className="space-y-3">
              {allMaintenance.filter(m => m.status === 'scheduled').length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem agendamentos previstos</p>
                </div>
              ) : (
                allMaintenance.filter(m => m.status === 'scheduled').map(m => (
                  <div key={m.id} className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-blue-200 transition-all gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white uppercase text-sm">{m.description}</h4>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">
                          {m.vehicles?.license_plate} • {m.vehicles?.brand} {m.vehicles?.model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCompleteMaintenance(m)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Concluir"><CheckCircle2 size={18} /></button>
                        <button onClick={() => { setEditingMaintenance(m); setIsMaintenanceModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600">{new Date(m.date).toLocaleDateString()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{m.provider}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Viaturas na Oficina */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Wrench size={18} className="text-amber-500" /> Viaturas na Oficina
            </h3>
            <div className="space-y-3">
              {vehicles.filter(v => v.status === 'maintenance').length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhuma viatura em reparação</p>
                </div>
              ) : (
                vehicles.filter(v => v.status === 'maintenance').map(v => (
                  <div key={v.id} className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-blue-200 transition-all gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Truck size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white uppercase text-sm">{v.license_plate}</h4>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">
                          {v.brand} {v.model} • {v.current_mileage.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleReleaseFromWorkshop(v)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Concluir Reparação"><CheckCircle2 size={18} /></button>
                      </div>
                      <button 
                        onClick={() => { setSelectedVehicle(v); setActiveTab('fleet'); }}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Veículo */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingVehicle ? 'Editar Viatura' : 'Nova Viatura'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matrícula</label>
                  <input name="license_plate" defaultValue={editingVehicle?.license_plate} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold uppercase" placeholder="AA-00-AA" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Marca</label>
                  <input name="brand" defaultValue={editingVehicle?.brand} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Ex: Renault" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Modelo</label>
                  <input name="model" defaultValue={editingVehicle?.model} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Ex: Kangoo" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ano</label>
                  <input name="year" type="number" defaultValue={editingVehicle?.year} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="2024" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Km Atuais</label>
                  <input name="current_mileage" type="number" defaultValue={editingVehicle?.current_mileage} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Próx. Revisão (Km)</label>
                  <input name="next_revision_mileage" type="number" defaultValue={editingVehicle?.next_revision_mileage} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validade Inspeção</label>
                  <input name="next_inspection_date" type="date" defaultValue={editingVehicle?.next_inspection_date} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validade Seguro</label>
                  <input name="insurance_expiry_date" type="date" defaultValue={editingVehicle?.insurance_expiry_date} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Condutor Habitual</label>
                 <input name="assigned_to" defaultValue={editingVehicle?.assigned_to} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Nome do colaborador" />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</label>
                 <select name="status" defaultValue={editingVehicle?.status || 'active'} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm">
                   <option value="active">Ativo</option>
                   <option value="maintenance">Em Manutenção</option>
                   <option value="inactive">Inativo</option>
                 </select>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity mt-4 shadow-xl shadow-slate-900/10 dark:shadow-none">
                Guardar Viatura
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Manutenção */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingMaintenance ? 'Editar Manutenção' : 'Registar Manutenção'}
              </h3>
              <button onClick={() => { setIsMaintenanceModalOpen(false); setEditingMaintenance(null); }}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveMaintenance} className="p-6 space-y-4">
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Serviço</label>
                 <select name="type" defaultValue={editingMaintenance?.type || 'revision'} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm">
                   <option value="revision">Revisão Periódica</option>
                   <option value="repair">Reparação / Avaria</option>
                   <option value="inspection">Inspeção Periódica (IPO)</option>
                   <option value="tires">Pneus</option>
                   <option value="other">Outros</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</label>
                  <input name="date" type="date" defaultValue={editingMaintenance?.date || new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quilometragem</label>
                  <input name="mileage" type="number" defaultValue={editingMaintenance?.mileage || selectedVehicle?.current_mileage} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição</label>
                  <input name="description" defaultValue={editingMaintenance?.description} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Ex: Mudança de óleo e filtros" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custo (€)</label>
                  <input name="cost" type="number" step="0.01" defaultValue={editingMaintenance?.cost} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fornecedor</label>
                  <input name="provider" defaultValue={editingMaintenance?.provider} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Oficina X" />
                </div>
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</label>
                 <select name="status" defaultValue={editingMaintenance?.status || 'completed'} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm">
                   <option value="completed">Concluído</option>
                   <option value="scheduled">Agendado</option>
                 </select>
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas Adicionais</label>
                  <textarea name="notes" rows={3} defaultValue={editingMaintenance?.notes} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm" placeholder="Observações..." />
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity mt-2 shadow-xl shadow-slate-900/10 dark:shadow-none">
                {editingMaintenance ? 'Atualizar Registo' : 'Registar Manutenção'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Combustível */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingFuel ? 'Editar Abastecimento' : 'Registar Abastecimento'}
                </h3>
                {prefilledFuelData && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Sugestão da IA carregada
                    </span>
                )}
              </div>
              <button onClick={() => { setIsFuelModalOpen(false); setPrefilledFuelData(null); setEditingFuel(null); }}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveFuel} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</label>
                  <input 
                    name="date" 
                    type="date" 
                    required 
                    defaultValue={editingFuel?.date || prefilledFuelData?.date || new Date().toISOString().split('T')[0]} 
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm ${prefilledFuelData?.date ? 'ring-2 ring-emerald-500/20' : ''}`} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">KM Atual</label>
                  <input 
                    name="mileage" 
                    type="number" 
                    required 
                    defaultValue={editingFuel?.mileage || prefilledFuelData?.mileage || selectedVehicle?.current_mileage} 
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-mono ${prefilledFuelData?.mileage ? 'ring-2 ring-emerald-500/20' : ''}`} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Litros</label>
                  <input 
                    name="liters" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={editingFuel?.liters || prefilledFuelData?.liters}
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm ${prefilledFuelData?.liters ? 'ring-2 ring-emerald-500/20' : ''}`} 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total (€)</label>
                  <input 
                    name="total_value" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={editingFuel?.total_value || prefilledFuelData?.total_value}
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm ${prefilledFuelData?.total_value ? 'ring-2 ring-emerald-500/20' : ''}`} 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              
              {!prefilledFuelData && !editingFuel && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium uppercase">DICA: PODE TAMBÉM IMPORTAR O TALÃO DIRETAMENTE ATRAVÉS DO BOTÃO "IMPORTAR PDF" NA LISTA PARA QUE O SISTEMA PREENCHA OS DADOS AUTOMATICAMENTE.</p>
                </div>
              )}

              {prefilledFuelData && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                    <p className="text-[10px] text-emerald-700 leading-relaxed font-medium uppercase">OS DADOS ACIMA FORAM EXTRAÍDOS DO PDF PELA IA. POR FAVOR, VERIFIQUE ANTES DE GUARDAR.</p>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors">
                {editingFuel ? 'Atualizar Abastecimento' : (prefilledFuelData ? 'Confirmar e Guardar' : 'Guardar Abastecimento')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importação em Massa */}
      {isBulkFuelModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Importar Listagem de Abastecimentos</h3>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={10} /> {bulkFuelData.length} registos detectados pela IA
                </span>
              </div>
              <button onClick={() => { setIsBulkFuelModalOpen(false); setBulkFuelData([]); }}><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={16} className="text-emerald-600 mt-0.5" />
                  <p className="text-[10px] text-emerald-700 leading-relaxed font-medium uppercase">
                    A IA detectou múltiplos registos neste documento. Por favor, verifique a lista abaixo antes de confirmar a importação para a viatura selecionada.
                  </p>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="py-2 font-black text-slate-400 uppercase tracking-widest">KM</th>
                    <th className="py-2 font-black text-slate-400 uppercase tracking-widest">Litros</th>
                    <th className="py-2 font-black text-slate-400 uppercase tracking-widest">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkFuelData.map((record, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="py-2 font-bold text-slate-700 dark:text-slate-300">{record.date}</td>
                      <td className="py-2 font-mono text-slate-600">{record.mileage?.toLocaleString() || '---'}</td>
                      <td className="py-2 font-bold text-slate-700 dark:text-slate-300">{record.liters?.toFixed(2)} L</td>
                      <td className="py-2 font-black text-emerald-600">{record.total_value?.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={() => { setIsBulkFuelModalOpen(false); setBulkFuelData([]); }}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-widest rounded-xl hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveBulkFuel}
                disabled={loading}
                className="flex-2 py-3 bg-emerald-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? 'A Importar...' : `Confirmar Importação de ${bulkFuelData.length} Registos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
