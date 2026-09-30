# Kshema

## Disaster Risk & Safe Relocation Intelligence

**Smart India Hackathon 2026 — Problem Statement 26191 (NDRF / Ministry of Home Affairs)**

Kshema (क्षेम — meaning well-being, safety, welfare, and protection) is a professional, evidence-based GIS decision-support platform designed for operational use by the National Disaster Response Force (NDRF) and State Disaster Management Authorities (SDMA). It automates multi-hazard risk assessment, dynamic Red-Zone identification, carrying capacity analysis, vulnerability-based prioritization, and multi-site relocation optimization across India.

---

## Technical Audit & Risk Engine Highlights

- **Kshema Multi-Hazard Risk Index v2.0**: Nationwide spatial risk assessment combining global NASA SRTM 30m DEM elevation & slope, Bureau of Indian Standards (IS 1893:2016) seismic zones, coastal surge indexes, and Open-Meteo / IMD live weather telemetry.
- **Traceable Location Assessment**: Accepts arbitrary latitude & longitude selection via map click, geocoding search, or GPS, calculating location-sensitive risk without hardcoded default scores.
- **Developer Debug Mode**: Toggleable developer debug panel in frontend and API (`?debug=true`) providing raw provider data, normalized factor scores, configured vs effective weights, coverage %, and confidence calculations.
- **Transparent Data Provenance**: Explicit status badges (`LIVE`, `HISTORICAL`, `MODEL-DERIVED`, `AVAILABLE`, `UNAVAILABLE`, `OUT_OF_COVERAGE`) ensure data source integrity.

---

## Quick Start & Running Commands

### 1. Environment Configuration

Copy or edit environment variables as needed:
```env
IMD_API_BASE_URL=
IMD_API_KEY=
MOSDAC_API_KEY=
MOSDAC_ENDPOINT=
```
*Note*: When external credentials are absent, the system transparently utilizes Open-Meteo live weather telemetry and displays truthful source statuses (`UNAVAILABLE` / `FALLBACK`).

### 2. Run Automated Pytest Suite

To run backend unit tests, location sensitivity tests, and the 10-location regression suite:

```bash
.\venv\Scripts\python.exe -m pytest backend/app/tests -vv
```

### 3. Start Backend API Server

To start the FastAPI backend server on `http://127.0.0.1:8010`:

```bash
# From root directory
.\venv\Scripts\python.exe backend/run.py
```

API Documentation (Swagger UI) is available at: `http://127.0.0.1:8010/docs`

### 4. Start Frontend UI Application

To start the React / Vite frontend development server on `http://127.0.0.1:5173`:

```bash
cd frontend
npm run dev
```

Access the UI in your browser at: `http://127.0.0.1:5173`

### 5. Run System Verification Scripts

```bash
# Verify location repair & spatial analysis
.\venv\Scripts\python.exe verify_location_repair_full.py

# Verify GIS basemap & risk maps
.\venv\Scripts\python.exe verify_gis_map.py

# Verify final polish & relocation safety
.\venv\Scripts\python.exe verify_final_polish.py

# Verify all 21 API endpoints
.\venv\Scripts\python.exe verify_api.py

# Verify full system (Backend + Frontend SPA routes)
.\venv\Scripts\python.exe verify_full_system.py
```

---

## Project Structure

```
SIH/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/             # FastAPI REST endpoints
│   │   ├── core/            # Configuration & Settings
│   │   ├── data_providers/  # Bhuvan, IMD, MOSDAC, Open-Meteo, OSM providers
│   │   ├── models/          # Pydantic Schemas
│   │   ├── services/        # Hazard, Risk, Capacity & Relocation Engines
│   │   └── tests/           # Pytest unit & adversarial tests
│   ├── pytest.ini           # Backend pytest config
│   ├── run.py               # Backend entrypoint runner (Port 8010)
│   └── requirements.txt     # Python dependencies
├── docs/                    # Architecture & Risk Audit documentation
├── frontend/
│   ├── src/                 # React UI components, pages & services
│   ├── package.json
│   └── vite.config.ts
├── .env.example             # Environment variable template
├── .gitignore               # Ignored build, cache, and secret patterns
├── pytest.ini               # Root pytest configuration
├── verify_api.py            # API endpoint verification script
├── verify_full_system.py    # Full system verification script
└── README.md
```

---

## How to Understand Risk Outputs & Disclaimers

- **Risk Score Range**: 0 to 100 (LOW: 0–20, MODERATE: 20.1–40, HIGH: 40.1–60, EXTREMELY HIGH: 60.1–80, CRITICAL: >80).
- **Decision-Support Prototype Index**: Kshema scores are multi-hazard decision-support heuristics designed to prioritize field inspections and emergency planning. They are not legal or official statutory land classifications.
- **Audit Documentation**: Detailed math formulas, layer coverage rules, and diagnostic findings are documented in [`docs/RISK_ENGINE_AUDIT_REPORT.md`](docs/RISK_ENGINE_AUDIT_REPORT.md).
