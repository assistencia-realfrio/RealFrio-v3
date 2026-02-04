


export enum UserRole {
  ADMIN = 'admin',
  BACKOFFICE = 'backoffice',
  TECNICO = 'tecnico'
}

export enum OSStatus {
  POR_INICIAR = 'por_iniciar',
  INICIADA = 'iniciada',
  PARA_ORCAMENTO = 'para_orcamento',
  ORCAMENTO_ENVIADO = 'orcamento_enviado',
  AGUARDA_PECAS = 'aguarda_pecas',
  PECAS_RECEBIDAS = 'pecas_recebidas',
  CONCLUIDA = 'concluida',
  CANCELADA = 'cancelada'
}

export enum OSType {
  INSTALACAO = 'instalacao',
  MANUTENCAO = 'manutencao',
  AVARIA = 'avaria',
  REVISAO = 'revisao'
}

export enum VacationStatus {
  PENDENTE = 'pendente',
  APROVADA = 'aprovada',
  CONCLUIDA = 'concluida',
  REJEITADA = 'rejeitada'
}

export interface Vacation {
  id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  status: VacationStatus;
  store: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  type: string;
  address: string; 
  phone: string;
  email: string;
  billing_name: string; 
  notes?: string;
  store: string;
  google_drive_link?: string;
}

export interface Establishment {
  id: string;
  client_id: string;
  name: string;
  address: string;
  phone: string;
  contact_person: string;
  notes?: string;
}

export interface EquipmentAttachment {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  client_id: string;
  establishment_id: string;
  type: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  install_date?: string | null;
  nameplate_url?: string | null;
  attachments?: EquipmentAttachment[];
}

export interface PartCatalogItem {
  id: string;
  name: string;
  reference: string;
  stock: number;
}

export interface PartUsed {
  id: string;
  part_id: string;
  name: string;
  reference: string;
  quantity: number;
  // Fix: Added technician_name, work_date and created_at to support tracking and fix errors in mockData.ts
  technician_name?: string;
  work_date?: string;
  created_at?: string;
}

export interface OSPhoto {
  id: string;
  os_id: string;
  url: string;
  type: 'antes' | 'depois' | 'peca' | 'geral';
  created_at: string;
}

export interface OSNote {
  id: string;
  os_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface OSActivity {
  id: string;
  os_id: string;
  user_id: string;
  user_name: string;
  description: string;
  created_at: string;
}

export interface ServiceOrder {
  id: string;
  code: string;
  client_id: string;
  establishment_id?: string;
  equipment_id?: string;
  technician_id?: string;
  type: OSType;
  status: OSStatus;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at: string;
  scheduled_date?: string;
  anomaly_detected?: string;
  resolution_notes?: string;
  observations?: string;
  client_signature?: string | null;
  technician_signature?: string | null; 
  client?: Client;
  establishment?: Establishment;
  equipment?: Equipment;
  store: string;
  is_warranty?: boolean;
  warranty_info?: {
    rma_code?: string;
    has_brand?: boolean;
    has_model?: boolean;
    has_serial?: boolean;
    has_photo_nameplate?: boolean;
    has_photo_parts?: boolean;
    has_failure_reason?: boolean;
  };
  // Fix: added timer fields to support the global shared timer functionality used in ServiceOrderDetail.tsx
  timer_is_active?: boolean;
  timer_start_time?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  store: string; 
}

export interface TimeEntry {
  id: string;
  os_id: string;
  client_id?: string;
  start_time: string;
  duration_minutes: number;
  description?: string;
}