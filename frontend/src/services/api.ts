import {
  DashboardData, Habitation, CandidateSite, RelocationPlan,
  DataSource, SystemAlert, FieldReport, LocationAssessment,
  LocationRelocationResponse, DataSourceStatusItem
} from '../types';

import { API_BASE, API_TARGET } from '../config';

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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rainfall_multiplier: multiplier,
      severity_label: `${multiplier}x Scenario`
    })
  });
  if (!res.ok) throw new Error('Failed to run extreme rainfall simulation');
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulate/reset`, { method: 'POST' });
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
