
import { supabase } from '../supabaseClient';
import { 
  Client, Establishment, Equipment, ServiceOrder, OSStatus, OSType, 
  UserRole, PartUsed, OSPhoto, PartCatalogItem, 
  OSActivity, Vacation, OSNote, Profile, TimeEntry, Quote, QuoteItem, QuoteStatus
} from '../types';

const SESSION_KEY = 'rf_active_session_v3';

/**
 * Limpa o payload removendo propriedades computadas ou objetos aninhados
 * que não existem como colunas reais na tabela do Supabase.
 * Também converte strings vazias em null para evitar erros de UUID no Postgres.
 */
const cleanPayload = (data: any) => {
  const cleaned = { ...data };
  // Remover objetos que são retornos de JOINs mas não colunas de escrita
  delete cleaned.client;
  delete cleaned.establishment;
  delete cleaned.equipment;
  delete cleaned.items;
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.code; // Não permitir editar o código único gerado

  // Converter strings vazias em null para campos opcionais (especialmente UUIDs)
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '') {
      cleaned[key] = null;
    }
  });

  return cleaned;
};

export const mockData = {
  // Auth & Session
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
    await supabase.auth.signOut();
  },

  // Quotes (Gestão Independente)
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
    const now = new Date();
    const code = `ORC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 1. Inserir Cabeçalho do Orçamento
    const payload = cleanPayload(quoteData);
    
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .insert([{ 
        ...payload, 
        code, 
        status: QuoteStatus.PENDENTE,
        total_amount: quoteData.total_amount || 0,
        // Garantir que a descrição é pelo menos uma string vazia se vier null após o cleanPayload
        description: payload.description || ''
      }])
      .select()
      .single();
    
    if (qError) {
      console.error("Erro ao criar cabeçalho do orçamento:", qError);
      throw new Error(`Erro base de dados: ${qError.message}`);
    }

    // 2. Inserir Linhas/Itens do Orçamento
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
      if (iError) {
        console.error("Erro ao inserir itens do orçamento:", iError);
        throw new Error(`Erro ao gravar itens: ${iError.message}`);
      }
    }
    return quote;
  },

  updateQuote: async (id: string, quoteData: Partial<Quote>, items: Partial<QuoteItem>[]) => {
    // 1. Atualizar Cabeçalho
    const payload = cleanPayload(quoteData);
    const { error: qError } = await supabase
      .from('quotes')
      .update({
        ...payload,
        description: payload.description || ''
      })
      .eq('id', id);
    
    if (qError) throw qError;

    // 2. Remover itens antigos para reinserção (estratégia mais limpa para edição de lista)
    const { error: dError } = await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id);
    
    if (dError) throw dError;

    // 3. Inserir novos itens
    if (items && items.length > 0) {
      const itemsPayload = items.map(item => ({
        quote_id: id,
        name: item.name?.toUpperCase(),
        reference: item.reference?.toUpperCase() || '---',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        is_labor: !!item.is_labor
      }));
      
      const { error: iError } = await supabase.from('quote_items').insert(itemsPayload);
      if (iError) throw iError;
    }
    return true;
  },

  updateQuoteStatus: async (id: string, status: QuoteStatus) => {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
    if (error) throw error;
    return true;
  },

  clientSignQuote: async (id: string, signature: string) => {
    const { error } = await supabase.from('quotes').update({ 
      status: QuoteStatus.ACEITE, 
      client_signature: signature 
    }).eq('id', id);
    if (error) throw error;
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
    const { data, error } = await supabase.from('equipments').insert([eq]).select().single();
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
      .select('*, client:clients(*), equipment:equipments(*)')
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
    const now = new Date();
    const code = `OS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  // Utils & Activities
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
