# AASHRAY Phase 4 & Phase 5 Final Engineering Report

**Project:** AASHRAY — AI-Assisted Hazard Assessment, Safe Habitat & Relocation System  
**SIH Problem Statement:** 26191  
**Completion Date:** September 2026  
**Status:** Completed & Fully Tested  

---

## 1. Risk Assessment Architecture & Formula

AASHRAY computes transparent, coverage-aware risk scores ($0.0 - 100.0$) using deterministic mathematical calculations without arbitrary LLM numeric generation.

### Formula Version
`AASHRAY-RISK-v2.1`

### Factor Decomposition & Configured Weights

| Factor Component | Classification | Weight | Data Source |
| :--- | :--- | :--- | :--- |
| `flood_hazard` | Hazard | 0.18 | Hydrographic Flood Vector Overlay |
| `landslide_susceptibility` | Hazard | 0.16 | GSI Landslide Atlas / SRTM Slope |
| `seismic_hazard` | Hazard | 0.12 | Bureau of Indian Standards (IS 1893:2016) |
| `extreme_rainfall` | Hazard | 0.10 | IMD Telemetry / Open-Meteo AWS |
| `slope_severity` | Hazard | 0.08 | NASA SRTM 30m Global DEM v3 |
| `river_proximity` | Hazard | 0.08 | Himalayan Drainage Vector Overlay |
| `historical_disasters` | Hazard | 0.08 | State Disaster Occurrence Registry |
| `coastal_hazard` | Hazard | 0.08 | INCOIS / NHO Surge Index (Inland = N/A) |
| `population_exposure` | Exposure | 0.06 | Census 2011 / Sector Habitation Baseline |
| `infrastructure_vulnerability` | Vulnerability | 0.06 | Structural Housing Baseline Rating |

*Note:* When a layer (e.g., coastal surge for inland regions) is out of coverage, weights are dynamically renormalized over available evidence factors so missing data never translates into false zero risk or false high risk.

### Vulnerability Score Formula
$$\text{VulnerabilityScore} = 0.40 \times \text{MedicalDistancePenalty} + 0.35 \times \text{StructuralVulnerability} + 0.25 \times \text{SlopeGradientExposure}$$

### Classification Thresholds

- **LOW:** $0.0 - 20.0$
- **MODERATE:** $20.1 - 40.0$
- **HIGH:** $40.1 - 60.0$
- **VERY HIGH:** $60.1 - 80.0$
- **CRITICAL:** $80.1 - 100.0$

---

## 2. Validation Metrics Rework

Instead of calling evidence coverage "accuracy" or using arbitrary bonuses, Phase 4 separates data quality and validation into honest, evidence-based metrics:

1. **`evidence_coverage_percent`**: Percentage of configured layer weight available at target coordinate (e.g., $85.0\%$).
2. **`data_quality_score`**: Weighted aggregate of GPS location accuracy ($25\%$), live weather link status ($40\%$), and DEM spatial resolution ($35\%$).
3. **`model_validation_score`**: Set strictly to `None` / `null` because no independent empirical historical disaster occurrence dataset model validation has been claimed.
4. **`risk_uncertainty`**: Derived uncertainty band (`LOW`, `MEDIUM`, or `HIGH`).
5. **`assessment_confidence`**: Derived metric ($0 - 100$) reflecting data quality and evidence coverage.
6. **`validation_status`**: Categorized status (`STRICT_VERIFIED`, `RESEARCH_VERIFIED`, `ASSESSED_PARTIAL`, or `INSUFFICIENT_DATA`).

---

## 3. Relocation Optimizer & Objective Function

### Dynamic Location Context
The optimizer accepts any WGS84 coordinate (`latitude`, `longitude`) along with selected habitation metadata and population to relocate. Radius expands dynamically ($10\text{ km} \rightarrow 25\text{ km} \rightarrow 50\text{ km}$).

### Hard Safety Constraints
A shelter is strictly **REJECTED** if:
1. It is inside an active hazard exclusion zone (`is_safe == False` or `safety_score < 50.0`).
2. It violates the mandatory **100m River Proximity Inundation Exclusion Buffer** (`river_distance_m < 100m`).
3. Remaining effective capacity is $\le 0$.
4. Coordinates or identity are invalid.
5. Search radius exceeds $50\text{ km}$.
6. Capacity is unverified in `STRICT_VERIFIED` mode (`category == "POTENTIAL_CANDIDATE"` or `capacity_verified == False`).

### Objective Ranking Function
$$\text{ObjectiveScore} = 0.40 \times \text{SafetyScore} + 0.25 \times \text{SuitabilityScore} + 0.20 \times \text{ProximityScore} + 0.15 \times \text{CapacityMarginScore}$$

Where:
- $\text{ProximityScore} = \max(0, 100 - \text{Distance\_km} \times 2.0)$
- $\text{CapacityMarginScore} = \min(100, (\text{RemainingCapacity} / \text{Population}) \times 100)$

### Geodesic Distance & Travel Time
- **`straight_line_dist_km`**: Computed using exact Geodesic Haversine formula.
- **`road_dist_km`**: Computed via road routing API or estimated with mountain terrain winding factor ($1.40\times$).
- **`route_distance_status`**: Explicitly labeled as `ESTIMATED_TERRAIN_WINDING` or `VERIFIED_ROAD_ROUTING`. Travel time is never invented.

---

## 4. Population Allocation & Honest Failure Responses

- **Complete Allocation (`FEASIBLE_COMPLETE`)**: Total required population accommodated by safe shelter.
- **Partial Allocation (`FEASIBLE_PARTIAL`)**: Population allocated up to verified capacity limit; remaining shown as `unallocated_population`.
- **Honest No Site Found (`NO_VERIFIED_SITE_FOUND`)**: When zero candidate shelters pass hard safety rules, the system returns `NO_VERIFIED_SITE_FOUND` along with a full audit log detailing candidate rejection reasons (hazard, river buffer, capacity, search radius).

---

## 5. Direct Dashboard UI Integration

The main dashboard screen (`Dashboard.tsx`) directly renders the `RelocationDecisionCard` component displaying all 26 required facts without hiding recommendations behind links:
1. Current Habitation Name
2. Current Coordinates
3. Target Population
4. Risk Score
5. Risk Level
6. Relocation Trigger Reason
7. Main Hazard Contributors
8. Vulnerability Contributors
9. Selected Shelter Name
10. Shelter Address
11. Shelter Coordinates
12. Straight-Line Distance
13. Estimated Road Distance
14. Estimated Travel Time
15. Verified Carrying Capacity & Resource Bottleneck
16. Allocated Population
17. Remaining Capacity
18. Unallocated Population
19. Why Selected (Objective Score Breakdown & Safety Criteria)
20. Rejected Alternatives Log & Audit Reasons
21. Evidence Coverage %
22. Data Quality Score
23. Data Status / Model Labels
24. Provenance Summary
25. Limitations Statement
26. Mandatory Human Approval Requirement Notice

---

## 6. Files Changed & Testing Summary

### Modified & Created Files
- `backend/app/services/risk_service.py` (Transparent risk formula & validation score separation)
- `backend/app/services/relocation_service.py` (Dynamic relocation optimizer & hard safety exclusions)
- `backend/app/data_providers/shelter_provider.py` (Nationwide shelter candidate search & classification)
- `frontend/src/components/RelocationDecisionCard.tsx` (Direct 26-fact dashboard result component)
- `frontend/src/pages/Dashboard.tsx` (Direct relocation decision card integration)
- `frontend/src/types/index.ts` (TypeScript interfaces for risk & relocation responses)
- `backend/app/tests/test_phase4_5_risk_and_relocation.py` (Comprehensive unit tests)
- `docs/PHASE_4_5_DATA_AUDIT.md` (Data provider audit matrix)
- `docs/PHASE_4_5_FINAL_REPORT.md` (This document)

### Test Execution Results
- **Backend Pytest Suite:** `118 passed in 17.76s` ($0$ failures)
- **Frontend Build (`npm run build`):** Clean compilation, $0$ errors

---

## 7. Known Limitations & Demo Instructions

### Limitations
1. Risk score is a deterministic heuristic for decision support — not an official statutory government hazard classification.
2. Mountain road travel times use a $1.40\times$ winding factor estimate when live OSRM routing API is offline.
3. Official shelter dispatch requires District Disaster Management Authority (DDMA) human sign-off.

### Demo Instructions
1. Run backend server: `venv\Scripts\python.exe -m uvicorn app.main:app --port 8010`
2. Run frontend app: `npm run dev` in `frontend/`
3. Open browser to `http://localhost:5173/`
4. Select Raini Village, Kullu, or any custom GPS location using the Location Header bar.
5. Review the **RELOCATION RECOMMENDATION & ASSESSMENT** card directly on the main dashboard view.
