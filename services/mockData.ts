
import { supabase } from '../supabaseClient';
import { 
  Client, Establishment, Equipment, ServiceOrder, OSStatus, OSType, 
  UserRole, PartUsed, OSPhoto, PartCatalogItem, 
  OSActivity, Vacation, VacationStatus, OSNote, Profile, TimeEntry
} from '../types';

const SESSION_KEY = 'rf_active_session_v3';

/* Helper to remove nested objects before sending to Supabase */
const cleanPayload = (data: any) => {
  const cleaned = { ...data };
  delete cleaned.client;
  delete cleaned.establishment;
  delete cleaned.equipment;
  return cleaned;
};

export const mockData = {
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
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName, role, store } }
    });
    return { data, error };
  },

  getProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    return data || [];
  },

  updateProfile: async (id: string, updates: Partial<Profile>) => {
    const session = mockData.getSession();
    if (session && session.id === id) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, ...updates }));
    }
    return supabase.from('profiles').update(updates).eq('id', id);
  },

  updatePassword: async (newPassword: string) => {
    return supabase.auth.updateUser({ password: newPassword });
  },

  // Service Orders
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
    const code = `OS-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from('service_orders')
      .insert([{ ...cleanPayload(os), code }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateServiceOrder: async (id: string, updates: Partial<ServiceOrder>) => {
    return supabase.from('service_orders').update(cleanPayload(updates)).eq('id', id);
  },

  // Clients
  getClients: async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    return data || [];
  },

  getClientById: async (id: string) => {
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    return data;
  },

  createClient: async (client: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').insert([client]).select().single();
    if (error) throw error;
    if (data) {
      await supabase.from('establishments').insert([{
        client_id: data.id,
        name: 'SEDE / PRINCIPAL',
        address: data.address,
        phone: data.phone,
        contact_person: data.name
      }]);
    }
    return data;
  },

  updateClient: async (id: string, updates: Partial<Client>) => {
    return supabase.from('clients').update(updates).eq('id', id);
  },

  deleteClient: async (id: string) => {
    return supabase.from('clients').delete().eq('id', id);
  },

  // Establishments
  getAllEstablishments: async () => {
    const { data } = await supabase
      .from('establishments')
      .select('*, client:clients(name)');
    return (data || []).map(e => ({ ...e, client_name: (e.client as any)?.name }));
  },

  getEstablishmentsByClient: async (clientId: string) => {
    const { data } = await supabase.from('establishments').select('*').eq('client_id', clientId);
    return data || [];
  },

  createEstablishment: async (est: Partial<Establishment>) => {
    const { data, error } = await supabase.from('establishments').insert([est]).select().single();
    if (error) throw error;
    return data;
  },

  updateEstablishment: async (id: string, updates: Partial<Establishment>) => {
    return supabase.from('establishments').update(updates).eq('id', id);
  },

  // Equipments
  getEquipments: async () => {
    const { data } = await supabase.from('equipments').select('*');
    return data || [];
  },

  getEquipmentById: async (id: string) => {
    const { data } = await supabase.from('equipments').select('*').eq('id', id).single();
    return data;
  },

  createEquipment: async (eq: Partial<Equipment>) => {
    const { data, error } = await supabase.from('equipments').insert([eq]).select().single();
    if (error) throw error;
    return data;
  },

  updateEquipment: async (id: string, updates: Partial<Equipment>) => {
    return supabase.from('equipments').update(updates).eq('id', id);
  },

  deleteEquipment: async (id: string) => {
    return supabase.from('equipments').delete().eq('id', id);
  },

  // Material Usado (Parts Used)
  getOSParts: async (osId: string) => {
    const { data } = await supabase.from('parts_used').select('*').eq('os_id', osId);
    return data || [];
  },

  addOSPart: async (osId: string, part: Partial<PartUsed>) => {
    const payload = {
      os_id: osId,
      part_id: part.part_id,
      name: part.name,
      reference: part.reference,
      quantity: part.quantity
    };
    const { data, error } = await supabase.from('parts_used').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  updateOSPart: async (id: string, updates: Partial<PartUsed>) => {
    return supabase.from('parts_used').update(updates).eq('id', id);
  },

  removeOSPart: async (id: string) => {
    return supabase.from('parts_used').delete().eq('id', id);
  },

  // Catálogo (Tabela 'catalog')
  getCatalog: async () => {
    const { data } = await supabase.from('catalog').select('*').order('name');
    return data || [];
  },

  addCatalogItem: async (item: Partial<PartCatalogItem>) => {
    const { data, error } = await supabase.from('catalog').insert([item]).select().single();
    if (error) throw error;
    return data;
  },

  updateCatalogItem: async (id: string, updates: Partial<PartCatalogItem>) => {
    return supabase.from('catalog').update(updates).eq('id', id);
  },

  // Photos
  getOSPhotos: async (osId: string) => {
    const { data } = await supabase.from('os_photos').select('*').eq('os_id', osId).order('created_at');
    return data || [];
  },

  addOSPhoto: async (osId: string, photo: Partial<OSPhoto>) => {
    const { data, error } = await supabase.from('os_photos').insert([{ ...photo, os_id: osId }]).select().single();
    if (error) throw error;
    return data;
  },

  deleteOSPhoto: async (id: string) => {
    return supabase.from('os_photos').delete().eq('id', id);
  },

  // Notes
  getOSNotes: async (osId: string) => {
    const session = mockData.getSession();
    const { data } = await supabase
      .from('os_notes')
      .select('*')
      .eq('os_id', osId)
      .order('created_at', { ascending: true });
    return (data || []).map(n => ({
      ...n,
      user_id: n.user_id === session?.id ? 'current' : n.user_id
    }));
  },

  addOSNote: async (osId: string, note: Partial<OSNote>) => {
    const session = mockData.getSession();
    const { data, error } = await supabase
      .from('os_notes')
      .insert([{ 
        ...note, 
        os_id: osId, 
        user_id: session?.id, 
        user_name: session?.full_name 
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Activity
  getOSActivity: async (osId: string) => {
    const { data } = await supabase.from('os_activities').select('*').eq('os_id', osId).order('created_at', { ascending: false });
    return data || [];
  },

  getAllActivities: async () => {
    const { data } = await supabase
      .from('os_activities')
      .select('*, service_orders(code)')
      .order('created_at', { ascending: false });
    return (data || []).map(a => ({ ...a, os_code: (a.service_orders as any)?.code }));
  },

  addOSActivity: async (osId: string, act: Partial<OSActivity>) => {
    const session = mockData.getSession();
    return supabase.from('os_activities').insert([{
      ...act,
      os_id: osId,
      user_id: session?.id,
      user_name: session?.full_name
    }]);
  },

  // Vacations
  getVacations: async () => {
    const { data } = await supabase.from('vacations').select('*').order('start_date');
    return data || [];
  },

  createVacation: async (v: Partial<Vacation>) => {
    const { data, error } = await supabase.from('vacations').insert([v]).select().single();
    if (error) throw error;
    return data;
  },

  updateVacation: async (id: string, updates: Partial<Vacation>) => {
    return supabase.from('vacations').update(updates).eq('id', id);
  },

  importVacations: async (data: any[]) => {
    return supabase.from('vacations').insert(data);
  },

  // Time Entries
  getAllTimeEntries: async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('*, service_orders(code, clients(name))')
      .order('start_time', { ascending: false });
    
    return (data || []).map(e => ({
      ...e,
      os_code: (e.service_orders as any)?.code,
      client_name: (e.service_orders as any)?.clients?.name
    }));
  },

  // Maintenance
  exportFullSystemData: async () => {
    const tables = ['profiles', 'clients', 'establishments', 'equipments', 'catalog', 'service_orders', 'parts_used', 'os_photos', 'os_notes', 'os_activities', 'vacations', 'time_entries'];
    const backup: any = { timestamp: new Date().toISOString(), data: {} };
    
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup.data[table] = data || [];
    }
    return backup;
  },

  importFullSystemData: async (backup: any, onProgress: (msg: string) => void) => {
    const tables = ['time_entries', 'vacations', 'os_activities', 'os_notes', 'os_photos', 'parts_used', 'service_orders', 'equipments', 'establishments', 'clients', 'catalog', 'profiles'];
    
    for (const table of tables) {
      onProgress(`A limpar tabela ${table}...`);
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    }

    const insertOrder = [...tables].reverse();
    for (const table of insertOrder) {
      const rows = backup.data[table];
      if (rows && rows.length > 0) {
        onProgress(`A restaurar ${rows.length} registos em ${table}...`);
        await supabase.from(table).insert(rows);
      }
    }
  }
};
