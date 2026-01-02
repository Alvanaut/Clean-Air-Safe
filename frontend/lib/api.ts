import apiClient from './api-client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Sensor,
  Tenant,
  CreateSensorRequest,
  UpdateSensorRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateTenantRequest,
  UpdateTenantRequest,
  GetReadingsParams,
  GetReadingsResponse,
  SensorReading,
  Space,
  Building,
  CreateSpaceRequest,
  UpdateSpaceRequest,
  Alert,
  AlertStats,
  GetAlertsParams,
  ResolveAlertRequest,
} from '@/types';

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data; // Auth endpoints return data directly
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data; // /auth/me returns user directly, not wrapped
  },
};

// Sensors API
export const sensorsApi = {
  getAll: async (): Promise<Sensor[]> => {
    const response = await apiClient.get<{ success: boolean; data: Sensor[] }>('/sensors');
    return response.data.data;
  },

  getById: async (id: string): Promise<Sensor> => {
    const response = await apiClient.get<{ success: boolean; data: Sensor }>(`/sensors/${id}`);
    return response.data.data;
  },

  create: async (data: CreateSensorRequest): Promise<Sensor> => {
    const response = await apiClient.post<{ success: boolean; data: Sensor }>('/sensors', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateSensorRequest): Promise<Sensor> => {
    const response = await apiClient.put<{ success: boolean; data: Sensor }>(`/sensors/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sensors/${id}`);
  },

  getByQR: async (qrCode: string): Promise<Sensor> => {
    const response = await apiClient.get<{ success: boolean; data: Sensor }>(`/sensors/qr/${qrCode}`);
    return response.data.data;
  },

  getReadings: async (sensorId: string, params?: GetReadingsParams): Promise<GetReadingsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<GetReadingsResponse>(
      `/sensors/${sensorId}/readings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<{ success: boolean; data: User[] }>('/users');
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; data: User }>(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<{ success: boolean; data: User }>('/users', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<{ success: boolean; data: User }>(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

// Tenants API
export const tenantsApi = {
  getAll: async (): Promise<Tenant[]> => {
    const response = await apiClient.get<{ success: boolean; data: Tenant[] }>('/tenants');
    return response.data.data;
  },

  getById: async (id: string): Promise<Tenant> => {
    const response = await apiClient.get<{ success: boolean; data: Tenant }>(`/tenants/${id}`);
    return response.data.data;
  },

  create: async (data: CreateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.post<{ success: boolean; data: Tenant }>('/tenants', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.put<{ success: boolean; data: Tenant }>(`/tenants/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenants/${id}`);
  },
};

// Spaces API
export const spacesApi = {
  getAll: async (): Promise<Space[]> => {
    const response = await apiClient.get<Space[]>('/spaces');
    return response.data;
  },

  getById: async (id: string): Promise<Space> => {
    const response = await apiClient.get<Space>(`/spaces/${id}`);
    return response.data;
  },

  getByTenant: async (tenantId: string, type?: string): Promise<Space[]> => {
    const url = type
      ? `/spaces/tenant/${tenantId}?type=${type}`
      : `/spaces/tenant/${tenantId}`;
    const response = await apiClient.get<Space[]>(url);
    return response.data;
  },

  getBuildingsByTenant: async (tenantId: string): Promise<Building[]> => {
    const response = await apiClient.get<Building[]>(`/spaces/tenant/${tenantId}/buildings`);
    return response.data;
  },

  create: async (data: CreateSpaceRequest): Promise<Space> => {
    const response = await apiClient.post<Space>('/spaces', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSpaceRequest): Promise<Space> => {
    const response = await apiClient.put<Space>(`/spaces/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/spaces/${id}`);
  },

  getChildren: async (id: string): Promise<Space[]> => {
    const response = await apiClient.get<Space[]>(`/spaces/${id}/children`);
    return response.data;
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (params?: GetAlertsParams): Promise<Alert[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<{ success: boolean; data: Alert[]; count: number }>(
      `/alerts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<Alert> => {
    const response = await apiClient.get<{ success: boolean; data: Alert }>(`/alerts/${id}`);
    return response.data.data;
  },

  // NOTE: Alerts are automatically resolved when CO2 returns below threshold.
  // Manual acknowledge/resolve endpoints have been removed.

  getStats: async (): Promise<AlertStats> => {
    const response = await apiClient.get<{ success: boolean; data: AlertStats }>(
      '/alerts/stats/summary'
    );
    return response.data.data;
  },
};
