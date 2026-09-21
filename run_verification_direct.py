import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_direct_verification():
    print("=" * 70)
    print("AASHRAY LOCATION-AGNOSTIC & CONTROLLED ML DIRECT REPAIR VERIFICATION")
    print("=" * 70)

    # 1. Health check
    h_res = client.get("/api/health").json()
    print("[1] HEALTH CHECK:")
    print(f"    System: {h_res.get('system')}")
    print(f"    Mode: {h_res.get('location_mode')}")
    print(f"    Supported Regions: {h_res.get('supported_regions')}")
    assert h_res.get("location_mode") == "GLOBAL_LOCATION_AGNOSTIC"

    # 2. System Config check
    cfg_res = client.get("/api/config").json()
    print("\n[2] SYSTEM CONFIGURATION:")
    print(f"    Default Region: {cfg_res.get('default_region')}")
    print(f"    Data Coverage Mode: {cfg_res.get('data_coverage_mode')}")
    print(f"    Allow Demo Data: {cfg_res.get('allow_demo_data')}")
    assert cfg_res.get("default_region") is None

    # 3. Coverage Report
    cov_res = client.get("/api/coverage").json()
    print("\n[3] DATA COVERAGE REPORT:")
    print(f"    Supported States: {cov_res.get('supported_states')}")
    print(f"    Supported Districts: {cov_res.get('supported_districts')}")
    print(f"    Geographic Bounds: {cov_res.get('supported_geographic_bounds')}")

    # 4. Database Readiness Diagnostics
    db_res = client.get("/api/debug/database-readiness").json()
    print("\n[4] DATABASE READINESS DIAGNOSTICS:")
    print(f"    Total Habitations: {db_res.get('total_habitations')}")
    print(f"    Total Relocation Sites: {db_res.get('total_relocation_sites')}")
    print(f"    Sites with Valid Coords: {db_res.get('sites_with_valid_coordinates')} ({db_res.get('percentage_valid_coordinates')}%)")
    print(f"    Safe Sites: {db_res.get('sites_marked_safe')}, Unsafe Sites: {db_res.get('sites_marked_unsafe')}")
    print(f"    Provenance Coverage: {db_res.get('percentage_provenance')}%")

    # 5. In-Coverage Location Risk & Relocation Analysis (Raini Village)
    reloc_in = client.post("/api/location/relocation-options", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "population_to_relocate": 1250,
        "habitation_id": "HAB-001",
        "habitation_name": "Raini Village"
    }).json()
    print("\n[5] IN-COVERAGE RELOCATION (Raini Village):")
    print(f"    Status: {reloc_in.get('status')} | Decision Status: {reloc_in.get('decision_status')}")
    print(f"    Recommended Site: {reloc_in.get('recommended_site', {}).get('name') if reloc_in.get('recommended_site') else 'None'}")
    print(f"    Distance Method: {reloc_in.get('search_parameters', {}).get('distance_method')}")
    assert reloc_in.get("status") in ["FEASIBLE_COMPLETE", "FEASIBLE_PARTIAL"]
    assert "structured_explanation" in reloc_in

    # 6. Out-of-Coverage Location Check (Hyderabad / Telangana)
    reloc_out = client.post("/api/location/relocation-options", json={
        "latitude": 17.3850,
        "longitude": 78.4867,
        "population_to_relocate": 500
    }).json()
    print("\n[6] OUT-OF-COVERAGE RELOCATION (Hyderabad):")
    print(f"    Status: {reloc_out.get('status')}")
    print(f"    Message: {reloc_out.get('message')}")
    print(f"    Missing Data: {reloc_out.get('missing_data')}")
    print(f"    Next Action: {reloc_out.get('next_action')}")
    assert reloc_out.get("status") == "insufficient_data"
    assert reloc_out.get("recommended_site") is None

    # 7. ML Retraining & Model Cards
    models_res = client.get("/api/ml/models").json()
    print("\n[7] ML MODEL CARDS:")
    print(f"    Active Production Model: {models_res[0].get('model_name')} (v{models_res[0].get('model_version')})")
    print(f"    F1 Score: {models_res[0].get('evaluation_metrics', {}).get('f1_score')}")

    # Retraining rejection on unvalidated data
    retrain_reject = client.post("/api/ml/training-runs", json={
        "dataset_version": "DRAFT",
        "labeled_samples_count": 5,
        "has_verified_ground_truth": False
    }).json()
    print("\n[8] ML RETRAINING UNVALIDATED REJECTION:")
    print(f"    Status: {retrain_reject.get('status')}")
    print(f"    Message: {retrain_reject.get('message')}")
    assert retrain_reject.get("status") == "INSUFFICIENT_DATA"

    print("\n" + "=" * 70)
    print("ALL DIRECT VERIFICATION CHECKS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_direct_verification()
