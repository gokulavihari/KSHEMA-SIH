# AASHRAY Data Providers & Telemetry Architecture

**System Component:** Data Provider Architecture & Evidence Provenance  
**Version:** 2.0  
**Updated:** September 2026  

---

## 1. Overview

The AASHRAY system relies on a pluggable, multi-tiered data-provider architecture. Every hazard input, terrain gradient, weather observation, and shelter record carries structured provenance metadata to ensure auditability, deterministic reproducibility, and transparency.

Every provider returns a standardized evidence structure:

```json
{
  "value": ...,
  "source_name": "Source Organization",
  "source_url": "https://official-source.org/",
  "source_type": "LIVE | HISTORICAL | MODEL_DERIVED | STATIC_REFERENCE | DEMO",
  "retrieved_at": "ISO-8601 Timestamp",
  "valid_from": "YYYY-MM-DD",
  "valid_to": "YYYY-MM-DD",
  "coverage_status": "FULL_COVERAGE | PARTIAL_COVERAGE | OUT_OF_COVERAGE",
  "verification_status": "VERIFIED_OFFICIAL | VERIFIED_FIELD | UNVERIFIED | DEMO_ONLY",
  "data_quality_score": 0.0 - 100.0,
  "uncertainty": "LOW | MEDIUM | HIGH",
  "limitations": "Description of spatial/temporal limits"
}
```

---

## 2. Supported Data Providers

| Data Layer | Source Organization | API / Dataset Name | Data Type | Refresh Rate | Provenance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Terrain & Elevation** | NASA JPL | SRTM 30m Global DEM v3 | `GEOSPATIAL_RASTER` | Static Reference | `STATIC_REFERENCE` |
| **Seismic Zoning** | Bureau of Indian Standards | BIS IS 1893:2016 Seismic Zone Registry | `TABULAR_HISTORICAL` | Static Reference | `VERIFIED_OFFICIAL` |
| **Weather & Rainfall** | IMD / Open-Meteo | AWS Telemetry & Nowcast Warning Feed | `OBSERVATION` | Real-time / Hourly | `LIVE` / `HISTORICAL` |
| **Satellite Hydromet** | ISRO MOSDAC | GSMaP_ISRO Precipitation Radar | `SATELLITE_TELEMETRY` | 30-Minute Pass | `LIVE` / `HISTORICAL` |
| **Coastal Hazard** | NHO / INCOIS | INCOIS Storm Surge & Coastal Index | `GEOSPATIAL_VECTOR` | Updated 2025 | `VERIFIED_OFFICIAL` |
| **Hydrography & Flood** | Central Water Commission (CWC) | CWC River Vector & DEM Inundation Model | `MODEL_DERIVED` | Static Reference | `MODEL_DERIVED` |
| **Landslide Hazard** | Geological Survey of India (GSI) | GSI Landslide Susceptibility Atlas | `STATIC_REFERENCE` | Static Reference | `VERIFIED_OFFICIAL` |
| **Roads & Facilities** | OpenStreetMap (OSM) | OSM Overpass Vector & POI Index | `GEOSPATIAL_VECTOR` | Community Current | `COMMUNITY_DATA` |
| **Demographics** | Census of India | District Census 2011 Registry | `TABULAR_HISTORICAL` | Decennial | `HISTORICAL` |
| **Shelter Registry** | UK-SDMA / DDMA | State Master Relief Shelter Register | `OFFICIAL_REGISTRY` | Continuous | `VERIFIED_OFFICIAL` |

---

## 3. Fallback & Connection Failures

1. **No Fake Live Telemetry:** If an external weather API call times out or is unconfigured, the provider returns status `"UNAVAILABLE"` / `"HISTORICAL"` with `is_live = False` and an explicit note explaining API failure.
2. **Missing Coverage:** If a specialized hydrographic overlay is absent, the system evaluates terrain slope and river proximity with status `PARTIAL_COVERAGE` instead of claiming zero risk.
3. **No Key Exposure:** API requests are proxied via the FastAPI backend; zero private API keys or auth headers are exposed to client JavaScript.
