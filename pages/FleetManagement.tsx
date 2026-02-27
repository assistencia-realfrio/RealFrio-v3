import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Calendar, Wrench, AlertTriangle, 
  CheckCircle2, X, ChevronRight, Fuel, Gauge, FileText, 
  MoreVertical, Trash2, Edit2, Car, RefreshCw
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Vehicle, MaintenanceRecord } from '../types';

const FleetManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'fleet' | 'schedule'>('fleet');
  
  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    fetchVehicles();
    fetchAllMaintenance();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      fetchMaintenanceRecords(selectedVehicle.id);
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

  const stats = {
    total: vehicles.length,
    inWorkshop: vehicles.filter(v => v.status === 'maintenance').length,
    scheduled: allMaintenance.filter(m => m.status === 'scheduled').length,
    alerts: vehicles.filter(v => 
      (v.next_revision_mileage && v.current_mileage >= v.next_revision_mileage - 1000) ||
      (v.next_inspection_date && new Date(v.next_inspection_date) <= new Date(Date.now() + 15 * 24 * 60 * 60 * 1000))
    ).length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestão de Frota</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Controlo de viaturas, manutenções e custos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Procurar matrícula, marca..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => { setEditingVehicle(null); setIsVehicleModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} /> Nova Viatura
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Frota</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
            <Car className="text-slate-200 dark:text-slate-800" size={24} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Na Oficina</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-600">{stats.inWorkshop}</span>
            <Wrench className="text-amber-100 dark:text-amber-900/30" size={24} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Agendamentos</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-blue-600">{stats.scheduled}</span>
            <Calendar className="text-blue-100 dark:text-blue-900/30" size={24} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Alertas</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-red-600">{stats.alerts}</span>
            <AlertTriangle className="text-red-100 dark:text-red-900/30" size={24} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('fleet')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'fleet' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Frota
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Agenda & Oficina
        </button>
      </div>

      {activeTab === 'fleet' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Veículos */}
          <div className="lg:col-span-1 space-y-4">
            {filteredVehicles.map(vehicle => (
              <div 
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle)}
                className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all cursor-pointer group ${selectedVehicle?.id === vehicle.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <Car size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase">{vehicle.license_plate}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                    vehicle.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                    vehicle.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {vehicle.status === 'active' ? 'Ativo' : vehicle.status === 'maintenance' ? 'Oficina' : 'Inativo'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Quilometragem</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{vehicle.current_mileage.toLocaleString()} km</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Próx. Revisão</span>
                    <span className={`font-mono font-medium ${vehicle.next_revision_mileage && vehicle.current_mileage >= vehicle.next_revision_mileage ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {vehicle.next_revision_mileage?.toLocaleString() || '---'} km
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredVehicles.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Truck size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs uppercase font-bold tracking-widest">Nenhuma viatura encontrada</p>
              </div>
            )}
          </div>

          {/* Detalhes e Histórico */}
          <div className="lg:col-span-2">
            {selectedVehicle ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                {/* Header Detalhes */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-start">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{selectedVehicle.brand} {selectedVehicle.model}</h2>
                     <div className="flex items-center gap-3">
                       <span className="text-sm font-mono font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200">{selectedVehicle.license_plate}</span>
                       <span className="text-xs text-slate-500 font-medium uppercase">Ano: {selectedVehicle.year}</span>
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingVehicle(selectedVehicle); setIsVehicleModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteVehicle(selectedVehicle.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspeção</p>
                      <div className="flex items-center gap-2">
                         <Calendar size={14} className="text-blue-500" />
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedVehicle.next_inspection_date ? new Date(selectedVehicle.next_inspection_date).toLocaleDateString() : '---'}</span>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguro</p>
                      <div className="flex items-center gap-2">
                         <FileText size={14} className="text-emerald-500" />
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedVehicle.insurance_expiry_date ? new Date(selectedVehicle.insurance_expiry_date).toLocaleDateString() : '---'}</span>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condutor</p>
                      <div className="flex items-center gap-2">
                         <Truck size={14} className="text-amber-500" />
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{selectedVehicle.assigned_to || 'Não atribuído'}</span>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        selectedVehicle.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedVehicle.status === 'active' ? 'Operacional' : 'Em Manutenção'}
                      </span>
                   </div>
                </div>

                {/* Next Schedule Alert */}
                {maintenanceRecords.find(r => r.status === 'scheduled') && (
                  <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between">
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

                {/* Maintenance History */}
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
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Truck size={64} className="mb-4 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest">Selecione uma viatura para ver detalhes</p>
              </div>
            )}
          </div>
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
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors">
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
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors">
                {editingMaintenance ? 'Atualizar Registo' : 'Registar Manutenção'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
