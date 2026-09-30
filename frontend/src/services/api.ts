import {
  DashboardData, Habitation, CandidateSite, RelocationPlan,
  DataSource, SystemAlert, FieldReport, LocationAssessment,
  LocationRelocationResponse, DataSourceStatusItem
} from '../types';

import { API_BASE, API_TARGET } from '../config';

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('aashray_executive_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkBackendHealth(): Promise<{ healthy: boolean; url: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (res.ok) {
      return { healthy: true, url: API_TARGET };
    }
    return { healthy: false, url: API_TARGET, error: `HTTP ${res.status} ${res.statusText}` };
  } catch (err: any) {
    return { healthy: false, url: API_TARGET, error: err.message || 'Connection failed' };
  }
}

export async function assessLocation(
  latitude: number,
  longitude: number,
  accuracy: number = 15.0,
  source: string = 'GPS',
  assessmentRadiusM: number = 1000.0
): Promise<LocationAssessment> {
  try {
    const res = await fetch(`${API_BASE}/location/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, accuracy, source, assessment_radius_m: assessmentRadiusM })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      let msg = `HTTP ${res.status} ${res.statusText}`;
      if (errData && errData.detail) {
        if (typeof errData.detail === 'string') {
          msg += `: ${errData.detail}`;
        } else if (typeof errData.detail === 'object' && errData.detail.message) {
          msg += `: ${errData.detail.message}`;
        }
      }
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error(`Connection Failed: Backend API server unreachable at ${API_TARGET}.`);
    }
    throw err;
  }
}

export async function resolveLocation(payload: { address?: string; latitude?: number; longitude?: number }) {
  const res = await fetch(`${API_BASE}/location/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve location' }));
    throw new Error(err.detail || 'Failed to resolve location');
  }
  return res.json();
}

export async function selectLocation(payload: {
  latitude: number;
  longitude: number;
  source?: string;
  display_name?: string;
  locality?: string;
  district?: string;
  state?: string;
}) {
  const res = await fetch(`${API_BASE}/location/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to select location' }));
    throw new Error(err.detail || 'Failed to select location');
  }
  return res.json();
}

export async function searchLocation(query: string) {
  const res = await fetch(`${API_BASE}/location/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Search failed' }));
    throw new Error(err.detail || 'Search failed');
  }
  return res.json();
}

export async function searchPublicLocation(query: string) {
  const res = await fetch(`${API_BASE}/public/location/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Location search failed' }));
    throw new Error(err.detail || 'Location search failed');
  }
  return res.json();
}

export async function fetchPublicLocationAssessment(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 15.0,
  source: string = 'GPS',
  assessmentRadiusM: number = 1000.0
): Promise<LocationAssessment> {
  const res = await fetch(`${API_BASE}/public/location-assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      accuracy_meters: accuracyMeters,
      source,
      assessment_radius_m: assessmentRadiusM
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to compute location assessment' }));
    throw new Error(err.detail || 'Failed to compute location assessment');
  }
  return res.json();
}

export async function fetchPublicLocationRisk(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 15.0,
  source: string = 'GPS'
): Promise<LocationAssessment> {
  return fetchPublicLocationAssessment(latitude, longitude, accuracyMeters, source);
}

export async function checkPublicLocationAlerts(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 15.0
) {
  const res = await fetch(`${API_BASE}/public/location-alerts/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      accuracy_meters: accuracyMeters
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to evaluate location alert status' }));
    throw new Error(err.detail || 'Failed to evaluate location alert status');
  }
  return res.json();
}


export async function fetchLocationRelocationOptions(
  latitude: number,
  longitude: number,
  populationToRelocate: number = 1250,
  riskLevel: string = 'CRITICAL'
): Promise<LocationRelocationResponse> {
  const res = await fetch(`${API_BASE}/location/relocation-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      population_to_relocate: populationToRelocate,
      risk_level: riskLevel
    })
  });
  if (!res.ok) throw new Error('Failed to fetch location relocation options');
  return res.json();
}

export async function fetchDataSourcesStatus(): Promise<DataSourceStatusItem[]> {
  const res = await fetch(`${API_BASE}/data-sources/status`);
  if (!res.ok) throw new Error('Failed to fetch data sources status');
  return res.json();
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
}

export async function fetchHabitations(priority?: string, riskLevel?: string): Promise<Habitation[]> {
  let url = `${API_BASE}/habitations`;
  const params = new URLSearchParams();
  if (priority) params.append('priority', priority);
  if (riskLevel) params.append('risk_level', riskLevel);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch habitations');
  return res.json();
}

export async function fetchHabitationDetail(id: string): Promise<Habitation & { recommended_plan: RelocationPlan }> {
  const res = await fetch(`${API_BASE}/habitations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch habitation ${id}`);
  return res.json();
}

export async function fetchRiskMapData() {
  const res = await fetch(`${API_BASE}/risk-map`);
  if (!res.ok) throw new Error('Failed to fetch risk map layers');
  return res.json();
}

export async function fetchRelocationSites(): Promise<CandidateSite[]> {
  const res = await fetch(`${API_BASE}/relocation-sites`);
  if (!res.ok) throw new Error('Failed to fetch candidate relocation sites');
  return res.json();
}

export async function fetchRelocationDebugSummary() {
  const res = await fetch(`${API_BASE}/debug/relocation-sites-summary`);
  if (!res.ok) throw new Error('Failed to fetch relocation sites debug summary');
  return res.json();
}

export async function fetchDatabaseReadinessSummary() {
  const res = await fetch(`${API_BASE}/debug/database-readiness`);
  if (!res.ok) throw new Error('Failed to fetch database readiness summary');
  return res.json();
}



export async function generateRelocationPlan(habitationId: string, populationOverride?: number): Promise<RelocationPlan> {
  const res = await fetch(`${API_BASE}/relocation-plan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      habitation_id: habitationId,
      population_override: populationOverride
    })
  });
  if (!res.ok) throw new Error('Failed to generate relocation plan');
  return res.json();
}

export async function runRainfallSimulation(multiplier: number) {
  const res = await fetch(`${API_BASE}/simulate/extreme-rainfall`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      rainfall_multiplier: multiplier,
      severity_label: `${multiplier}x Scenario`
    })
  });
  if (!res.ok) throw new Error('Failed to run extreme rainfall simulation');
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulate/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}

export async function fetchCapacityMatrix() {
  const res = await fetch(`${API_BASE}/capacity`);
  if (!res.ok) throw new Error('Failed to fetch capacity matrix');
  return res.json();
}

export async function fetchAlerts(): Promise<SystemAlert[]> {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchDataSources(): Promise<DataSource[]> {
  const res = await fetch(`${API_BASE}/data-sources`);
  if (!res.ok) throw new Error('Failed to fetch data sources');
  return res.json();
}

export async function fetchFieldReports(): Promise<FieldReport[]> {
  const res = await fetch(`${API_BASE}/field-reports`);
  if (!res.ok) throw new Error('Failed to fetch field reports');
  return res.json();
}

export async function submitFieldReport(reportData: Partial<FieldReport>) {
  const res = await fetch(`${API_BASE}/field-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `RPT-${Math.floor(1000 + Math.random() * 9000)}`,
      location: reportData.location || 'Chamoli Field Cluster',
      latitude: reportData.latitude || 30.4852,
      longitude: reportData.longitude || 79.6914,
      severity: reportData.severity || 'HIGH',
      issue_type: reportData.issue_type || 'Field Observation',
      description: reportData.description || 'Inspection update',
      timestamp: new Date().toLocaleString('en-IN'),
      officer_id: reportData.officer_id || 'NDRF-FIELD-01'
    })
  });
  if (!res.ok) throw new Error('Failed to submit field report');
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE}/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchDataCoverage() {
  const res = await fetch(`${API_BASE}/coverage`);
  if (!res.ok) throw new Error('Failed to fetch data coverage information');
  return res.json();
}

export async function fetchSystemConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch system configuration');
  return res.json();
}

export async function fetchMLModels() {
  const res = await fetch(`${API_BASE}/ml/models`);
  if (!res.ok) throw new Error('Failed to fetch ML models');
  return res.json();
}

export async function fetchMLTrainingRuns() {
  const res = await fetch(`${API_BASE}/ml/training-runs`);
  if (!res.ok) throw new Error('Failed to fetch ML training runs');
  return res.json();
}

// Emergency Alert & Web Push API Helpers
export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/notifications/vapid-public-key`);
  if (!res.ok) throw new Error('Failed to fetch VAPID public key');
  const data = await res.json();
  return data.public_key;
}

export async function subscribeWebPush(subscription: any, userId?: string) {
  const res = await fetch(`${API_BASE}/notifications/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, user_id: userId })
  });
  if (!res.ok) throw new Error('Failed to subscribe to Web Push notifications');
  return res.json();
}

export async function unsubscribeWebPush(endpoint: string) {
  const res = await fetch(`${API_BASE}/notifications/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint })
  });
  if (!res.ok) throw new Error('Failed to unsubscribe from Web Push');
  return res.json();
}

export async function checkEmergencyLocationRisk(latitude: number, longitude: number, accuracy_m: number = 20, userId?: string) {
  const res = await fetch(`${API_BASE}/emergency/location-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, accuracy_m, user_id: userId })
  });
  if (!res.ok) throw new Error('Failed to evaluate location emergency risk');
  return res.json();
}

export async function fetchEmergencyAuditLogs(limit: number = 50) {
  const res = await fetch(`${API_BASE}/emergency/audit-logs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch emergency audit logs');
  return res.json();
}

export async function triggerDemoEmergencyAlert(hazardType: string = 'FLOOD', riskLevel: string = 'CRITICAL', userId?: string) {
  const res = await fetch(`${API_BASE}/emergency/simulate-demo-alert`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hazard_type: hazardType, risk_level: riskLevel, user_id: userId })
  });
  if (!res.ok) throw new Error('Failed to trigger demo emergency alert');
  return res.json();
}

// ==========================================
// PUBLIC VIEWERS API HELPERS (UNAUTHENTICATED)
// ==========================================

export async function fetchPublicDashboard() {
  const res = await fetch(`${API_BASE}/public/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch public dashboard data');
  return res.json();
}

export async function fetchPublicMap(search?: string) {
  const url = search ? `${API_BASE}/public/map?search=${encodeURIComponent(search)}` : `${API_BASE}/public/map`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch public map features');
  return res.json();
}

export async function fetchPublicAlerts() {
  const res = await fetch(`${API_BASE}/public/alerts`);
  if (!res.ok) throw new Error('Failed to fetch public alerts');
  return res.json();
}

export async function fetchPublicSafetyInfo() {
  const res = await fetch(`${API_BASE}/public/safety-info`);
  if (!res.ok) throw new Error('Failed to fetch public safety info');
  return res.json();
}

// ==========================================
// KSHEMA NATIONAL ADMINISTRATIVE GIS API
// ==========================================

export async function fetchNationalGISOverview() {
  const res = await fetch(`${API_BASE}/gis/overview`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch national GIS overview');
  return res.json();
}

export async function fetchSupportedStates() {
  const res = await fetch(`${API_BASE}/gis/states`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch supported Indian states');
  return res.json();
}

export async function fetchStateBoundariesGeoJSON() {
  const res = await fetch(`${API_BASE}/gis/state-boundaries`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch state boundary polygons');
  return res.json();
}

export async function fetchStateGISSummary(state: string) {
  const res = await fetch(`${API_BASE}/gis/summary/${encodeURIComponent(state)}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch summary for state ${state}`);
  return res.json();
}

export async function fetchNationalGISLocations(params: {
  state?: string;
  district?: string;
  risk_level?: string;
  hazard_type?: string;
  priority_category?: string;
  bbox?: string;
} = {}) {
  const query = new URLSearchParams();
  if (params.state && params.state !== 'ALL') query.set('state', params.state);
  if (params.district && params.district !== 'ALL') query.set('district', params.district);
  if (params.risk_level && params.risk_level !== 'ALL') query.set('risk_level', params.risk_level);
  if (params.hazard_type && params.hazard_type !== 'ALL') query.set('hazard_type', params.hazard_type);
  if (params.priority_category && params.priority_category !== 'ALL') query.set('priority_category', params.priority_category);
  if (params.bbox) query.set('bbox', params.bbox);

  const qs = query.toString();
  const url = qs ? `${API_BASE}/gis/locations?${qs}` : `${API_BASE}/gis/locations`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch national risk locations');
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.locations)) return data.locations;
  if (data && Array.isArray(data.features)) {
    return data.features.map((f: any) => ({
      ...f.properties,
      latitude: f.geometry?.coordinates?.[1],
      longitude: f.geometry?.coordinates?.[0]
    }));
  }
  return [];
}

export async function fetchNationalGISLocationDetail(id: string) {
  const res = await fetch(`${API_BASE}/gis/location/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch location detail for ${id}`);
  return res.json();
}

export async function fetchLocationHistory(id: string) {
  const res = await fetch(`${API_BASE}/gis/history/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch historical assessments for ${id}`);
  return res.json();
}



