/**
 * 📖 API CLIENT
 * Client simple pour communiquer avec le backend
 */

const API_BASE = 'http://localhost:8000/api'

async function request(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const api = {
  // Sensors
  getSensors: () => request('/sensors'),
  getSensor: (id: string) => request(`/sensors/${id}`),
  getSensorMeasurements: (id: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams(params as any).toString()
    return request(`/sensors/${id}/measurements${query ? `?${query}` : ''}`)
  },

  // Users
  getUsers: () => request('/users'),
  getUser: (id: string) => request(`/users/${id}`),
  getUserHierarchy: (id: string) => request(`/users/${id}/hierarchy`),

  // Spaces
  getSpaces: () => request('/spaces'),
  getSpace: (id: string) => request(`/spaces/${id}`),
  getSpaceTree: (id: string) => request(`/spaces/${id}/tree`),

  // Alerts
  getAlerts: (params?: { status?: string; severity?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return request(`/alerts${query ? `?${query}` : ''}`)
  },
  getAlert: (id: string) => request(`/alerts/${id}`),

  // Health
  getHealth: () => request('/health'),
}
