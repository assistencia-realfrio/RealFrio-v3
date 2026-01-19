import { supabase } from '../supabaseClient';
import { 
  Client, Establishment, Equipment, ServiceOrder, OSStatus, OSType, 
  UserRole, PartUsed, OSPhoto, PartCatalogItem, 
  OSActivity, Vacation, VacationStatus, OSNote, Profile, TimeEntry
} from '../types';

const SESSION_KEY = 'rf_active_session_v3';

export const mockData = {
  // --- AUTH ---
  signIn: async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === 'admin@realfrio.pt' && password === 'admin123') {
      const demoUser = { id: 'demo-id', email: normalizedEmail, full_name: 'Administrador Demo', role: UserRole.ADMIN, store: 'Todas' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser));
      return { user: demoUser, error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error };
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      const fullUser = { ...data.user, ...profile };
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullUser));
      return { user: fullUser, error: null };
    }
    return { user: null, error: { message: "Login inválido" } };
  },

  getSession: () => {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },

  signOut: async () => {
    localStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  },

  signUp: async (email: string, password: string, fullName: string, role: UserRole, store: string) => {
    // 1. Criar o utilizador na autenticação do Supabase
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          store: store
        }
      }
    });

    if (error) return { data: null, error };

    if (data.user) {
      // 2. Tentar inserir no perfil. Usamos upsert para evitar erros se o trigger de DB já tiver criado o perfil.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role,
        store: store
      });
      
      if (profileError) {
        // Se o erro for sobre a coluna 'store', damos uma dica clara
        if (profileError.message.includes('column "store" of relation "profiles" does not exist')) {
          return { 
            data, 
            error: { 
              message: "Erro de Base de Dados: A coluna 'store' não existe na tabela 'profiles'. Por favor, execute o script SQL de atualização no painel do Supabase." 
            } 
          };
        }
        return { data, error: profileError };
      }
    }
    return { data, error: null };
  },

  // --- PROFILES ---
  getProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    return data || [];
  },

  updateProfile: async (id: string, updates: Partial<Profile>) => {
    const session = mockData.getSession();
    if (session && session.id === id) {
      const newSession = { ...session, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    }
    return supabase.from('profiles').update(updates).eq('id', id);
  },

  // --- CLIENTS ---
  getClients: async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    return data || [];
  },

  getClientById: async (id: string) => {
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    return data;
  },

  createClient: async (client: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    if (data) {
      await supabase.from('establishments').insert({
        client_id: data.id,
        name: 'SEDE / PRINCIPAL',
        address: data.address,
        phone: data.phone,
        contact_person: 'GERAL'
      });
    }
    return data;
  },

  updateClient: async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(updates).eq('id', id);
    if (error) throw error;
  },

  deleteClient: async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ESTABLISHMENTS ---
  getAllEstablishments: async () => {
    const { data } = await supabase.from('establishments').select('*, client_name:clients(name)');
    return (data || []).map((e: any) => ({ ...e, client_name: e.client_name?.name }));
  },

  getEstablishmentsByClient: async (clientId: string) => {
    const { data } = await supabase.from('establishments').select('*').eq('client_id', clientId).order('name');
    return data || [];
  },

  createEstablishment: async (est: Partial<Establishment>) => {
    const { data, error } = await supabase.from('establishments').insert(est).select().single();
    if (error) throw error;
    return data;
  },

  updateEstablishment: async (id: string, updates: Partial<Establishment>) => {
    const { error } = await supabase.from('establishments').update(updates).eq('id', id);
    if (error) throw error;
  },

  // --- EQUIPMENTS ---
  getEquipments: async () => {
    const { data } = await supabase.from('equipments').select('*').order('type');
    return data || [];
  },

  getEquipmentById: async (id: string) => {
    const { data } = await supabase.from('equipments').select('*').eq('id', id).single();
    return data;
  },

  createEquipment: async (eq: Partial<Equipment>) => {
    const { data, error } = await supabase.from('equipments').insert(eq).select().single();
    if (error) throw error;
    return data;
  },

  updateEquipment: async (id: string, updates: Partial<Equipment>) => {
    const { error } = await supabase.from('equipments').update(updates).eq('id', id);
    if (error) throw error;
  },

  deleteEquipment: async (id: string) => {
    const { error } = await supabase.from('equipments').delete().eq('id', id);
    if (error) throw error;
  },

  // --- SERVICE ORDERS ---
  getServiceOrders: async () => {
    const { data } = await supabase
      .from('service_orders')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .order('created_at', { ascending: false });
    return data || [];
  },

  getServiceOrderById: async (id: string) => {
    const { data } = await supabase
      .from('service_orders')
      .select('*, client:clients(*), establishment:establishments(*), equipment:equipments(*)')
      .eq('id', id)
      .single();
    return data;
  },

  createServiceOrder: async (os: Partial<ServiceOrder>) => {
    const countResponse = await supabase.from('service_orders').select('id', { count: 'exact', head: true });
    const nextNum = (countResponse.count || 0) + 1;
    const code = `OS-${nextNum.toString().padStart(5, '0')}`;
    const { data, error } = await supabase.from('service_orders').insert({ ...os, code }).select().single();
    if (error) throw error;
    return data;
  },

  updateServiceOrder: async (id: string, updates: Partial<ServiceOrder>) => {
    const { error } = await supabase.from('service_orders').update(updates).eq('id', id);
    if (error) throw error;
  },

  // --- OS PARTS ---
  getOSParts: async (osId: string) => {
    const { data } = await supabase.from('os_parts').select('*').eq('os_id', osId);
    return data || [];
  },

  addOSPart: async (osId: string, part: Partial<PartUsed>) => {
    return supabase.from('os_parts').insert({ ...part, os_id: osId });
  },

  updateOSPart: async (id: string, updates: Partial<PartUsed>) => {
    return supabase.from('os_parts').update(updates).eq('id', id);
  },

  removeOSPart: async (id: string) => {
    return supabase.from('os_parts').delete().eq('id', id);
  },

  // --- OS PHOTOS ---
  getOSPhotos: async (osId: string) => {
    const { data } = await supabase.from('os_photos').select('*').eq('os_id', osId).order('created_at', { ascending: false });
    return data || [];
  },

  addOSPhoto: async (osId: string, photo: Partial<OSPhoto>) => {
    return supabase.from('os_photos').insert({ ...photo, os_id: osId, created_at: new Date().toISOString() });
  },

  deleteOSPhoto: async (id: string) => {
    return supabase.from('os_photos').delete().eq('id', id);
  },

  // --- OS NOTES ---
  getOSNotes: async (osId: string) => {
    const { data } = await supabase.from('os_notes').select('*').eq('os_id', osId).order('created_at', { ascending: true });
    return data || [];
  },

  addOSNote: async (osId: string, note: Partial<OSNote>) => {
    const session = mockData.getSession();
    return supabase.from('os_notes').insert({
      os_id: osId,
      user_id: session?.id || 'anonymous',
      user_name: session?.full_name || 'TÉCNICO',
      content: note.content,
      created_at: new Date().toISOString()
    });
  },

  // --- OS ACTIVITY ---
  getOSActivity: async (osId: string) => {
    const { data } = await supabase.from('os_activities').select('*').eq('os_id', osId).order('created_at', { ascending: false });
    return data || [];
  },

  addOSActivity: async (osId: string, activity: Partial<OSActivity>) => {
    const session = mockData.getSession();
    return supabase.from('os_activities').insert({
      os_id: osId,
      user_id: activity.user_id === 'current' ? (session?.id || 'anonymous') : (activity.user_id || session?.id || 'anonymous'),
      user_name: activity.user_name || session?.full_name || 'SISTEMA',
      description: activity.description,
      created_at: new Date().toISOString()
    });
  },

  getAllActivities: async () => {
    const { data } = await supabase
      .from('os_activities')
      .select('*, service_orders(code)')
      .order('created_at', { ascending: false })
      .limit(50);
    return (data || []).map((a: any) => ({ ...a, os_code: a.service_orders?.code }));
  },

  // --- CATALOG ---
  getCatalog: async () => {
    const { data } = await supabase.from('catalog').select('*').order('name');
    return data || [];
  },

  addCatalogItem: async (item: Partial<PartCatalogItem>) => {
    const { data, error } = await supabase.from('catalog').insert(item).select().single();
    if (error) throw error;
    return data;
  },

  updateCatalogItem: async (id: string, updates: Partial<PartCatalogItem>) => {
    return supabase.from('catalog').update(updates).eq('id', id);
  },

  deleteCatalogItem: async (id: string) => {
    return supabase.from('catalog').delete().eq('id', id);
  },

  // --- VACATIONS ---
  getVacations: async () => {
    const { data } = await supabase.from('vacations').select('*').order('start_date', { ascending: true });
    return data || [];
  },

  createVacation: async (v: Partial<Vacation>) => {
    return supabase.from('vacations').insert(v);
  },

  updateVacation: async (id: string, updates: Partial<Vacation>) => {
    return supabase.from('vacations').update(updates).eq('id', id);
  },

  deleteVacation: async (id: string) => {
    return supabase.from('vacations').delete().eq('id', id);
  },

  exportUserVacationsCSV: async (userName: string) => {
    const { data } = await supabase.from('vacations').select('*').eq('user_name', userName);
    if (!data || data.length === 0) return "DATA_INICIO,DATA_FIM,NOTAS,LOJA\n";
    const rows = data.map(v => `${v.start_date},${v.end_date},"${v.notes || ''}",${v.store}`);
    return "DATA_INICIO,DATA_FIM,NOTAS,LOJA\n" + rows.join("\n");
  },

  importUserVacationsCSV: async (userId: string, userName: string, csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('DATA_INICIO'));
    let imported = 0;
    let skipped = 0;
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 4) continue;
      const [start_date, end_date, notes, store] = parts.map(s => s.trim().replace(/"/g, ''));
      const { error } = await supabase.from('vacations').insert({
        user_id: userId,
        user_name: userName,
        start_date,
        end_date,
        notes,
        store,
        status: VacationStatus.APROVADA
      });
      if (!error) imported++;
      else skipped++;
    }
    return { imported, skipped };
  },

  // --- TIME ENTRIES ---
  getAllTimeEntries: async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('*, service_orders(code), clients(name)')
      .order('start_time', { ascending: false });
    return (data || []).map((e: any) => ({
      ...e,
      os_code: e.service_orders?.code || '---',
      client_name: e.clients?.name || '---'
    }));
  },

  // --- SYSTEM ---
  exportFullSystemData: async () => {
    const tables = ['clients', 'establishments', 'equipments', 'service_orders', 'catalog', 'profiles', 'vacations', 'os_parts', 'os_photos', 'os_notes', 'os_activities', 'time_entries'];
    const results = await Promise.all(tables.map(t => supabase.from(t).select('*')));
    const data: any = {};
    tables.forEach((t, i) => { data[t] = results[i].data || []; });
    return { version: "3.0", data };
  },

  importFullSystemData: async (backup: any, onProgress?: (msg: string) => void) => {
    const tables = ['time_entries', 'os_activities', 'os_notes', 'os_photos', 'os_parts', 'service_orders', 'equipments', 'establishments', 'clients', 'catalog', 'vacations'];
    for (const t of tables) {
      if (onProgress) onProgress(`Limpando ${t}...`);
      await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const order = ['catalog', 'clients', 'establishments', 'equipments', 'service_orders', 'os_parts', 'os_photos', 'os_notes', 'os_activities', 'vacations', 'time_entries'];
    for (const t of order) {
      if (backup.data[t] && backup.data[t].length > 0) {
        if (onProgress) onProgress(`Restaurando ${t}...`);
        await supabase.from(t).insert(backup.data[t]);
      }
    }
    return { success: true };
  }
};