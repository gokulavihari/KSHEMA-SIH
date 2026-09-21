import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestMLRetrainingPipeline:

    def test_list_ml_models(self):
        """Verify GET /api/ml/models returns registered model cards."""
        res = client.get("/api/ml/models")
        assert res.status_code == 200
        models = res.json()
        assert len(models) >= 1
        prod = models[0]
        assert "model_id" in prod
        assert "evaluation_metrics" in prod
        assert prod["status"] == "PRODUCTION"

    def test_insufficient_data_retraining_rejection(self):
        """
        Verify POST /api/ml/training-runs rejects retraining when labeled ground truth is insufficient.
        Rule Section 10: Retraining not performed because validated labeled data is insufficient.
        """
        payload = {
            "dataset_version": "DS-UNVALIDATED-DRAFT",
            "labeled_samples_count": 10,
            "has_verified_ground_truth": False
        }
        res = client.post("/api/ml/training-runs", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "INSUFFICIENT_DATA"
        assert "validated labeled data is insufficient" in data["message"]

    def test_successful_candidate_training_run(self):
        """Verify POST /api/ml/training-runs produces isolated candidate model when verified labels exist."""
        payload = {
            "dataset_version": "DS-GSI-VERIFIED-2026.1",
            "labeled_samples_count": 150,
            "has_verified_ground_truth": True
        }
        res = client.post("/api/ml/training-runs", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "COMPLETED"
        assert "candidate_model_id" in data
        assert "metrics" in data

    def test_get_system_config_and_coverage(self):
        """Verify GET /api/config and GET /api/coverage return dynamic system status."""
        res_cfg = client.get("/api/config")
        assert res_cfg.status_code == 200
        cfg = res_cfg.json()
        assert cfg["data_coverage_mode"] == "verified_only"
        assert cfg["default_region"] is None

        res_cov = client.get("/api/coverage")
        assert res_cov.status_code == 200
        cov = res_cov.json()
        assert "supported_states" in cov
        assert "supported_geographic_bounds" in cov
