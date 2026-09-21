from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class FactorContribution(BaseModel):
    factor: str
    key: Optional[str] = None
    configured_weight: Optional[float] = None
    effective_weight: Optional[float] = None
    weight: float
    raw_value: Optional[float] = None
    normalized_score: Optional[float] = None
    score: Optional[float] = None
    status: Optional[str] = None
    source: Optional[str] = None
    contribution_pct: Optional[float] = None
    contribution: float
    description: str

class HabitationSchema(BaseModel):
    id: str
    name: str
    district: str = "Chamoli"
    subdistrict: str
    latitude: float
    longitude: float
    population: int
    children_percentage: float
    elderly_percentage: float
    households: int
    housing_vulnerability_score: float
    medical_distance_km: float
    road_access_quality: str # Good, Moderate, Poor, Isolated
    historical_disaster_count: int
    risk_score: float
    risk_level: str # LOW, MODERATE, HIGH, VERY HIGH, CRITICAL
    vulnerability_score: float
    exposure_score: float
    relocation_priority: str # IMMEDIATE, SHORT-TERM, MEDIUM-TERM, MONITOR
    relocation_urgency_score: float
    dominant_hazard: str
    evidence_level: str # HIGH, MEDIUM, LOW
    factors: List[FactorContribution]

class CapacityBreakdown(BaseModel):
    land_capacity: int
    water_capacity: int
    sanitation_capacity: int
    healthcare_capacity: int
    education_capacity: int
    road_capacity: int
    emergency_capacity: int
    effective_capacity: int
    bottleneck: str
    used_capacity: int = 0
    remaining_capacity: int
    utilization_percentage: float = 0.0

class CandidateSiteSchema(BaseModel):
    site_id: str
    name: str
    district: str = "Chamoli"
    subdistrict: str = "Chamoli"
    state: str = "Uttarakhand"
    latitude: float
    longitude: float
    site_type: str # Relief Campus, Open Ground, Public School, Sports Complex
    source_type: str = "DEMONSTRATION_DATA" # OFFICIAL_AUTHORITY_DATA, VERIFIED_OPEN_DATA, FIELD_VERIFIED, MODEL_DERIVED, DEMONSTRATION_DATA, UNKNOWN
    source_url: Optional[str] = None
    source_reference: Optional[str] = None
    verification_status: str = "DEMONSTRATION_ONLY"
    last_updated: str = "2026-09-17"
    data_freshness: str = "CURRENT"
    is_safe: bool = True
    safety_status: str = "SAFE_CANDIDATE" # SAFE_CANDIDATE, CONDITIONALLY_SUITABLE, UNSAFE, REJECTED, INSUFFICIENT_EVIDENCE, OUT_OF_COVERAGE, DATA_UNAVAILABLE, DEMONSTRATION_ONLY
    rejection_reason: Optional[str] = None
    hazard_status: str = "SAFE"
    hazard_reasons: List[str] = []
    land_area_sqm: float
    safety_score: float
    suitability_score: float
    capacity: CapacityBreakdown
    used_capacity: int = 0
    remaining_capacity: int
    utilization_percentage: float = 0.0
    distance_km: float = 0.0
    distance_type: str = "straight_line"
    water_availability_lpd: int = 0
    nearest_hospital_km: float = 0.0
    nearest_school_km: float = 0.0
    road_accessibility: str = "Good"
    is_demonstration: bool = True
    model_version: str = "AASHRAY-RELOC-v2.0"

class SourceHabitationRef(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    population: int
    risk_score: float
    vulnerability_score: float

class SearchParametersRef(BaseModel):
    initial_radius_km: float = 10.0
    maximum_radius_km: float = 50.0
    distance_method: str = "Geodesic Haversine / PostGIS Geography"
    routing_available: bool = False

class RecommendedSiteRef(BaseModel):
    site_id: str
    name: str
    status: str
    latitude: float
    longitude: float
    distance_km: float
    distance_type: str = "straight_line"
    safety_score: float
    effective_capacity: int
    remaining_capacity: int
    allocated_population: int
    capacity_utilization_percent: float
    bottleneck: str
    source_type: str
    source_reference: Optional[str] = None
    data_freshness: str
    evidence_confidence: float
    explanation: List[str]
    is_demonstration: bool = True

class RejectedSiteAuditRef(BaseModel):
    site_id: str
    site_name: str
    reason: str
    safety_score: float
    allocated: int = 0

class RelocationResponseSchema(BaseModel):
    source_habitation: SourceHabitationRef
    search_parameters: SearchParametersRef
    recommended_site: Optional[RecommendedSiteRef] = None
    alternatives: List[RecommendedSiteRef] = []
    rejected_sites: List[RejectedSiteAuditRef] = []
    unallocated_population: int = 0
    overall_status: str # FEASIBLE_COMPLETE, FEASIBLE_PARTIAL, NOT_FEASIBLE, NO_SAFE_SITE_FOUND, INSUFFICIENT_EVIDENCE, OUT_OF_COVERAGE
    warnings: List[str] = []
    model_version: str = "AASHRAY-RELOC-v2.0"
    calculated_at: str

class AllocationItem(BaseModel):
    site_id: str
    site_name: str
    allocated_population: int
    site_effective_capacity: int
    utilization_percentage: float
    distance_km: float
    safety_score: float
    suitability_score: float
    reasons: List[str]
    bottleneck: str

class RelocationPlanSchema(BaseModel):
    plan_id: str
    habitation_id: str
    habitation_name: str
    required_population: int
    allocated_population: int
    unallocated_population: int
    status: str # FEASIBLE_COMPLETE, FEASIBLE_PARTIAL, NO_FEASIBLE_COMPLETE_RELOCATION
    allocations: List[AllocationItem]
    urgency: str
    recommendation_notes: List[str]
    rejected_sites_audit: List[Dict[str, Any]]
    created_at: str

class SimulationRequestSchema(BaseModel):
    rainfall_multiplier: float = Field(..., ge=0.5, le=4.0)
    severity_label: str = "CUSTOM"
    duration_hours: int = 24

class SimulationResponseSchema(BaseModel):
    simulation_id: str
    rainfall_multiplier: float
    before_metrics: Dict[str, Any]
    after_metrics: Dict[str, Any]
    delta: Dict[str, Any]
    timestamp: str

class DataSourceSchema(BaseModel):
    id: str
    source_name: str
    dataset_name: str
    purpose: str
    spatial_resolution: str
    temporal_resolution: str
    last_updated: str
    status: str # CONNECTED, HISTORICAL, DEMO, SIMULATED, UNAVAILABLE

class AlertSchema(BaseModel):
    id: str
    severity: str # CRITICAL, WARNING, INFO
    timestamp: str
    source: str
    location: str
    message: str

class FieldReportSchema(BaseModel):
    id: str
    location: str
    latitude: float
    longitude: float
    severity: str
    issue_type: str
    description: str
    timestamp: str
    officer_id: str

class SystemConfigSchema(BaseModel):
    default_region: Optional[str] = None
    supported_regions: List[str] = []
    data_coverage_mode: str = "verified_only"
    allow_demo_data: bool = False
    require_source_metadata: bool = True
    require_coordinates: bool = True
    require_capacity_for_relocation: bool = True
    minimum_data_quality_score: float = 0.70

class CoverageReportSchema(BaseModel):
    supported_states: List[str]
    supported_districts: List[str]
    supported_geographic_bounds: Dict[str, float]
    number_of_records_per_area: Dict[str, int]
    last_updated_timestamp: str
    data_source: str
    verification_status: str
    limitations: List[str]

class DatabaseReadinessSchema(BaseModel):
    total_habitations: int
    total_relocation_sites: int
    total_active_relocation_sites: int
    sites_with_valid_coordinates: int
    sites_with_missing_coordinates: int
    sites_marked_safe: int
    sites_marked_unsafe: int
    verified_sites: int
    demonstration_sites: int
    sites_with_real_capacity: int
    sites_with_unknown_capacity: int
    sites_with_source_metadata: int
    sites_without_source_metadata: int
    district_wise_habitation_count: Dict[str, int]
    district_wise_relocation_site_count: Dict[str, int]
    state_wise_habitation_count: Dict[str, int]
    state_wise_relocation_site_count: Dict[str, int]
    geographic_bounding_box: Dict[str, float]
    supported_states: List[str]
    supported_districts: List[str]
    data_freshness: str
    source_coverage: str
    percentage_valid_coordinates: float
    percentage_provenance: float
    percentage_capacity: float
    percentage_safety_status: float

class UncertaintyModelSchema(BaseModel):
    level: str # low, medium, high
    reasons: List[str]

class WhyRejectedItemSchema(BaseModel):
    site_id: str
    site_name: str
    reasons: List[str]

class StructuredExplanationSchema(BaseModel):
    decision_status: str # recommended | alternatives_available | no_eligible_site | insufficient_data
    recommended_site: Optional[Dict[str, Any]] = None
    alternative_sites: List[Dict[str, Any]] = []
    why_selected: List[str] = []
    why_rejected: List[WhyRejectedItemSchema] = []
    calculation_details: Dict[str, Any] = {}
    uncertainty: UncertaintyModelSchema
    human_review_required: bool = True

class ModelVersionSchema(BaseModel):
    model_id: str
    model_type: str
    input_features: List[str]
    training_data_summary: str
    validation_data_summary: str
    geographic_coverage: str
    known_limitations: List[str]
    model_version: str
    training_timestamp: str
    evaluation_metrics: Dict[str, Any]
    intended_use: str
    prohibited_use: str
    human_review_required: bool = True
    status: str = "PRODUCTION" # PRODUCTION, CANDIDATE, ARCHIVED

class RetrainingRunSchema(BaseModel):
    training_run_id: str
    dataset_version: str
    candidate_model_id: str
    status: str # IN_PROGRESS, COMPLETED, REJECTED, APPROVED_DEPLOYED, INSUFFICIENT_DATA
    message: str
    metrics: Dict[str, Any] = {}
    created_at: str

class ModelEvaluationSchema(BaseModel):
    evaluation_id: str
    candidate_model_id: str
    production_model_id: str
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: Dict[str, Any]
    false_positive_rate: float
    false_negative_rate: float
    geographic_holdout_pass: bool
    data_quality_sensitivity_pass: bool
    recommended_action: str # PROMOTE, REJECT, REQUIRES_MORE_DATA
    evaluated_at: str

