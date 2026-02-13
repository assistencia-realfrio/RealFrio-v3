
import { supabase } from '../supabaseClient';
import { 
  Client, Establishment, Equipment, ServiceOrder, OSStatus, OSType, 
  UserRole, PartUsed, OSPhoto, PartCatalogItem, 
  OSActivity, Vacation, OSNote, Profile, TimeEntry, Quote, QuoteItem, QuoteStatus
} from '../types';

const SESSION_KEY = 'rf_active_session_v3';

const cleanPayload = (data: any) => {
  const cleaned = { ...data };
  delete cleaned.client;
  delete cleaned.establishment;
  delete cleaned.equipment;
  delete cleaned.items;
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.code;

  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  });

  return cleaned;
};

// Helper para formatar o ID com base na loja e timestamp
const generateSmartCode = (prefix: string, storeName: string) => {
  const now = new Date();
  const storeMap: Record<string, string> = {
    'Caldas da Rainha': 'CR',
    'Porto de Mós': 'PM'
  };
  
  const sPrefix = storeMap[storeName] || 'OS';
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  return prefix ? `${sPrefix}-${prefix}-${dateStr}-${timeStr}` : `${sPrefix}-${dateStr}-${timeStr}`;
};

export const mockData = {
  // Auth
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error };
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    const fullUser = { ...data.user, ...profile };
    localStorage.setItem(SESSION_KEY, JSON.stringify(fullUser));
    return { user: fullUser, error: null };
  },
  signUp: async (email: string, password: string, fullName: string, role: UserRole, store: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, email, full_name: fullName, role, store }]);
    }
    return data.user;
  },
  getSession: () => {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },
  signOut: async () => {
    localStorage.removeItem(SESSION_KEY);
    // Limpar flag de seleção de loja para forçar popup no próximo login
    sessionStorage.removeItem('rf_store_selected_session');
    await supabase.auth.signOut();
  },

  // Perfil e Notificações
  savePushSubscription: async (userId: string, subscription: any) => {
    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', userId);
    if (error) throw error;
    return true;
  },

  // Restante das funções de mockData omitidas para brevidade, mantendo a estrutura original...
  // Quotes
  getQuotes: async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getQuoteById: async (id: string) => {
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .eq('id', id)
      .single();
    
    if (qError) throw qError;
    
    if (quote) {
      const { data: items, error: iError } = await supabase.from('quote_items').select('*').eq('quote_id', id);
      if (iError) throw iError;
      return { ...quote, items: items || [] };
    }
    return null;
  },

  createQuote: async (quoteData: Partial<Quote>, items: Partial<QuoteItem>[]) => {
    const code = generateSmartCode('ORC', quoteData.store || 'Todas');
    const payload = cleanPayload(quoteData);
    
    if (!payload.description || payload.description.trim() === '') {
      payload.description = 'ORÇAMENTO / PROPOSTA COMERCIAL';
    }
    
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .insert([{ 
        ...payload, 
        code, 
        status: QuoteStatus.PENDENTE,
        total_amount: quoteData.total_amount || 0
      }])
      .select()
      .single();
    
    if (qError) throw qError;

    if (items && items.length > 0) {
      const itemsPayload = items.map(item => ({
        quote_id: quote.id,
        name: item.name?.toUpperCase(),
        reference: item.reference?.toUpperCase() || '---',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        is_labor: !!item.is_labor
      }));
      const { error: iError } = await supabase.from('quote_items').insert(itemsPayload);
      if (iError) throw iError;
    }
    return quote;
  },

  updateQuote: async (id: string, quoteData: Partial<Quote>, items: Partial<QuoteItem>[]) => {
    const payload = cleanPayload(quoteData);

    if (!payload.description || payload.description.trim() === '') {
      payload.description = 'ORÇAMENTO / PROPOSTA COMERCIAL';
    }

    const { error: qError } = await supabase.from('quotes').update(payload).eq('id', id);
    if (qError) throw qError;

    await supabase.from('quote_items').delete().eq('quote_id', id);

    if (items && items.length > 0) {
      const itemsPayload = items.map(item => ({
        quote_id: id,
        name: item.name?.toUpperCase(),
        reference: item.reference?.toUpperCase() || '---',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        is_labor: !!item.is_labor
      }));
      await supabase.from('quote_items').insert(itemsPayload);
    }
    return true;
  },

  updateQuoteStatus: async (id: string, status: QuoteStatus) => {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
    if (error) throw error;
    return true;
  },

  clientSignQuote: async (id: string, signature: string) => {
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({ 
        status: QuoteStatus.AGUARDA_VALIDACAO, 
        client_signature: signature
      })
      .eq('id', id)
      .select('code, client_id')
      .single();
    
    if (error) throw error;

    try {
      if (quote) {
        const { data: linkedOS } = await supabase
          .from('service_orders')
          .select('id')
          .eq('client_id', quote.client_id)
          .or(`status.eq.${OSStatus.PARA_ORCAMENTO},status.eq.${OSStatus.ORCAMENTO_ENVIADO}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (linkedOS) {
          await supabase.from('os_activities').insert([{
            os_id: linkedOS.id,
            description: `ORÇAMENTO ${quote.code} ASSINADO PELO CLIENTE (AGUARDA VALIDAÇÃO NO SISTEMA DE COTAÇÕES)`,
            user_name: 'CLIENTE (WEB)'
          }]);
        }
      }
    } catch (e) {}

    return true;
  },

  verifyQuote: async (id: string) => {
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({ status: QuoteStatus.ACEITE })
      .eq('id', id)
      .select('code, client_id')
      .single();

    if (error) throw error;

    try {
      const { data: linkedOS } = await supabase
        .from('service_orders')
        .select('id')
        .eq('client_id', quote.client_id)
        .or(`status.eq.${OSStatus.PARA_ORCAMENTO},status.eq.${OSStatus.ORCAMENTO_ENVIADO}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (linkedOS) {
        const session = mockData.getSession();
        await supabase.from('os_activities').insert([{
          os_id: linkedOS.id,
          description: `ORÇAMENTO ${quote.code} VALIDADO PELO BACKOFFICE (SISTEMA COTAÇÕES)`,
          user_name: session?.full_name || 'Sistema'
        }]);
      }
    } catch (e) {}

    return true;
  },

  deleteQuote: async (id: string) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Clients
  getClients: async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) throw error;
    return data || [];
  },
  getClientById: async (id: string) => {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  createClient: async (client: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').insert([client]).select().single();
    if (error) throw error;
    if (data) {
      await supabase.from('establishments').insert([{ 
        client_id: data.id, 
        name: 'SEDE', 
        address: data.address, 
        phone: data.phone, 
        contact_person: data.name 
      }]);
    }
    return data;
  },
  updateClient: async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(updates).eq('id', id);
    if (error) throw error;
    return true;
  },
  deleteClient: async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  // Establishments
  getAllEstablishments: async () => {
    const { data, error } = await supabase.from('establishments').select('*, client:clients(name)');
    if (error) throw error;
    return (data || []).map(e => ({ ...e, client_name: (e.client as any)?.name }));
  },
  getEstablishmentsByClient: async (clientId: string) => {
    const { data, error } = await supabase.from('establishments').select('*').eq('client_id', clientId);
    if (error) throw error;
    return data || [];
  },
  createEstablishment: async (est: Partial<Establishment>) => {
    const { data, error } = await supabase.from('establishments').insert([est]).select().single();
    if (error) throw error;
    return data;
  },
  updateEstablishment: async (id: string, updates: Partial<Establishment>) => {
    const { error } = await supabase.from('establishments').update(updates).eq('id', id);
    if (error) throw error;
    return true;
  },

  // Equipments
  getEquipments: async () => {
    const { data, error } = await supabase.from('equipments').select('*');
    if (error) throw error;
    return data || [];
  },
  getEquipmentById: async (id: string) => {
    const { data, error } = await supabase.from('equipments').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  createEquipment: async (eq: Partial<Equipment>) => {
    const { data, error } = await supabase.from('equipments').insert([cleanPayload(eq)]).select().single();
    if (error) throw error;
    return data;
  },
  updateEquipment: async (id: string, updates: Partial<Equipment>) => {
    const { error } = await supabase.from('equipments').update(cleanPayload(updates)).eq('id', id);
    if (error) throw error;
  },
  deleteEquipment: async (id: string) => {
    const { error } = await supabase.from('equipments').delete().eq('id', id);
    if (error) throw error;
  },

  // Service Orders
  getServiceOrders: async () => {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getServiceOrderById: async (id: string) => {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  createServiceOrder: async (os: Partial<ServiceOrder>) => {
    const code = generateSmartCode('', os.store || 'Todas');
    const { data, error } = await supabase.from('service_orders').insert([{ ...os, code }]).select().single();
    if (error) throw error;
    return data;
  },
  updateServiceOrder: async (id: string, updates: Partial<ServiceOrder>) => {
    const { data, error } = await supabase.from('service_orders').update(cleanPayload(updates)).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Catalog
  getCatalog: async () => {
    const { data, error } = await supabase.from('catalog').select('*').order('name');
    if (error) throw error;
    return data || [];
  },
  addCatalogItem: async (item: Partial<PartCatalogItem>) => {
    const { data, error } = await supabase.from('catalog').insert([item]).select().single();
    if (error) throw error;
    return data;
  },
  updateCatalogItem: async (id: string, updates: Partial<PartCatalogItem>) => {
    const { error } = await supabase.from('catalog').update(updates).eq('id', id);
    if (error) throw error;
  },

  // Utils
  getAllActivities: async () => {
    const { data, error } = await supabase
      .from('os_activities')
      .select('*, service_orders(code, clients:clients(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(act => ({
      ...act,
      os_code: (act.service_orders as any)?.code,
      client_name: (act.service_orders as any)?.clients?.name
    }));
  },
  getOSActivity: async (osId: string) => {
    const { data, error } = await supabase.from('os_activities').select('*').eq('os_id', osId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addOSActivity: async (osId: string, act: Partial<OSActivity>) => {
    const session = mockData.getSession();
    const { error } = await supabase.from('os_activities').insert([{ ...act, os_id: osId, user_name: session?.full_name }]);
    if (error) throw error;
  },

  // Parts Used (OS)
  getOSParts: async (osId: string) => {
    const { data, error } = await supabase.from('parts_used').select('*').eq('os_id', osId);
    if (error) throw error;
    return data || [];
  },
  addOSPart: async (osId: string, part: Partial<PartUsed>) => {
    const { data, error } = await supabase.from('parts_used').insert([{ ...part, os_id: osId }]).select().single();
    if (error) throw error;
    return data;
  },
  updateOSPart: async (id: string, updates: Partial<PartUsed>) => {
    const { data, error } = await supabase.from('parts_used').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  removeOSPart: async (id: string) => {
    const { error } = await supabase.from('parts_used').delete().eq('id', id);
    if (error) throw error;
  },

  // OS Photos
  getOSPhotos: async (osId: string) => {
    const { data, error } = await supabase.from('os_photos').select('*').eq('os_id', osId);
    if (error) throw error;
    return data || [];
  },
  addOSPhoto: async (osId: string, photo: Partial<OSPhoto>) => {
    const { data, error } = await supabase.from('os_photos').insert([{ ...photo, os_id: osId }]).select().single();
    if (error) throw error;
    return data;
  },
  deleteOSPhoto: async (id: string) => {
    const { error } = await supabase.from('os_photos').delete().eq('id', id);
    if (error) throw error;
  },

  // OS Notes
  getOSNotes: async (osId: string) => {
    const { data, error } = await supabase.from('os_notes').select('*').eq('os_id', osId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addOSNote: async (osId: string, note: Partial<OSNote>) => {
    const session = mockData.getSession();
    const { data, error } = await supabase.from('os_notes').insert([{ ...note, os_id: osId, user_id: session?.id, user_name: session?.full_name }]).select().single();
    if (error) throw error;
    return data;
  },

  // Vacations
  getVacations: async () => {
    const { data, error } = await supabase.from('vacations').select('*').order('start_date');
    if (error) throw error;
    return data || [];
  },
  createVacation: async (v: Partial<Vacation>) => {
    const { data, error } = await supabase.from('vacations').insert([v]).select().single();
    if (error) throw error;
    return data;
  },
  updateVacation: async (id: string, updates: Partial<Vacation>) => {
    const { error } = await supabase.from('vacations').update(updates).eq('id', id);
    if (error) throw error;
  },
  deleteVacation: async (id: string) => {
    const { error } = await supabase.from('vacations').delete().eq('id', id);
    if (error) throw error;
  },
  importVacations: async (vacations: any[]) => {
    const { error } = await supabase.from('vacations').insert(vacations);
    if (error) throw error;
  },

  // Profiles
  getProfiles: async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) throw error;
    return data || [];
  },
  updateProfile: async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
  },
  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  },

  // Time Entries
  createTimeEntry: async (entry: Partial<TimeEntry>) => {
    const { data, error } = await supabase.from('time_entries').insert([entry]).select().single();
    if (error) throw error;
    return data;
  },
  getAllTimeEntries: async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*, service_orders(code, clients:clients(name))')
      .order('start_time', { ascending: false });
    if (error) throw error;
    return (data || []).map(entry => ({
      ...entry,
      os_code: (entry.service_orders as any)?.code,
      client_name: (entry.service_orders as any)?.clients?.name
    }));
  },

  // Maintenance
  exportFullSystemData: async () => {
    const tables = ['clients', 'establishments', 'equipments', 'service_orders', 'parts_used', 'os_photos', 'os_notes', 'os_activities', 'catalog', 'vacations', 'profiles', 'time_entries', 'quotes', 'quote_items'];
    const backup: any = { date: new Date().toISOString(), data: {} };
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup.data[table] = data || [];
    }
    return backup;
  },
  importFullSystemData: async (backup: any, progressCallback?: (msg: string) => void) => {
    const tables = ['clients', 'establishments', 'equipments', 'service_orders', 'parts_used', 'os_photos', 'os_notes', 'os_activities', 'catalog', 'vacations', 'profiles', 'time_entries', 'quotes', 'quote_items'];
    for (const table of tables) {
      progressCallback?.(`A apagar tabela ${table}...`);
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (backup.data[table] && backup.data[table].length > 0) {
        progressCallback?.(`A restaurar ${backup.data[table].length} registos em ${table}...`);
        await supabase.from(table).insert(backup.data[table]);
      }
    }
  },
  repairMissingSedes: async (progressCallback?: (msg: string) => void) => {
    const { data: clients } = await supabase.from('clients').select('*');
    if (!clients) return 0;
    let repairedCount = 0;
    for (const client of clients) {
      const { data: ests } = await supabase.from('establishments').select('id').eq('client_id', client.id);
      if (!ests || ests.length === 0) {
        progressCallback?.(`A criar sede para ${client.name}...`);
        await supabase.from('establishments').insert([{ 
          client_id: client.id, 
          name: 'SEDE', 
          address: client.address, 
          phone: client.phone, 
          contact_person: client.name 
        }]);
        repairedCount++;
      }
    }
    return repairedCount;
  }
};
