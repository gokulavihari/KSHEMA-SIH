# ACCEPTANCE & ADVERSARIAL TEST SUITE — AASHRAY
**AI-Assisted Hazard Assessment, Safe Habitat & Relocation System**
*SIH 2026 Problem Statement 26191*

---

## 1. Automated Acceptance Tests Checklist

### 1.1 Hazard & Risk Engine Tests
- [ ] **AT-RISK-01**: Normalization test — verify all hazard layer inputs clamp strictly between `0.0` and `100.0`.
- [ ] **AT-RISK-02**: Extreme rainfall response — verify increasing rainfall intensity from 1.0x to 2.5x increases risk score and expands Red-Zone polygons empirically.
- [ ] **AT-RISK-03**: Missing hazard data handling — verify NULL inputs default to documented missing data indicators and degrade evidence score from HIGH to MEDIUM/LOW rather than raising 500 errors.

### 1.2 Vulnerability & Prioritization Tests
- [ ] **AT-VULN-01**: High vulnerability weighting — habitations with high proportion of children/elderly and zero medical access receive higher vulnerability scores.
- [ ] **AT-VULN-02**: Priority classification boundaries — score 85 -> `IMMEDIATE`, score 65 -> `SHORT-TERM`, score 45 -> `MEDIUM-TERM`, score 25 -> `MONITOR`.

### 1.3 Carrying Capacity Engine Tests
- [ ] **AT-CAP-01**: Multi-component bottleneck detection — Site with land area capacity 3000 but hospital capacity 1200 yields effective capacity 1200 and bottleneck `"Healthcare Access"`.
- [ ] **AT-CAP-02**: Utilization percentage calculation — 600 allocated out of 1200 effective capacity yields 50.0% utilization.
- [ ] **AT-CAP-03**: Zero capacity site handling — Site with water capacity 0 returns effective capacity 0.

### 1.4 Relocation Optimization & Adversarial Safety Tests
- [ ] **AT-OPT-01 (Critical Adversarial Safety Test)**:
  - Input: Population 5,000.
  - Candidate Sites:
    - Site A: Effective Capacity = 2,000 (SAFE)
    - Site B: Effective Capacity = 1,500 (SAFE)
    - Site C: Effective Capacity = 10,000 (UNSAFE — High Flood Hazard)
  - **Expected Outcome**: Allocation to Site A = 2,000, Site B = 1,500, Site C = 0. Unallocated Population = 1,500. Status = `NO_FEASIBLE_COMPLETE_RELOCATION`. System MUST NEVER allocate any population to Site C despite its large capacity.
- [ ] **AT-OPT-02**: Multi-site split allocation — Population of 2,850 split across Site A (2,000 capacity) and Site B (850 capacity).
- [ ] **AT-OPT-03**: Exact capacity match — Population of 1,500 allocated 100% to Site A (1,500 capacity), utilization = 100%.

### 1.5 Extreme Rainfall Simulation Tests
- [ ] **AT-SIM-01**: Scenario trigger — POST request to `/api/simulate/extreme-rainfall` with multiplier `2.0` recalculates risk, updates Red-Zone GeoJSON, re-prioritizes habitations, and re-runs relocation optimization without crashing backend.
- [ ] **AT-SIM-02**: BEFORE vs AFTER comparison output — API returns structured delta showing `before` and `after` metrics for population at risk, red zone area, and critical habitations.

---

## 2. End-to-End Browser Acceptance Flow

```text
1. Open Dashboard -> Verify top KPI cards (Population at Risk, Critical Habitations, Safe Capacity).
2. Navigate to GIS Command Center Map -> Toggle Red-Zone overlays, verify render.
3. Click Critical Habitation (e.g., Raini Village) -> Inspect Risk & Vulnerability breakdown in right panel.
4. Click "Why is this risky?" -> View factor contributions (Landslide 32%, Extreme Rainfall 28%, Slope 20%).
5. Click "Find Safe Relocation Sites" -> View candidates with safety scores and capacity metrics.
6. Click "Generate Relocation Plan" -> View multi-site allocation and capacity utilization gauge.
7. Trigger "Extreme Rainfall Scenario (2.5x)" -> Observe dynamic update to map layers, Red Zones, and relocation plan.
```
