# IMPLEMENTATION PLAN — KSHEMA
**Disaster Risk & Safe Relocation Intelligence**
*SIH 2026 Problem Statement 26191 (NDRF / Ministry of Home Affairs)*

---

## 1. System Architecture & Pilot Region Overview

Kshema is structured as an enterprise-grade multi-tier GIS decision-support system:
- **Pilot Region**: Chamoli District, Uttarakhand (Himalayan multi-hazard prone area with real mountain settlement topology, rivers, roads, and emergency facilities).
- **Core Workflow**: DETECT → ASSESS → FIND → CAPACITY → PRIORITIZE → ACT
- **Database Layer**: PostgreSQL + PostGIS (with SQLite + GeoPandas/Shapely spatial engine fallback).
- **Backend Layer**: Python FastAPI, Pydantic v2, SQLAlchemy, GeoPandas, Shapely, SciPy, Scikit-learn.
- **Frontend Layer**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet/MapLibre GL JS, Recharts, Lucide Icons.

---

## 2. Proposed Phased Changes

### Phase 1: Workspace & Directory Structure Setup
- [NEW] Backend project structure in `backend/`:
  - `app/core/` (config, database, security)
  - `app/models/` (SQLAlchemy ORM models with spatial attributes)
  - `app/schemas/` (Pydantic validation schemas)
  - `app/gis/` (GeoPandas spatial indexing, buffer generation, spatial queries)
  - `app/services/` (hazard, vulnerability, risk, redzone, capacity, relocation, simulation engines)
  - `app/api/` (REST route handlers)
  - `app/tests/` (Pytest test suite & adversarial regression suite)
- [NEW] Frontend project structure in `frontend/`:
  - React + Vite + TypeScript application with Tailwind CSS and Lucide icons.
  - Interactive map integration (Leaflet with custom dark/light tiles, vector markers, red-zone layer styling, relocation lines).
  - Navigation: Sidebar, top status bar, command panels, mobile drawer.

### Phase 2: GIS Seed Data Engine for Chamoli District
- Generate synthetic/coherent spatial datasets for Chamoli District with complete metadata:
  - **Habitations**: 25+ villages/settlements (e.g., Raini, Joshimath, Helang, Tapovan, Pipalkoti, Pandukeshwar, Mana) with population demographics (children %, elderly %, households, housing score).
  - **Hazard Layers**: Landslide susceptibility polygons, Flash flood buffer zones, River networks (Alaknanda, Dhauliganga, Rishi Ganga), Slope grid vectors.
  - **Relocation Candidates**: 10+ candidate sites (Government Polytechnic Ground, Gopeshwar Relief Campus, Gauchar Airstrip Field, Chamoli Sports Complex, etc.) with physical area, water supply rate, hospital access distance, school distance, road access.
  - **Infrastructure**: Roads, Emergency Response Centers, District Hospitals, Primary Health Centers, Schools.
  - **Metadata**: Dataset source (`CONNECTED`, `HISTORICAL`, `DEMO`), timestamp, spatial resolution.

### Phase 3: Core Computational & Optimization Engines
1. **Hazard & Red-Zone Engine**:
   - Computes normalized multi-hazard risk (0–100) using prototype configurable weights.
   - Generates Red-Zone spatial multi-polygons via spatial intersection and hazard buffering.
   - Computes evidence confidence (HIGH, MEDIUM, LOW) based on layer freshness and resolution.
2. **Population Vulnerability & Priority Engine**:
   - Calculates vulnerability score based on demographics, medical distance, and housing structure.
   - Calculates relocation priority score (0–100) and maps to urgency: `IMMEDIATE`, `SHORT-TERM`, `MEDIUM-TERM`, `MONITOR`.
3. **Multi-Constraint Carrying Capacity Engine**:
   - Evaluates 7 independent capacity components: Land, Water, Sanitation, Healthcare, Education, Road Access, Emergency.
   - Computes `effective_capacity = MIN(components)` and identifies the exact resource bottleneck.
4. **Relocation Optimization Engine**:
   - Implements multi-site constrained allocation algorithm.
   - Enforces hard safety exclusions (rejects any candidate site with high landslide/flood risk).
   - Handles `NO_FEASIBLE_COMPLETE_RELOCATION` when safe capacity < required population.
   - Computes explainable factor breakdowns ("Why Site A?", "Why not Site B?").
5. **Extreme Rainfall Simulation Engine**:
   - Dynamically recalculates hazard intensity, Red-Zone boundaries, risk scores, priority levels, and relocation plans when scenario multipliers are adjusted.

### Phase 4: REST API Implementation
- Endpoints:
  - `GET /api/dashboard`: Summary KPIs, risk distribution, capacity summary.
  - `GET /api/habitations`: Filterable list of habitations with risk and priority.
  - `GET /api/habitations/{id}`: Detailed habitation intelligence & risk factor breakdown.
  - `GET /api/risk-map`: Vector GeoJSON for habitations, Red Zones, rivers, roads.
  - `GET /api/relocation-sites`: List of candidate relocation sites with capacity & bottleneck analysis.
  - `POST /api/relocation-plan`: Generates multi-site relocation plan for selected habitation(s).
  - `POST /api/simulate/extreme-rainfall`: Runs dynamic simulation and returns BEFORE vs. AFTER metrics.
  - `GET /api/data-sources`: Data provenance, freshness, and connectivity status.
  - `GET /api/alerts`: System alerts and high-risk notifications.
  - `POST /api/field-reports`: Mobile field report submission.
  - `GET /api/health`: Health status.

### Phase 5: GIS Command Center Frontend Application
- Build 15 fully functional views:
  1. `/dashboard`: Key metrics, risk breakdown charts, relocation summary.
  2. `/map`: Full-screen GIS command map with layer control, filters, popups, and relocation route lines.
  3. `/habitations`: Table and card view of habitations with search & filtering.
  4. `/habitations/:id`: Deep-dive habitation detail with "Why is this risky?" contribution chart.
  5. `/risk-analysis`: Multi-hazard weight configuration and risk curve visualization.
  6. `/relocation-sites`: Site capacity overview, effective capacity gauge, bottleneck metrics.
  7. `/capacity`: Carrying capacity matrix across 7 infrastructure components.
  8. `/relocation-planner`: Interactive allocation tool with multi-site split support and authority approval buttons.
  9. `/ai-insights`: Explainable decision log and evidence confidence inspector.
  10. `/simulation`: Extreme rainfall simulation controls with interactive BEFORE -> AFTER comparison.
  11. `/alerts`: Real-time hazard alerts & capacity warnings.
  12. `/field-mode`: Mobile-optimized field report & emergency briefing view.
  13. `/reports`: Summary report view with CSV export capability.
  14. `/data-sources`: Provenance table (Source, Resolution, Freshness, Status).
  15. `/audit-logs`: System audit trail of relocation recommendations.

---

## 3. Verification & Testing Plan

### Automated Tests
- Pytest suite in `backend/app/tests/`:
  - `test_risk_engine.py`: Normalization, weight clamping, missing data fallback.
  - `test_vulnerability.py`: Demographic weighting and priority mapping.
  - `test_capacity.py`: Bottleneck detection and component minimum logic.
  - `test_adversarial_relocation.py`: **AT-OPT-01** (Unsafe candidate rejection when safe capacity is insufficient).
  - `test_simulation.py`: Dynamic recalculation under 2.5x rainfall scenario.

### Browser Verification
- Use Browser Subagent tool to test:
  1. Desktop Command Center rendering and map layer toggling.
  2. Clicking critical habitation -> inspecting explainable risk breakdown.
  3. Generating relocation plan -> verifying safe capacity constraints.
  4. Running 2.5x Extreme Rainfall Simulation -> checking BEFORE vs. AFTER diffs.
  5. Navigating to Data Sources, Field Officer Mode, and Reports pages.
