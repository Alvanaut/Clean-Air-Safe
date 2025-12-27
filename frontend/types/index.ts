export type UserRole = 'godmode' | 'company_admin' | 'manager' | 'user';
export type SensorStatus = 'active' | 'inactive' | 'maintenance' | 'error';
export type TenantStatus = 'active' | 'trial' | 'suspended';
export type SyncStatus = 'active' | 'inactive' | 'error';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  tenantId?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status: TenantStatus;
  ksp_contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Sensor {
  id: string;
  name: string;
  description?: string;
  ksp_device_id: string;
  ksp_serial_number?: string;
  status: SensorStatus;
  qr_code: string;
  tenant_id: string;
  last_reading_at?: string;
  last_reading_co2?: number;
  last_reading_temperature?: number;
  last_reading_humidity?: number;
  sync_status: SyncStatus;
  last_sync_at?: string;
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface CreateSensorRequest {
  name: string;
  description?: string;
  ksp_device_id: string;
  tenant_id: string;
}

export interface UpdateSensorRequest {
  name?: string;
  description?: string;
  status?: SensorStatus;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  tenant_id: string;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
}

export interface CreateTenantRequest {
  name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  co2_level: number;
  temperature?: number;
  humidity?: number;
  timestamp: string;
  source: number;
  created_at: string;
}

export interface GetReadingsParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetReadingsResponse {
  success: boolean;
  data: SensorReading[];
  total: number;
  limit: number;
  offset: number;
  sensor: {
    id: string;
    name: string;
    ksp_device_id: string;
  };
}
