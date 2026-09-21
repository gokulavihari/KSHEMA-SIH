# AASHRAY Phase 4 & Phase 5 Data Provider Audit

**Project:** AASHRAY — AI-Assisted Hazard Assessment, Safe Habitat & Relocation System  
**SIH Problem Statement:** 26191  
**Audit Date:** September 2026  
**Auditor:** Lead System Architect, Backend Architect, GIS Scientist  

---

## Data Providers Audit Matrix

| Provider File | Function / Class | Actual Data Source | API Endpoint / Dataset | Type | Real Network Call | Fallback | Validated | Risk Engine Usage | Relocation Engine Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `elevation_provider.py` | `get_elevation_and_slope` | NASA JPL / Open-Meteo | SRTM 30m Global DEM v3 | `STATIC_RASTER` | Yes (Open-Meteo DEM API) | SRTM sector model | Yes | Yes (Slope & Elevation) | Yes (Terrain Safety) |
| `seismic_provider.py` | `get_seismic_hazard_evidence` | Bureau of Indian Standards | BIS IS 1893:2016 Code | `STATIC_REFERENCE` | No (Tabular Reference) | IS 1893 Zone II baseline | Yes (BIS Code) | Yes (Seismic PGA) | Yes (Building Exclusion) |
| `flood_provider.py` | `get_flood_hazard_evidence` | Central Water Commission (CWC) | CWC Hydrographic Vector Overlay | `MODEL_DERIVED` | No (Raster/Vector Model) | Slope-elevation buffer | Yes (CWC Hydro) | Yes (Flood Inundation) | Yes (100m River Exclusion) |
| `landslide_provider.py` | `get_landslide_hazard_evidence` | Geological Survey of India | GSI Landslide Atlas / SRTM Slope | `STATIC_REFERENCE` | No (Geological Atlas) | SRTM Slope \(\ge 28^\circ\) | Yes (GSI Atlas) | Yes (Landslide Risk) | Yes (Slope Exclusion) |
| `imd_provider.py` | `fetch_imd_weather` | IMD / Open-Meteo | `https://api.open-meteo.com/` | `LIVE` | Yes (HTTP GET) | Historical baseline | Yes (IMD AWS) | Yes (Live Rainfall) | Yes (Weather Urgency) |
| `mosdac_provider.py` | `fetch_mosdac_rainfall` | ISRO MOSDAC Center | GSMaP_ISRO Precipitation | `SATELLITE_TELEMETRY` | Yes (MOSDAC Portal) | Satellite baseline | Yes (ISRO GSMaP) | Yes (Rainfall Radar) | Yes (Rainfall Urgency) |
| `shelter_provider.py` | `fetch_nationwide_shelter_candidates` | SDMA Master & OSM Overpass | OSM Overpass API / SDMA Reg | `MIXED` | Yes (Overpass API) | Indexed SDMA shelters | Yes (SDMA / OSM) | No | Yes (Shelter Selection) |
| `official_shelter_provider.py` | `OfficialShelterDataProvider` | State Disaster Management Authority | UK-SDMA Master Register | `OFFICIAL_REGISTRY` | No (Indexed Register) | Local SDMA Register | Yes (Official SDMA) | No | Yes (Verified Shelters) |
| `osm_provider.py` | `get_osm_spatial_infrastructure` | OpenStreetMap Contributors | `https://www.openstreetmap.org/` | `COMMUNITY_DATA` | Yes (Overpass API) | Local POI Index | Yes (OSM ODbL) | Yes (Road/Hosp Dist) | Yes (Healthcare Access) |
| `geocoding_provider.py` | `reverse_geocode`, `forward_geocode` | OpenStreetMap Nominatim | `https://nominatim.openstreetmap.org/` | `LIVE` | Yes (HTTP GET) | Offline Geocoder | Yes (Nominatim) | Yes (Location Info) | Yes (Location Metadata) |

---

## Data Integrity Summary

1. **No Synthetic Live Telemetry:** When external weather or geocoding APIs are unreachable, status is set to `"HISTORICAL"` or `"UNAVAILABLE"` with `is_live = False` and an explicit fallback message.
2. **Honest Shelter Classification:** OpenStreetMap candidate facilities (`POTENTIAL_CANDIDATE`) are explicitly marked `capacity_verified: False` with capacity notes indicating field survey required.
3. **No Key Leakage:** Zero secret keys are exposed to client JavaScript.
