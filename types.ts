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
  brand: string;
  model: string;
  serial_number: string;
  install_date?: string;
  nameplate_url?: string;
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
  client_signature?: string;
  technician_signature?: string; 
  client?: Client;
  establishment?: Establishment;
  equipment?: Equipment;
  store: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  store: string; // CR ou PM
}

export interface TimeEntry {
  id: string;
  os_id: string;
  client_id?: string;
  start_time: string;
  duration_minutes: number;
  description?: string;
}