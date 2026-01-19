
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, CheckCircle, Play, Timer, ExternalLink, ChevronRight, Hash } from 'lucide-react';
import { mockData } from '../services/mockData';
import { TimeEntry } from '../types';

const TimeLogs: React.FC = () => {
  const [entries, setEntries] = useState<(TimeEntry & { os_code: string, client_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeLogs();
  }, []);

  const loadTimeLogs = async () => {
    setLoading(true);
    const data = await mockData.getAllTimeEntries();
    setEntries(data);
    setLoading(false);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'HOJE';
    if (date.toDateString() === yesterday.toDateString()) return 'ONTEM';
    return date.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  };

  // Group entries by day
  const groupedEntries = entries.reduce((acc: any, entry) => {
    const day = new Date(entry.start_time).toDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const totalMinutesToday = entries
    .filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registo de Tempos</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Histórico de Intervenções</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-blue-600 block leading-none">
            {Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m
          </span>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Hoje</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
           <Clock size={32} className="mx-auto text-gray-200 mb-2" />
           <p className="text-gray-400 font-medium italic text-xs">Ainda não existem registos de tempo.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedEntries).map((dayKey) => (
            <div key={dayKey} className="space-y-3">
              <h2 className="text-[10px] font-black text-slate-400 tracking-[0.3em] px-4 flex items-center gap-3">
                <Calendar size={12} />
                {getDayLabel(dayKey)}
                <span className="h-px bg-slate-100 flex-1"></span>
                <span className="text-slate-900">
                  {formatDuration(groupedEntries[dayKey].reduce((acc: number, curr: any) => acc + (curr.duration_minutes || 0), 0))}
                </span>
              </h2>
              
              <div className="space-y-2">
                {groupedEntries[dayKey].map((entry: any) => (
                  <Link 
                    to={`/os/${entry.os_id}`}
                    key={entry.id} 
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-gray-50 text-gray-400">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 font-mono flex items-center bg-slate-50 px-1.5 py-0.5 rounded">
                             <Hash size={8} className="mr-0.5"/> {entry.os_code}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase truncate max-w-[150px] sm:max-w-xs">
                            {entry.client_name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-tight italic line-clamp-1">
                          "{entry.description || 'Sem descrição.'}"
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-slate-900">
                         {formatDuration(entry.duration_minutes)}
                       </span>
                       <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-end mt-1">
                          <Clock size={8} className="mr-1"/> {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeLogs;
