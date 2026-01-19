
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardDrive, Edit2 } from 'lucide-react';
import { mockData } from '../services/mockData';
import { Equipment } from '../types';

const Equipments: React.FC = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState<(Equipment & { client_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const eqs = await mockData.getEquipments();
      const clients = await mockData.getClients();
      
      const enriched = eqs.map(e => ({
        ...e,
        client_name: clients.find(c => c.id === e.client_id)?.name
      }))
      // Ordenação alfabética global por tipo
      .sort((a, b) => a.type.localeCompare(b.type, 'pt-PT'));
      
      setEquipments(enriched);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Parque de Equipamentos</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestão Global de Ativos</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
           A carregar parque de equipamentos...
        </div>
      ) : equipments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 mx-1">
           <HardDrive size={32} className="mx-auto text-gray-300 mb-2" />
           <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest">
             Nenhum equipamento registado.
           </p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-[2.5rem] border border-gray-100 overflow-hidden mx-1">
           <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-50">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipamento / SN</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Marca / Modelo</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {equipments.map((eq) => (
                    <tr 
                      key={eq.id} 
                      onClick={() => navigate(`/equipments/${eq.id}`)}
                      className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            <HardDrive size={18} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{eq.type}</div>
                            <div className="text-[10px] font-black text-slate-300 font-mono uppercase">SN: {eq.serial_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/clients/${eq.client_id}`); }}
                          className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                         >
                            {eq.client_name || '---'}
                         </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-black text-slate-800 uppercase">{eq.brand}</span>
                        <span className="text-[11px] font-bold text-slate-400 ml-1.5 uppercase">{eq.model || '---'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/equipments/${eq.id}/edit`); }}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all inline-block"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default Equipments;
