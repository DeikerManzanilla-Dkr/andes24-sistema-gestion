export interface Client {
  id: string;
  name: string;
  document_id: string;
  cedula_clean?: string | null;
  phone: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_plate?: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  name: string;
  price_usd: number | null;
  price_eur: number | null;
  coverage_details: Record<string, unknown> | null;
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
  pdf_snapshot?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  price_usd: number;
  price_bs: number;
  type: 'stationery' | 'policy';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'seller' | 'supervisor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  total_usd: number;
  total_bs: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  client_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  name: string;
  rate: number;
  updated_at: string;
}