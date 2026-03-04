
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
  AGUARDA_PECAS = 'aguarda_cas',
  PECAS_RECEBIDAS = 'pecas_recebidas',
  CONCLUIDA = 'concluida',
  CANCELADA = 'cancelada'
}

export enum QuoteStatus {
  PENDENTE = 'pendente',
  AGUARDA_VALIDACAO = 'aguarda_validacao',
  ACEITE = 'aceite',
  REJEITADO = 'rejeitado'
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
  REJEITADA = 'rejeitada'
}

export interface Vehicle {
  id: string;
  license_plate: string;
  brand: string;
  model: string;
  year: number;
  current_mileage: number;
  next_revision_mileage?: number;
  next_inspection_date?: string;
  insurance_expiry_date?: string;
  status: 'active' | 'maintenance' | 'inactive';
  assigned_to?: string;
  image_url?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  type: 'revision' | 'inspection' | 'repair' | 'tires' | 'other';
  date: string;
  mileage: number;
  description: string;
  cost: number;
  provider: string;
  next_scheduled_date?: string;
  status: 'scheduled' | 'completed' | 'canceled';
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
  nif?: string;
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
  pnc?: string | null;
  serial_number?: string | null;
  nameplate_url?: string | null;
  install_date?: string | null;
  zone?: string | null;
  attachments?: EquipmentAttachment[];
}

export interface PartCatalogItem {
  id: string;
  name: string;
  reference: string;
  stock: number;
  last_price?: number;
}

export interface PartUsed {
  id: string;
  os_id: string;
  part_id?: string;
  name: string;
  reference: string;
  quantity: number;
  unit_price?: number;
  work_date?: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  name: string;
  reference: string;
  quantity: number;
  unit_price: number;
  is_labor: boolean;
}

export interface Quote {
  id: string;
  code: string;
  client_id: string;
  establishment_id?: string;
  equipment_id?: string;
  description: string;
  detected_problem?: string;
  cause?: string;
  status: QuoteStatus;
  total_amount: number;
  created_at: string;
  store: string;
  client_signature?: string | null;
  client?: Client;
  establishment?: Establishment;
  equipment?: Equipment;
  items?: QuoteItem[];
}

export interface OSPhoto {
  id: string;
  os_id: string;
  url: string;
  type: string;
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

export interface ServiceOrder {
  id: string;
  code: string;
  client_id: string;
  establishment_id?: string;
  equipment_id?: string;
  type: OSType;
  status: OSStatus;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at: string;
  scheduled_date?: string;
  anomaly_detected?: string;
  resolution_notes?: string;
  observations?: string;
  is_warranty?: boolean;
  call_before_going?: boolean;
  contact_name?: string;
  contact_phone?: string;
  warranty_info?: {
    has_brand?: boolean;
    has_model?: boolean;
    has_serial?: boolean;
    has_photo_nameplate?: boolean;
    has_photo_parts?: boolean;
    has_failure_reason?: boolean;
  };
  client_signature?: string | null;
  technician_signature?: string | null; 
  client?: Client;
  establishment?: Establishment;
  equipment?: Equipment;
  store: string;
  timer_is_active?: boolean;
  timer_start_time?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  store: string;
  push_subscription?: any;
}

export interface OSActivity {
  id: string;
  os_id: string;
  user_name: string;
  description: string;
  created_at: string;
  os_code?: string;
  client_name?: string;
  equipment_type?: string;
}

export interface Vacation {
  id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  store: string;
  status: VacationStatus;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  os_id: string;
  start_time: string;
  duration_minutes: number;
  description?: string;
}

export interface MaterialDeliveryItem {
  id: string;
  name: string;
  quantity: number;
  delivered?: boolean;
}

export interface MaterialDelivery {
  id: string;
  client_name: string;
  client_nif?: string;
  loading_address?: string;
  unloading_address?: string;
  at_code?: string;
  items: MaterialDeliveryItem[];
  status: 'pending' | 'partial' | 'delivered' | 'canceled';
  client_signature?: string;
  partial_signature?: string;
  partial_delivered_at?: string;
  notes?: string;
  created_at: string;
  delivered_at?: string;
}
