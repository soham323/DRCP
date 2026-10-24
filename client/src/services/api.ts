import {
  AuthUser,
  DisasterItem,
  EmergencyResourceItem,
  CommunityReportItem,
  HttpHeader,
  UserRole,
  DisasterStatus,
  ResourceType,
} from '../types/enums';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'drcp_auth_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; headers: Headers; rawStatus: number }> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has(HttpHeader.AUTHORIZATION)) {
    headers.set(HttpHeader.AUTHORIZATION, `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return { data: {} as T, headers: response.headers, rawStatus: 204 };
  }

  const body = await response.json();
  if (!response.ok) {
    const errorMsg = body.detail || body.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.code = body.code;
    throw err;
  }

  return { data: body as T, headers: response.headers, rawStatus: response.status };
}

export const api = {
  // Authentication
  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    tokenStorage.set(res.data.token);
    return res.data;
  },

  async register(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    tokenStorage.set(res.data.token);
    return res.data;
  },

  async getMe(): Promise<AuthUser | null> {
    const token = tokenStorage.get();
    if (!token) return null;
    try {
      const res = await apiRequest<{ data: { authenticated: boolean; user: AuthUser } }>('/api/v1/auth/me');
      return res.data.data.user;
    } catch {
      tokenStorage.clear();
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clear();
    }
  },

  // Disasters
  async getDisasters(params?: { tag?: string; status?: DisasterStatus }): Promise<DisasterItem[]> {
    const query = new URLSearchParams();
    if (params?.tag) query.set('tag', params.tag);
    if (params?.status) query.set('status', params.status);
    query.set('limit', '50');

    const res = await apiRequest<{ data: DisasterItem[] }>(`/api/v1/disasters?${query.toString()}`);
    return res.data.data;
  },

  async getDisasterById(id: string): Promise<DisasterItem> {
    const res = await apiRequest<{ data: DisasterItem }>(`/api/v1/disasters/${id}`);
    return res.data.data;
  },

  async createDisaster(payload: {
    title: string;
    description: string;
    tags?: string[];
    latitude?: number;
    longitude?: number;
    status?: DisasterStatus;
  }): Promise<DisasterItem> {
    const res = await apiRequest<{ data: DisasterItem }>('/api/v1/disasters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.data;
  },

  async updateDisaster(id: string, payload: Partial<DisasterItem>): Promise<DisasterItem> {
    const res = await apiRequest<{ data: DisasterItem }>(`/api/v1/disasters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data.data;
  },

  async deleteDisaster(id: string): Promise<void> {
    await apiRequest(`/api/v1/disasters/${id}`, {
      method: 'DELETE',
    });
  },

  // Nearby Emergency Resources (Radius-based Haversine query)
  async getNearbyResources(
    disasterId: string,
    radiusKm: number,
    type?: ResourceType
  ): Promise<{ resources: EmergencyResourceItem[]; origin: any; count: number }> {
    const query = new URLSearchParams({ radius: radiusKm.toString() });
    if (type) query.set('type', type);

    const res = await apiRequest<{ data: EmergencyResourceItem[]; origin: any; count: number }>(
      `/api/v1/disasters/${disasterId}/resources?${query.toString()}`
    );
    return {
      resources: res.data.data,
      origin: res.data.origin,
      count: res.data.count,
    };
  },

  async createResource(payload: {
    name: string;
    type: ResourceType;
    locationName: string;
    latitude: number;
    longitude: number;
    capacity: number;
  }): Promise<EmergencyResourceItem> {
    // Note: nested location schema required by backend Zod validator
    const body = {
      name: payload.name,
      type: payload.type,
      location: {
        name: payload.locationName,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
      capacity: payload.capacity,
    };

    const res = await apiRequest<{ data: EmergencyResourceItem }>('/api/v1/resources', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data.data;
  },

  // Community Social Reports (Cache-Aside & Outage Resilience)
  async getCommunityReports(
    disasterId: string
  ): Promise<{ reports: CommunityReportItem[]; cacheHeader: string; degraded: boolean; cached: boolean }> {
    const res = await apiRequest<{ data: CommunityReportItem[]; cached: boolean; degraded?: boolean }>(
      `/api/v1/disasters/${disasterId}/reports`
    );

    const cacheHeader = res.headers.get(HttpHeader.X_CACHE) || (res.data.cached ? 'HIT' : 'MISS');
    return {
      reports: res.data.data,
      cacheHeader: cacheHeader.toUpperCase(),
      degraded: Boolean(res.data.degraded),
      cached: Boolean(res.data.cached),
    };
  },
};
