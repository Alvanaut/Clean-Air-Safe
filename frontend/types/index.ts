export type UserRole = 'godmode' | 'company_admin' | 'manager' | 'user';
export type SensorStatus = 'active' | 'inactive' | 'maintenance' | 'error';
export type TenantStatus = 'active' | 'trial' | 'suspended';
export type SyncStatus = 'active' | 'inactive' | 'error';

export interface User {
  id: string;
  email: string;
  firstName?: string; // Backend returns camelCase
  lastName?: string;  // Backend returns camelCase
  first_name?: string; // Keep for backward compatibility
  last_name?: string;  // Keep for backward compatibility
  phone?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  tenantId?: string;  // Backend returns camelCase
  tenant_id?: string; // Keep for backward compatibility
  created_at?: string;
  updated_at?: string;
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
  space_id?: string;
  space?: Space;
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
  space_id?: string;
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

export type SpaceType = 'building' | 'floor' | 'room' | 'zone' | 'area';
export type VentilationLevel = 'none' | 'natural' | 'mechanical' | 'hepa';
export type CleaningFrequency = 'none' | 'weekly' | 'daily' | 'hourly';
export type SafetyScore = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Space {
  id: string;
  name: string;
  description?: string;
  type: SpaceType;
  parent_space_id?: string;
  hierarchy_path?: string;
  responsible_user_id?: string;
  tenant_id: string;
  metadata?: Record<string, any>;
  // CO2 Baseline
  co2_baseline: number;
  // Safety & Hygiene Compliance
  has_hydro_gel: boolean;
  has_temp_check: boolean;
  has_mask_required: boolean;
  ventilation_level: VentilationLevel;
  max_capacity?: number;
  current_capacity?: number;
  cleaning_frequency: CleaningFrequency;
  has_isolation_room: boolean;
  social_distancing: boolean;
  safety_score?: SafetyScore;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  full_address: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  type: SpaceType;
  parent_space_id?: string;
  tenant_id: string;
  metadata?: Record<string, any>;
  // CO2 Baseline
  co2_baseline?: number;
  // Safety Score
  safety_score?: SafetyScore;
  // Optional fields for capacity
  max_capacity?: number;
  current_capacity?: number;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  // CO2 Baseline
  co2_baseline?: number;
  // Safety compliance
  has_hydro_gel?: boolean;
  has_temp_check?: boolean;
  has_mask_required?: boolean;
  ventilation_level?: VentilationLevel;
  max_capacity?: number;
  current_capacity?: number;
  cleaning_frequency?: CleaningFrequency;
  has_isolation_room?: boolean;
  social_distancing?: boolean;
}

// ==================== ALERTS ====================

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  id: string;
  sensor_id: string;
  sensor?: {
    id: string;
    name: string;
    space?: {
      id: string;
      name: string;
    };
  };
  tenant_id: string;
  co2_level: number;
  threshold_exceeded: number;
  severity: AlertSeverity;
  status: AlertStatus;
  escalation_level: number;
  notified_users?: string[];
  last_escalation_at?: string;
  acknowledged_at?: string;
  acknowledged_by_user_id?: string;
  resolved_at?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertStats {
  active_count: number;
  acknowledged_count: number;
  resolved_count: number;
  critical_count: number;
}

export interface GetAlertsParams {
  status?: AlertStatus;
  limit?: number;
  offset?: number;
}

export interface ResolveAlertRequest {
  resolution_note?: string;
}
