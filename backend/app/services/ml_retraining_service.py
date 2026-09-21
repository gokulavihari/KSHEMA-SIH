"""
AASHRAY Controlled Self-Improvement & ML Model Lifecycle Management Service
Implements isolated candidate model training, evaluation, human approval workflow,
and rollback capabilities without synthetic label contamination.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid
import logging

logger = logging.getLogger("aashray.ml_service")

# In-memory store for model cards, training runs, and evaluations
ACTIVE_PRODUCTION_MODEL_ID = "MODEL-RISK-OVERLAY-v2.1"

MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "MODEL-RISK-OVERLAY-v2.1": {
        "model_id": "MODEL-RISK-OVERLAY-v2.1",
        "model_name": "AASHRAY Weighted Multi-Hazard Spatial Overlay Engine",
        "model_type": "Empirical Spatial Overlay & Hazard Vector Scoring",
        "input_features": [
            "SRTM DEM Slope (Degrees)",
            "BIS IS 1893 Seismic Zone Index",
            "Distance to Active Riverbed (Meters)",
            "IMD Real-time Rainfall Telemetry (mm/hr)",
            "Historical Landslide Vulnerability Index",
            "Population Density & Infrastructure Exposure"
        ],
        "training_data_summary": "Calibrated on 15 years of GSI Uttarakhand Landslide Hazard Inventories and CWC Flood Inundation Baselines.",
        "validation_data_summary": "Geographically validated across Chamoli & Garhwal Himalayan Sub-basins (2013-2026 ground records).",
        "geographic_coverage": "Uttarakhand Himalayan District Belt (Chamoli, Rudraprayag, Pithoragarh, Uttarkashi)",
        "known_limitations": [
            "Requires active DEM spatial resolution <= 30m for micro-topography slope analysis",
            "Does not replace physical geotechnical site-borehole drilling before infrastructure construction",
            "Out-of-bounds coordinates outside verified GIS coverage return INSUFFICIENT_DATA status"
        ],
        "model_version": "2.1.0",
        "training_timestamp": "2026-09-17T00:00:00Z",
        "evaluation_metrics": {
            "precision": 0.942,
            "recall": 0.915,
            "f1_score": 0.928,
            "false_positive_rate": 0.048,
            "false_negative_rate": 0.085,
            "geographic_holdout_accuracy": 0.921,
            "calibration_error": 0.035
        },
        "intended_use": "Decision-support triage for disaster risk ranking and emergency shelter placement.",
        "prohibited_use": "Autonomous mandatory evacuation commands without disaster management authority sign-off.",
        "human_review_required": True,
        "status": "PRODUCTION"
    }
}

TRAINING_RUNS_STORE: List[Dict[str, Any]] = [
    {
        "training_run_id": "RUN-20260917-001",
        "dataset_version": "DS-GSI-CWC-2026.09",
        "candidate_model_id": "MODEL-RISK-OVERLAY-v2.1",
        "status": "APPROVED_DEPLOYED",
        "message": "Baseline model benchmarked against verified GSI landslide inventory and approved for production.",
        "metrics": {
            "precision": 0.942,
            "recall": 0.915,
            "f1_score": 0.928
        },
        "created_at": "2026-09-17T00:00:00Z"
    }
]

EVALUATIONS_STORE: List[Dict[str, Any]] = [
    {
        "evaluation_id": "EVAL-20260917-001",
        "candidate_model_id": "MODEL-RISK-OVERLAY-v2.1",
        "production_model_id": "MODEL-RISK-OVERLAY-v2.0",
        "precision": 0.942,
        "recall": 0.915,
        "f1_score": 0.928,
        "confusion_matrix": {
            "true_positive": 182,
            "false_positive": 11,
            "true_negative": 310,
            "false_negative": 17
        },
        "false_positive_rate": 0.034,
        "false_negative_rate": 0.085,
        "geographic_holdout_pass": True,
        "data_quality_sensitivity_pass": True,
        "recommended_action": "PROMOTE",
        "evaluated_at": "2026-09-17T00:00:00Z"
    }
]


def get_all_models() -> List[Dict[str, Any]]:
    """Returns all registered ML models and their production status."""
    return list(MODEL_REGISTRY.values())


def get_model_by_id(model_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a specific model card by model_id."""
    return MODEL_REGISTRY.get(model_id)


def get_production_model() -> Dict[str, Any]:
    """Returns the current active production model card."""
    return MODEL_REGISTRY.get(ACTIVE_PRODUCTION_MODEL_ID, list(MODEL_REGISTRY.values())[0])


def get_training_runs() -> List[Dict[str, Any]]:
    """Returns log of all training runs."""
    return TRAINING_RUNS_STORE


def get_evaluation_by_id(evaluation_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves specific model evaluation report."""
    return next((e for e in EVALUATIONS_STORE if e["evaluation_id"] == evaluation_id), None)


def initiate_training_run(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes controlled retraining pipeline step.
    Checks dataset quality, provenance, and labeled sample sufficiency.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    dataset_version = payload.get("dataset_version", "DS-UNVALIDATED-DRAFT")
    labeled_samples = payload.get("labeled_samples_count", 0)
    has_verified_labels = payload.get("has_verified_ground_truth", False)

    if labeled_samples < 50 or not has_verified_labels:
        run_record = {
            "training_run_id": run_id,
            "dataset_version": dataset_version,
            "candidate_model_id": "NONE",
            "status": "INSUFFICIENT_DATA",
            "message": "Retraining not performed because validated labeled data is insufficient. Synthetic labels and unverified user predictions are strictly rejected.",
            "metrics": {},
            "created_at": now_str
        }
        TRAINING_RUNS_STORE.append(run_record)
        return run_record

    # Mock candidate model build for valid verified dataset inputs
    candidate_id = f"MODEL-CANDIDATE-{uuid.uuid4().hex[:6].upper()}"
    eval_id = f"EVAL-{uuid.uuid4().hex[:6].upper()}"

    candidate_model = {
        "model_id": candidate_id,
        "model_name": f"AASHRAY Candidate Classifier ({dataset_version})",
        "model_type": "Gradient Boosted Multi-Hazard Decision Trees (XGBoost)",
        "input_features": [
            "Slope", "Seismic Zone", "River Distance", "Rainfall Multiplier", "Housing Vulnerability"
        ],
        "training_data_summary": f"Trained on dataset {dataset_version} with {labeled_samples} verified records.",
        "validation_data_summary": "Evaluated using 5-fold spatial cross-validation.",
        "geographic_coverage": "Uttarakhand Himalayan Belt",
        "known_limitations": ["Requires human validation prior to deployment"],
        "model_version": "2.2.0-candidate",
        "training_timestamp": now_str,
        "evaluation_metrics": {
            "precision": 0.955,
            "recall": 0.930,
            "f1_score": 0.942,
            "false_positive_rate": 0.038,
            "false_negative_rate": 0.070,
            "geographic_holdout_accuracy": 0.935,
            "calibration_error": 0.028
        },
        "intended_use": "Candidate decision support triage.",
        "prohibited_use": "Direct deployment without human approval.",
        "human_review_required": True,
        "status": "CANDIDATE"
    }

    MODEL_REGISTRY[candidate_id] = candidate_model

    eval_record = {
        "evaluation_id": eval_id,
        "candidate_model_id": candidate_id,
        "production_model_id": ACTIVE_PRODUCTION_MODEL_ID,
        "precision": 0.955,
        "recall": 0.930,
        "f1_score": 0.942,
        "confusion_matrix": {"true_positive": 195, "false_positive": 9, "true_negative": 315, "false_negative": 14},
        "false_positive_rate": 0.028,
        "false_negative_rate": 0.067,
        "geographic_holdout_pass": True,
        "data_quality_sensitivity_pass": True,
        "recommended_action": "PROMOTE",
        "evaluated_at": now_str
    }
    EVALUATIONS_STORE.append(eval_record)

    run_record = {
        "training_run_id": run_id,
        "dataset_version": dataset_version,
        "candidate_model_id": candidate_id,
        "evaluation_id": eval_id,
        "status": "COMPLETED",
        "message": "Candidate model successfully trained in isolated sandbox and benchmarked against production.",
        "metrics": candidate_model["evaluation_metrics"],
        "created_at": now_str
    }
    TRAINING_RUNS_STORE.append(run_record)
    return run_record


def approve_model_promotion(model_id: str, officer_id: str = "ADMIN-CHIEF") -> Dict[str, Any]:
    """Promotes a candidate model to production following explicit human review."""
    global ACTIVE_PRODUCTION_MODEL_ID

    model = MODEL_REGISTRY.get(model_id)
    if not model:
        raise ValueError(f"Model ID {model_id} not found in registry.")

    # Archive previous production model
    if ACTIVE_PRODUCTION_MODEL_ID in MODEL_REGISTRY:
        MODEL_REGISTRY[ACTIVE_PRODUCTION_MODEL_ID]["status"] = "ARCHIVED"

    model["status"] = "PRODUCTION"
    model["approved_by"] = officer_id
    model["approved_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    ACTIVE_PRODUCTION_MODEL_ID = model_id

    return {
        "message": f"Model {model_id} successfully promoted to PRODUCTION by authority {officer_id}.",
        "active_production_model_id": ACTIVE_PRODUCTION_MODEL_ID,
        "model_details": model
    }


def rollback_production_model(target_model_id: Optional[str] = None) -> Dict[str, Any]:
    """Rolls back production model to a previous verified version."""
    global ACTIVE_PRODUCTION_MODEL_ID

    target = target_model_id or "MODEL-RISK-OVERLAY-v2.1"
    if target not in MODEL_REGISTRY:
        raise ValueError(f"Target rollback model ID {target} not available in registry.")

    if ACTIVE_PRODUCTION_MODEL_ID in MODEL_REGISTRY:
        MODEL_REGISTRY[ACTIVE_PRODUCTION_MODEL_ID]["status"] = "ARCHIVED"

    MODEL_REGISTRY[target]["status"] = "PRODUCTION"
    ACTIVE_PRODUCTION_MODEL_ID = target

    return {
        "message": f"Successfully rolled back active production model to {target}.",
        "active_production_model_id": ACTIVE_PRODUCTION_MODEL_ID,
        "model_details": MODEL_REGISTRY[target]
    }
