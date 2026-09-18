export interface FactorContribution {
  factor: string;
  key?: string;
  name?: string;
  weight: number;
  configured_weight?: number;
  effective_weight?: number;
  raw_value?: number | null;
  normalized_score?: number | null;
  score?: number | null;
  status?: string;
  source?: string;
  explanation?: string;
  contribution_pct?: number;
  contribution?: number;
  description: string;
}

export interface VulnerabilityFactor {
  factor: string;
  score: number;
  weight: number;
  contribution: number;
  status: string;
  source: string;
  description: string;
}

export interface UserLocationState {
  source: 'GPS' | 'SEARCH' | 'MAP' | 'COORDINATES' | 'PRESET' | string;
  latitude: number;
  longitude: number;
  accuracy: number;
  accuracyQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  displayName: string;
  locality: string;
  district: string;
  state: string;
  country: string;
  pincode?: string;
  locationVersion?: number;
  permissionState: 'PROMPT' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE';
  permissionErrorMessage?: string;
  demoMode: boolean;
}

export interface DecisionInfo {
  overall_status: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'CRITICAL' | 'UNKNOWN';
  risk_score: number | null;
  risk_level: string;
  vulnerability_score: number | null;
  vulnerability_level: string;
  hazard_exposure: 'YES' | 'NO' | 'UNKNOWN';
  action: 'MONITOR' | 'REVIEW' | 'RELOCATION_ASSESSMENT' | 'URGENT_RELOCATION_REVIEW' | 'NO_CONCLUSION';
  primary_trigger: string;
  relocation_required: boolean;
  explanation: string;
  confidence: number | null;
  is_hazard_exposed?: boolean;
  is_vulnerable?: boolean;
  requires_relocation_assessment?: boolean;
}

export interface HazardOverlapItem {
  hazard_type: string;
  name: string;
  severity: string;
  description: string;
}

export interface DataProvenanceItem {
  provider: string;
  data_type: string;
  status: string;
  freshness: string;
  observation_time: string;
  description: string;
}

export interface LocationAssessment {
  status?: string;
  assessment_mode?: 'FULL_EVIDENCE' | 'PARTIAL_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  coverage_percentage?: number;
  evidence_coverage?: number;
  assessment_radius_m?: number;
  assessment_geometry?: {
    type: string;
    coordinates: number[][][];
  };
  hazard_overlaps?: HazardOverlapItem[];
  data_provenance?: DataProvenanceItem[];
  coverage?: {
    status: string;
    assessment_mode?: string;
    coverage_percentage?: number;
    is_in_pilot_region?: boolean;
    minimum_evidence_met?: boolean;
    message?: string;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    accuracy_m?: number;
    accuracy_quality: 'HIGH' | 'MEDIUM' | 'LOW';
    source: string;
    display_name: string;
    locality: string;
    district: string;
    state: string;
    country: string;
  };
  status_banner: string;
  hazard_score: number | null;
  exposure_score: number | null;
  vulnerability_score: number | null;
  vulnerability_level?: string;
  vulnerability_label: string;
  vulnerability?: {
    status: string;
    level: string;
    score: number | null;
    factors: VulnerabilityFactor[];
    explanation: string;
  };
  risk_score: number | null;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'CRITICAL' | 'UNKNOWN' | string;
  confidence: number | null;
  confidence_score?: number | null;
  dominant_hazard: string;
  secondary_hazard: string;
  decision?: DecisionInfo;
  relocation?: {
    required: boolean;
    primary_trigger?: string;
    status_message?: string;
    nearest_feasible_site?: LocationRelocationOptionItem | null;
    options?: LocationRelocationOptionItem[];
    plan_status?: string;
  };
  factors: FactorContribution[];
  evidence: string[];
  live_conditions: {
    rainfall_mm_hr: number;
    temperature_c: number;
    imd_warning_level: string;
    imd_warning_text: string;
    imd_status: string;
    mosdac_status: string;
    mosdac_rainfall_mm: number | null;
  };
  spatial_features: {
    elevation_m: number;
    slope_degrees: number;
    river_distance_m: number | null;
    nearest_hospital_km: number;
    nearest_road_km: number;
    historical_events_10km: number | null;
    in_flood_zone: boolean | null;
    in_landslide_zone: boolean | null;
    has_river_layer?: boolean;
  };
  data_freshness: {
    imd_freshness: string;
    imd_observation_time: string;
    mosdac_freshness: string;
    elevation_dataset: string;
    osm_status: string;
  };
  assessment_timestamp: string;
  data_status: string;
  coordinate_analysis_status?: 'AVAILABLE' | 'MODEL-DERIVED' | 'UNAVAILABLE';
  request_id?: string;
  debug_info?: Record<string, any>;
}

export interface LocationRelocationOptionItem {
  site_id: string;
  site_name: string;
  site_type: string;
  district: string;
  subdistrict: string;
  latitude: number;
  longitude: number;
  allocated_population: number;
  site_effective_capacity: number;
  remaining_capacity_after_alloc: number;
  utilization_percentage: number;
  straight_line_dist_km: number;
  road_dist_km: number;
  estimated_travel_time_min: number;
  safety_score: number;
  suitability_score: number;
  composite_score: number;
  bottleneck: string;
  nearest_hospital_km: number;
  road_accessibility: string;
  why_this_site: string[];
}

export interface LocationRelocationResponse {
  plan_id: string;
  status: 'FEASIBLE_COMPLETE' | 'FEASIBLE_PARTIAL' | 'NO_FEASIBLE_COMPLETE_RELOCATION' | 'NO_RELOCATION_INDICATED' | 'MONITOR_CONDITIONS';
  population_to_relocate?: number;
  allocated_population?: number;
  unallocated_population?: number;
  nearest_feasible_site: LocationRelocationOptionItem | null;
  allocations: LocationRelocationOptionItem[];
  rejected_sites_audit: Array<{
    site_id: string;
    site_name: string;
    reason: string;
    safety_score: number;
    allocated: number;
  }>;
  recommendations: string[];
  message?: string;
}

export interface DataSourceStatusItem {
  id: string;
  source_name: string;
  provider_url: string;
  purpose: string;
  dataset_name: string;
  data_type: string;
  status: 'LIVE' | 'RECENT' | 'HISTORICAL' | 'DEMONSTRATION' | 'MODEL-DERIVED' | 'UNAVAILABLE' | 'CONNECTED' | 'CURRENT';
  status_message: string;
  freshness: string;
  retrieval_time: string;
  observation_time: string;
  spatial_resolution: string;
  temporal_resolution: string;
  confidence: number;
  license: string;
  is_live: boolean;
}

export interface Habitation {
  id: string;
  name: string;
  district: string;
  subdistrict: string;
  latitude: number;
  longitude: number;
  population: number;
  children_percentage: number;
  elderly_percentage: number;
  households: number;
  housing_vulnerability_score: number;
  medical_distance_km: number;
  road_access_quality: string;
  historical_disaster_count: number;
  risk_score: number;
  risk_level: 'CRITICAL' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  vulnerability_score: number;
  exposure_score: number;
  relocation_priority: 'IMMEDIATE' | 'SHORT-TERM' | 'MEDIUM-TERM' | 'MONITOR';
  relocation_urgency_score: number;
  dominant_hazard: string;
  evidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: FactorContribution[];
}

export interface CapacityBreakdown {
  land_capacity: number;
  water_capacity: number;
  sanitation_capacity: number;
  healthcare_capacity: number;
  education_capacity: number;
  road_capacity: number;
  emergency_capacity: number;
  effective_capacity: number;
  bottleneck: string;
  used_capacity: number;
  remaining_capacity: number;
  utilization_percentage: number;
}

export interface CandidateSite {
  id: string;
  site_id?: string;
  name: string;
  address?: string;
  district: string;
  subdistrict: string;
  state?: string;
  latitude: number;
  longitude: number;
  site_type: string;
  source_type?: string;
  source_url?: string;
  source_reference?: string;
  verification_status?: string;
  last_updated?: string;
  data_freshness?: string;
  is_safe: boolean;
  safety_status?: string;
  rejection_reason?: string;
  hazard_status?: string;
  hazard_reasons?: string[];
  land_area_sqm: number;
  safety_score: number;
  suitability_score: number;
  capacity: CapacityBreakdown;
  used_capacity: number;
  remaining_capacity: number;
  utilization_percentage: number;
  distance_km: number;
  distance_type?: string;
  water_availability_lpd: number;
  nearest_hospital_km: number;
  nearest_school_km: number;
  road_accessibility: string;
  is_demonstration?: boolean;
  model_version?: string;
}

export interface AllocationItem {
  site_id: string;
  site_name: string;
  allocated_population: number;
  site_effective_capacity: number;
  utilization_percentage: number;
  distance_km: number;
  safety_score: number;
  suitability_score: number;
  reasons: string[];
  bottleneck: string;
}

export interface RelocationPlan {
  plan_id: string;
  habitation_id: string;
  habitation_name: string;
  required_population: number;
  allocated_population: number;
  unallocated_population: number;
  status: 'FEASIBLE_COMPLETE' | 'FEASIBLE_PARTIAL' | 'NO_FEASIBLE_COMPLETE_RELOCATION';
  allocations: AllocationItem[];
  urgency: string;
  recommendation_notes: string[];
  rejected_sites_audit: Array<{
    site_id: string;
    site_name: string;
    reason: string;
    safety_score: number;
    allocated: number;
  }>;
  created_at: string;
}

export interface DashboardData {
  simulation_state: {
    rainfall_multiplier: number;
    label: string;
  };
  kpis: {
    total_population: number;
    population_at_risk: number;
    critical_habitations_count: number;
    red_zone_area_sqkm: number;
    immediate_relocation_pop: number;
    short_term_relocation_pop: number;
    medium_term_relocation_pop: number;
    available_safe_capacity: number;
    capacity_utilization_pct: number;
  };
  critical_habitations: Array<{
    id: string;
    name: string;
    population: number;
    risk_score: number;
    priority: string;
    dominant_hazard: string;
  }>;
}

export interface DataSource {
  id: string;
  source_name: string;
  dataset_name: string;
  purpose: string;
  spatial_resolution: string;
  temporal_resolution: string;
  last_updated: string;
  status: 'CONNECTED' | 'HISTORICAL' | 'DEMO' | 'SIMULATED' | 'UNAVAILABLE';
}

export interface SystemAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  source: string;
  location: string;
  message: string;
}

export interface FieldReport {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: string;
  issue_type: string;
  description: string;
  timestamp: string;
  officer_id: string;
}
