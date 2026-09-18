# ARCHITECTURE SPECIFICATION — AASHRAY
**AI-Assisted Hazard Assessment, Safe Habitat & Relocation System**
*SIH 2026 Problem Statement 26191 (NDRF / Ministry of Home Affairs)*

---

## 1. High-Level System Architecture

```text
                               ┌───────────────────────────────────────────┐
                               │               DATA SOURCES                │
                               │ Static  |  Historical  |  Dynamic / API   │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │           DATA INGESTION LAYER            │
                               │  Adapters (Bhuvan, MOSDAC, Census, DEM)   │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │     POSTGRESQL / POSTGIS / GEOPANDAS      │
                               │  Spatial Indexes, Vector layers, Features │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │             CORE GIS ENGINES              │
                               │  ┌─────────────────────────────────────┐  │
                               │  │ 1. Hazard Engine (Multi-hazard)     │  │
                               │  │ 2. Risk & Red-Zone Engine           │  │
                               │  │ 3. Vulnerability Engine             │  │
                               │  │ 4. Safe-Site Candidate Generator    │  │
                               │  │ 5. Carrying Capacity Engine         │  │
                               │  │ 6. Relocation Optimizer (Linear/LP) │  │
                               │  │ 7. Extreme Rainfall Simulator       │  │
                               │  └─────────────────────────────────────┘  │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │              FASTAPI BACKEND              │
                               │  REST Endpoints, JSON/GeoJSON Serialization│
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │         REACT GIS COMMAND CENTER          │
                               │ MapLibre/Leaflet, Recharts, Lucide, Panels│
                               └───────────────────────────────────────────┘
```

---

## 2. Pilot Region Selection: Chamoli District, Uttarakhand

**Justification for Chamoli District as Pilot Region:**
1. **Multi-Hazard Vulnerability**: Chamoli is subject to flash flooding (e.g., Alaknanda/Dhauliganga rivers), steep terrain landslides, cloudbursts, and extreme rainfall events.
2. **Geospatial & Settlement Realism**: Features distinct valleys, habitations situated on steep slopes, fragile access routes, and clear candidate safe sites (e.g., higher altitude flat relief campuses, stadium grounds, government polytechnic grounds).
3. **Operational Relevance for NDRF/SDMA**: Represents classic Himalayan disaster mitigation scenarios requiring immediate vs. medium-term relocation planning.

---

## 3. Data Strategy & Data Provider Pattern

Every dataset implements a strict status metadata interface:

```python
class DatasetStatus(str, Enum):
    CONNECTED = "CONNECTED"
    HISTORICAL = "HISTORICAL"
    DEMO = "DEMO"
    SIMULATED = "SIMULATED"
    UNAVAILABLE = "UNAVAILABLE"
```

### Provider Architecture:
- `DataProvider` base interface with standard data contracts (`get_rainfall()`, `get_hazard_layers()`, `get_habitations()`, `get_infrastructure()`).
- `LiveBhuvanMosdacProvider`: Connects to ISRO Bhuvan / MOSDAC WMS/WFS or REST endpoints if API keys exist.
- `HistoricalCensusProvider`: Integrates Census 2011 / State Disaster Management historical event databases.
- `DemonstrationProvider`: High-resolution coherent geospatial dataset crafted for Chamoli District when external APIs are unconfigured.

---

## 4. Analytical Engines & Core Algorithms

### 4.1 Hazard Engine & Red-Zone Polygon Generation
- **Component Weights**:
  - Flood Hazard: `0.20`
  - Landslide Susceptibility: `0.18`
  - Extreme Rainfall: `0.12`
  - Slope Severity: `0.10`
  - River Proximity: `0.08`
  - Historical Disasters: `0.10`
  - Population Exposure: `0.08`
  - Infrastructure Vulnerability: `0.07`
  - Accessibility Penalty: `0.07`
- **Red-Zone Logic**: Spatial buffer intersection of areas where combined hazard intensity exceeds `CRITICAL` thresholds (>80/100). Output as distinct multi-polygon GeoJSON geometries.

### 4.2 Population Vulnerability & Priority Engine
- Priority Formula:
  $$\text{Priority} = 0.40 \cdot \text{Risk} + 0.25 \cdot \text{Vulnerability} + 0.15 \cdot \text{ExposedPop} + 0.10 \cdot \text{DisasterHistory} + 0.10 \cdot \text{AccessPenalty}$$
- Urgency Classification:
  - `80–100`: **IMMEDIATE**
  - `60–79`: **SHORT-TERM**
  - `40–59`: **MEDIUM-TERM**
  - `<40`: **MONITOR**

### 4.3 Carrying Capacity Engine
- Evaluates 7 independent infrastructure capacities ($C_1 \dots C_7$):
  $$C_{\text{effective}} = \min(C_{\text{land}}, C_{\text{water}}, C_{\text{sanitation}}, C_{\text{healthcare}}, C_{\text{education}}, C_{\text{road}}, C_{\text{emergency}})$$
- Critical Bottleneck is identified as $\arg\min_i(C_i)$.

### 4.4 Relocation Optimization Algorithm
- Objective Function:
  $$\min \sum_{i \in H} \sum_{j \in S} x_{ij} \cdot \left( d_{ij} + \omega_{\text{hazard}} \cdot \text{Hazard}_j + \omega_{\text{cost}} \cdot \text{Burden}_j \right)$$
- Hard Constraints:
  1. $x_{ij} \ge 0 \quad \forall i, j$
  2. $\sum_{i} x_{ij} \le C_{\text{effective}}(j) \quad \forall j \in S_{\text{safe}}$
  3. $x_{ij} = 0 \quad \forall j \in S_{\text{unsafe}}$
  4. $\sum_{j} x_{ij} \le \text{Population}(i) \quad \forall i \in H$
- Handles **No-Feasible-Solution** cases gracefully when $\sum_{j \in S_{\text{safe}}} C_{\text{effective}}(j) < \text{Population}(i)$.

---

## 5. UI/UX GIS Command Center Design

- **Layout Grid**:
  - Top Bar: Real-time System Status, Emergency Scenario Selector, Data Freshness Indicator, SIH Demo Mode toggle.
  - Left Drawer (320px): Layer Toggles (Red Zones, Landslide, Flood, Roads, Rivers, Emergency Services), Filter Controls, Scenario Sliders.
  - Center Workspace: Full-screen interactive map with interactive spatial vector markers, polygon overlays, and route renderers.
  - Right Intelligence Panel (380px): Dynamic detail tabs for selected Habitation / Safe Site / Relocation Plan with "Why is this risky?" explainability breakdown.
  - Bottom Bar: Risk Legend, Execution Audit Logs, Quick Action Buttons.
