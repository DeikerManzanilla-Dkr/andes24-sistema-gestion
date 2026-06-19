// Tipos de base de datos centralizados para Andes 24
// Extraídos de src/types/index.ts y componentes para evitar duplicados

// =========================
// Tablas principales
// =========================

export interface ClientRow {
  id: string;
  name: string;
  document_id: string;
  cedula_clean?: string | null;
  phone: string;
  address: string | null;
  email: string | null;
  birth_date: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones anidadas para consultas con JOIN
  vehicles?: VehicleRow[];
  contracts?: Array<{
    id: string;
    documents?: DocumentRow[];
  }>;
}

export interface VehicleRow {
  id: string;
  client_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  serial_motor: string | null;
  serial_carroceria: string | null;
  color: string | null;
  tipo_vehiculo: string | null;
  uso: string | null;
  clase: string | null;
  peso: string | null;
  puestos: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  name: string;
  price_eur: number | null;
  price_usd: number | null;
  coverage_details: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractRow {
  id: string;
  policy_number: string;
  client_id: string;
  vehicle_id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  issued_at: string;
  qr_code_url: string | null;
  pdf_url?: string | null;
  pdf_snapshot: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // Propiedades anidadas para selects con JOIN (usadas en Documents)
  client?: {
    name: string;
    document_id: string;
  } | null;
  vehicle?: {
    plate: string;
  } | null;
}

export interface DocumentRow {
  id: string;
  contract_id: string;
  kind: string;
  filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  user_id: string | null;
  created_at: string;
}

export interface DocumentOverlayRow {
  id: string;
  contract_id: string;
  elements: Array<{ id: string; type: string; text: string; x: number; y: number; fontSize?: number }>;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeguimientoRow {
  id: string;
  cliente_id: string;
  tipo: string;
  descripcion: string | null;
  proxima_accion_date: string | null;
  realizado: boolean;
  contract_id: string | null;
  user_id: string | null;
  created_at: string;
}

// =========================
// Tipos derivados (para UI y hooks)
// =========================

export interface ReminderItem {
  id: string;
  clientName: string;
  type: string;
  description: string;
  dueAt: string | null;
}

// Alias para compatibilidad con hooks existentes
export type ReminderRow = SeguimientoRow;

// =========================
// Tipos legados (compatibilidad con pdfGenerator.ts)
// =========================

export type PdfClientLegacy = {
  id: string;
  name: string;
  document_id: string;
  phone: string;
  address?: string | null;
  email?: string | null;
  birth_date?: string | null;
  user_id?: string | null;
} & Record<string, unknown>;

export type PdfVehicleLegacy = {
  id: string;
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  serial_motor?: string | null;
  serial_carroceria?: string | null;
  color?: string | null;
  tipo_vehiculo?: string | null;
  uso?: string | null;
  client_id?: string;
  user_id?: string | null;
} & Record<string, unknown>;

export type PdfPlanLegacy = {
  id: string;
  name: string;
  price_usd?: number | null;
  price?: number | null;
  coverage_details?: Record<string, unknown> | null;
  user_id?: string | null;
} & Record<string, unknown>;

export type PdfContractLegacy = {
  id: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  status?: string;
  invoice_number?: string | null;
  issue_time?: string | null;
  qr_code_url?: string | null;
  client_id?: string;
  vehicle_id?: string;
  plan_id?: string | null;
  user_id?: string | null;
} & Record<string, unknown>;

// =========================
// Tipos de Edge Functions
// =========================

export interface GenerateFollowupsPayload {
  daysAhead?: number[];
  dryRun?: boolean;
}

export interface GenerateFollowupsResult {
  inserted: number;
  skipped: number;
  errors?: string[];
  details?: Array<{
    contractId: string;
    policyNumber: string;
    clientId: string;
    tipo: string;
    proximaAccionDate: string;
  }>;
}
