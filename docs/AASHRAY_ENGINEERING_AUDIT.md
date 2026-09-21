# AASHRAY — Comprehensive Engineering Audit & Root Cause Analysis

**Project Name:** AASHRAY — AI-Assisted Hazard Assessment, Safe Habitat & Relocation System  
**SIH Problem Statement:** 26191 — Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations  
**Audit Date:** September 2026  
**Auditor:** Lead System Architect, Backend Architect, GIS Scientist, ML & Security Engineer  

---

## 1. Existing Architecture Summary

AASHRAY is a full-stack disaster decision-support prototype system:
- **Backend:** Python FastAPI (`backend/app/main.py`), running Uvicorn on port 8010.
- **Frontend:** React + TypeScript + Vite (`frontend/src`), styled with Tailwind CSS, Lucide icons, Leaflet GIS maps.
- **GIS / Spatial Engine:** NASA SRTM 30m DEM (elevation & slope), BIS IS 1893:2016 seismic zoning engine, Coastal surge index, OpenStreetMap (Overpass API) spatial infrastructure index, Haversine geodesic distance & winding factor road routing.
- **Risk Engine:** Multi-factor weighted hazard & exposure engine with dynamic coverage-aware weight renormalization across available layers (`backend/app/services/risk_service.py`).
- **Relocation Engine:** Deterministic carrying-capacity optimizer with safety-first exclusion rules, radius expansion hierarchy (10km -> 25km -> 50km), and transparent rejection auditing (`backend/app/services/relocation_service.py`).

---

## 2. Current Data Flow

```
[User Browser / Device]
       │
       ├── GPS / Search / Map Selection / Preset Selection
       ▼
[LocationContext.tsx] (Frontend State & LocalStorage Persistence)
       │
       ▼  POST /api/location/select or GET /api/risk/assessment
[backend/app/api/routes.py]
       │
       ├──► [location_service.py] (Reverse Geocoding + SRTM DEM + BIS Seismic + OSM Infrastructure)
       │
       ├──► [risk_service.py] (Coverage Evaluation + Renormalized Risk & Vulnerability Scoring)
       │
       └──► [relocation_service.py] (Safety Exclusions + Haversine/Road Distances + Capacity Allocation)
       │
       ▼
[LocationAssessment JSON Response]
       │
       ▼
[Frontend UI] (Dashboard / GIS Map / Relocation Planner)
```

---

## 3. Existing APIs Audit

| Endpoint | Method | Status / Description |
| :--- | :--- | :--- |
| `/api/health` | GET | Health check returning status and service status |
| `/api/location/search` | GET | Geocoding search endpoint via Nominatim/OSM |
| `/api/location/resolve` | POST | Reverse geocoding for coordinates |
| `/api/location/select` | POST | Single source of truth for location selection |
| `/api/risk/assessment` | GET | Core hazard, vulnerability, and risk assessment endpoint |
| `/api/relocation/options` | GET | Location-specific safe site search and capacity allocation |
| `/api/relocation/recommendation` | GET | Primary relocation recommendation payload |
| `/api/relocation/plan` | POST | Detailed relocation planning API |
| `/api/provenance` | GET | Data layer freshness, provider URLs, and verification metadata |
| `/api/audit/logs` | GET | Decision-support audit trail |
| `/api/ml/retrain` | POST | Baseline ML retraining execution endpoint |

---

## 4. Existing Data & Seed Storage

- `backend/app/services/data_seed.py`: Contains 6 core Chamoli pilot village records (`RAW_HABITATIONS`), 7 safe shelter candidates (`RAW_CANDIDATE_SITES`), and disaster history logs.
- Spatial raster elevation data: NASA SRTM 30m DEM accessed via Open-Meteo / Elevation APIs.
- Seismic zones: Bureau of Indian Standards (IS 1893:2016) tabular lookup engine.
- Weather feeds: IMD telemetry + MOSDAC ISRO satellite rainfall.

---

## 5. Root Causes of Observed Issues

### Issue 1: `LOCATION UNAVAILABLE` on Dashboard Header
- **Root Cause:** In `LocationContext.tsx`, `requestGpsLocation` runs on initial mount. If browser GPS fails (or permission is denied on localhost/laptops), `permissionState` is set to `'UNAVAILABLE'`. In `setManualLocation`, `permissionState: locationState.permissionState` was being preserved without resetting `permissionState` to `'GRANTED'`. In `LocationHeader.tsx`, line 29 checked `if (locationState.permissionState === 'UNAVAILABLE') return 'LOCATION UNAVAILABLE'`, causing the header badge to stay stuck on "LOCATION UNAVAILABLE" even when a manual or map coordinate was explicitly chosen!
- **Fix:** Update `setManualLocation` and `LocationContext` to explicitly set `permissionState: 'GRANTED'` when any valid manual, map, search, or preset coordinate is selected. Ensure `LocationHeader` displays `MANUAL LOCATION`, `MAP LOCATION`, or `PRESET LOCATION` based on actual coordinate source.

### Issue 2: `INSUFFICIENT VALIDATION DATA` Warning
- **Root Cause:** In `location_service.py`, spatial layer availability (`has_flood_layer`, `has_landslide_layer`, `has_river_layer`, `has_disaster_history_layer`) was restricted to 3 hardcoded bounding boxes (Chamoli, Kosi, Wayanad). For coordinates outside these boxes, 4 out of 10 risk factors were marked `OUT_OF_COVERAGE`, causing total available weight to drop below the 40% threshold or fail full-evidence requirements, returning `assessment_mode = "INSUFFICIENT_EVIDENCE"`. Furthermore, in `relocation_service.py`, any location >150km from Chamoli triggered `min_dist_to_indexed > 150.0`, returning `status: "insufficient_data"`.
- **Fix:** Expand spatial data providers to cover all locations nationwide in India using SRTM 30m DEM, BIS IS 1893 seismic zones, coastal proximity, OSM river and infrastructure vectors, and a nationwide shelter generator/provider for any coordinate outside the Chamoli pilot dataset.

### Issue 3: `PARTIAL EVIDENCE` / `MODEL-DERIVED` / `LIVE + HISTORICAL + MODEL-DERIVED` Statuses
- **Root Cause:** In `risk_service.py`, composite data status strings were hardcoded to `"LIVE + HISTORICAL + MODEL-DERIVED"` without verifying if live weather was active, and factor provenance was partially static.
- **Fix:** Create a clean, transparent Data Quality & Coverage Service with strict mode controls (`STRICT_VERIFIED`, `RESEARCH`, `DEMO`), explicit provenance tracking for every factor, and accurate status labels.

### Issue 4: Primary Relocation Result Hidden Behind `VIEW FULL SAFE RELOCATION PLAN`
- **Root Cause:** On `Dashboard.tsx`, when relocation review was recommended, the dashboard rendered only a brief advisory card with a link to `/relocation-planner`, obscuring the primary relocation decision.
- **Fix:** Direct UX redesign of `Dashboard.tsx` to embed a full `RelocationDecisionCard` directly on the main dashboard page whenever relocation is recommended or assessed.

### Issue 5: Missing Detailed Explanation of Relocation Recommendation on Dashboard
- **Root Cause:** The dashboard lacked a single, transparent card showing all 15 required relocation facts directly (Why recommended, triggering hazards, selected shelter name/address/coords, selection reasons, geodesic/road distances, shelter capacity vs required vs allocated vs remaining population, safety constraints, data sources, confidence status, and human review warnings).
- **Fix:** Build `RelocationDecisionCard` and `SelectedShelterCard` with complete transparency and direct display on the dashboard.

---

## 6. Implementation Plan Matrix (Phases 1 - 12)

1. **Phase 1 (Location System):** Multi-mode location selection state machine (`GPS`, `SEARCH`, `MAP`, `PRESET`, `MANUAL`). Coordinate validation (WGS84 EPSG:4326 bounds). Persistent location state synchronization.
2. **Phase 2 (Data Providers):** Standardized `BaseProvider` interface (`fetch`, `validate`, `normalize`, `provenance`). Implement providers for Weather (IMD/Open-Meteo), Elevation (SRTM), Seismic (BIS IS 1893), OSM Infrastructure/Shelters.
3. **Phase 3 (Coverage & Validation):** Implement Data Coverage & Validation Service (`STRICT_VERIFIED`, `RESEARCH`, `DEMO`).
4. **Phase 4 (Hazard Engine Audit):** Deterministic risk formula \(Risk = f(Hazard, Exposure, Vulnerability, Evidence Quality)\). Explicit, versioned weights.
5. **Phase 5 (Relocation Optimizer):** Transparent, multi-constraint solver with capacity constraint enforcement, safety exclusion zones, geodesic and road distance, unallocated population accounting, and rejected alternative auditing.
6. **Phase 6 & 7 (Dashboard UX):** Direct relocation result embedded on `Dashboard.tsx` with complete visual components.
7. **Phase 8 (API Contracts & Schemas):** Pydantic schemas validation and strict HTTP error responses.
8. **Phase 9 (ML Engine & Model Validation):** Documented deterministic ML baseline with feature normalization and reproducible evaluation metrics.
9. **Phase 10 (Demo Dataset):** Labeled, versioned demonstration dataset with local fixtures.
10. **Phase 11 (Testing & Verification):** Automated pytest suite and end-to-end verification scripts.
11. **Phase 12 (Final QA & Audit):** Final report generation in `docs/AASHRAY_FINAL_QA_REPORT.md`.
