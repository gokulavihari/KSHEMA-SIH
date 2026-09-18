# SYSTEM REQUIREMENTS — AASHRAY
**AI-Assisted Hazard Assessment, Safe Habitat & Relocation System**
*Smart India Hackathon 2026 — Problem Statement 26191 (NDRF / Ministry of Home Affairs)*

---

## 1. System Overview
AASHRAY is a professional, evidence-based GIS decision-support platform designed for operational use by the National Disaster Response Force (NDRF) and State Disaster Management Authorities (SDMAs). It automates multi-hazard risk assessment, dynamic Red-Zone identification, carrying capacity analysis, vulnerability-based prioritization, and multi-site relocation optimization.

---

## 2. Host Environment Inspection & Capabilities

| Subsystem | Inspected Environment Status | Target Production / Prototype Capability |
| :--- | :--- | :--- |
| **OS** | Windows 10/11 x64 | Windows / Linux / Containerized Deployment |
| **Node.js** | v25.8.1 | v18.x – v25.x |
| **npm** | 11.11.0 | 9.x – 11.x |
| **Python** | 3.8.9 (Virtual environment created at `.\venv`) | 3.8+ |
| **Database** | SQLite + GeoPandas/Shapely spatial engine (Fallback) / PostgreSQL + PostGIS | Dual DB Support (PostgreSQL/PostGIS when available, SQLite+GeoPandas engine mode) |
| **GIS Engine** | GeoPandas, Shapely, PyProj, SciPy | Geospatial vector operations, buffer generation, point-in-polygon spatial indexing |
| **Frontend Framework**| React 18+ / Vite / Tailwind CSS / Leaflet & MapLibre GL | Dynamic Command Center GIS Interface |
| **Browser QA** | Browser Subagent Automation Tool | Chrome / Edge / Playwright verification |

---

## 3. Functional Requirements

### 3.1 Q1: Hazard & Red-Zone Detection
- **FR-1.1**: Multi-Hazard Integration (Landslide susceptibility, Flash Flood hazard, Extreme Rainfall, River Proximity, Terrain Slope).
- **FR-1.2**: Transparent Configurable Weights for hazard components (sum = 1.0, normalized 0–100).
- **FR-1.3**: Spatial Red-Zone classification based on multi-hazard spatial intersection and buffer logic.
- **FR-1.4**: Dynamic evidence score calculation based on layer freshness, resolution, and spatial completeness.

### 3.2 Q2: Population Vulnerability Assessment
- **FR-2.1**: Demographic vulnerability modeling (Elderly %, Children %, Housing structural score, Medical access distance, Emergency response time).
- **FR-2.2**: Aggregated population risk scoring without compromising individual PII.
- **FR-2.3**: Relocation priority score (0–100) mapped to operational urgency levels:
  - `80–100`: IMMEDIATE
  - `60–79`: SHORT-TERM
  - `40–59`: MEDIUM-TERM
  - `<40`: MONITOR

### 3.3 Q3: Safe Relocation Site Generation
- **FR-3.1**: Automated identification of candidate safe sites from public facilities, open lands, and designated relief campuses.
- **FR-3.2**: Hard Safety Constraint Exclusion — absolute rejection of any candidate site located within high flood zones, high landslide susceptibility zones, unsafe slopes (>25°), or river buffer zones.
- **FR-3.3**: Multi-criteria suitability scoring (Safety 30%, Capacity 20%, Accessibility 15%, Water 10%, Healthcare 10%, Education 5%, Infrastructure 10%).

### 3.4 Q4: Multi-Constraint Carrying Capacity Assessment
- **FR-4.1**: Compute independent capacities across 7 infrastructure components:
  1. Land Area Capacity
  2. Water Supply Capacity
  3. Sanitation / Waste Capacity
  4. Healthcare Access Capacity
  5. School / Education Capacity
  6. Road Network Access Capacity
  7. Emergency Service Capacity
- **FR-4.2**: Determine `effective_capacity = MIN(capacity_components)`.
- **FR-4.3**: Identify and explicitly display the critical resource bottleneck (e.g., "Bottleneck: Healthcare Access").
- **FR-4.4**: Track real-time utilization percentage (`allocated_population / effective_capacity * 100`).

### 3.5 Q5: Relocation Optimization & Multi-Site Allocation
- **FR-5.1**: Multi-site population allocation when single candidate sites lack total required capacity.
- **FR-5.2**: Strict enforcement of hard constraints: `allocation <= effective_capacity` and zero allocation to unsafe sites.
- **FR-5.3**: No-Feasible-Solution handling: If total safe capacity is less than required population, flag unallocated population, output status `NO_FEASIBLE_COMPLETE_RELOCATION`, and recommend tactical contingency options.
- **FR-5.4**: Explainable recommendation Engine providing explicit "Why this site?" and "Why not Site B?" breakdown.

### 3.6 Extreme Rainfall Scenario Simulation
- **FR-6.1**: Interactive simulation parameters (Rainfall Multiplier 1.0x to 3.0x, Duration, Severity).
- **FR-6.2**: Full recalculation across backend pipeline: Rainfall -> Hazard -> Risk -> Red Zones -> Priority -> Safe-Site Requirements -> Relocation Allocation.
- **FR-6.3**: Side-by-side BEFORE vs. AFTER comparison displaying empirical changes.

---

## 4. Non-Functional & Security Requirements

- **NFR-1 (Auditing)**: Every relocation plan must log model versions, hazard layer timestamps, weight configurations, and exact solver outputs.
- **NFR-2 (Human-in-the-loop)**: All relocation outputs are presented as recommendations requiring official authority sign-off.
- **NFR-3 (Data Transparency)**: Clear labeling of data sources as `CONNECTED`, `HISTORICAL`, or `DEMO`.
- **NFR-4 (Security)**: Strict input validation via Pydantic/Zod, CORS configuration, parameterized DB queries, environment-isolated API secrets.
