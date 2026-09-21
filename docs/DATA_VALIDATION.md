# AASHRAY Data Validation & Execution Modes

**System Component:** Centralized Data Coverage & Validation Service  
**Version:** 2.0  
**Updated:** September 2026  

---

## 1. Execution Modes

AASHRAY supports 3 distinct operational modes to enforce data integrity during decision support:

```
                  ┌────────────────────────┐
                  │    Target Coordinate   │
                  └───────────┬────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  STRICT_VERIFIED Mode │           │     RESEARCH Mode     │
├───────────────────────┤           ├───────────────────────┤
│ • Verified data only  │           │ • Model estimates     │
│ • Official shelters   │           │   allowed             │
│ • No demo fixtures    │           │ • OSM candidates      │
└───────────────────────┘           └───────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │       DEMO Mode       │
                                    ├───────────────────────┤
                                    │ • Labeled DEMO        │
                                    │ • Local fixtures      │
                                    │ • Jury / Hackathon    │
                                    └───────────────────────┘
```

### Mode Definitions

1. **`STRICT_VERIFIED` Mode:**
   - Evaluates only officially verified evidence (`VERIFIED_OFFICIAL`, `VERIFIED_FIELD`).
   - Restricts population allocation strictly to registered SDMA/DDMA shelters with verified capacities.
   - Prevents automated allocation to unverified community facilities.

2. **`RESEARCH` Mode:**
   - Permits clearly marked model-derived estimates (e.g. slope-derived landslide susceptibility or DEM river proximity buffer).
   - Allows screening of OpenStreetMap candidate facilities (`POTENTIAL_CANDIDATE`) for exploratory planning while flagging required field verification.

3. **`DEMO` Mode:**
   - Utilizes versioned local demonstration dataset fixtures for hackathon testing and offline presentation.
   - Prominently displays `DEMONSTRATION DATA MODE ACTIVE` badges across the interface to prevent confusion with operational disaster orders.

---

## 2. Shelter Classification Schema

Candidate relocation shelters are classified into 3 strict categories:

1. **`VERIFIED_SHELTER`:**
   - Official SDMA/DDMA relief camp or designated permanent disaster shelter.
   - Verified carrying capacity (land area, water supply, sanitation, healthcare distance).
   - Eligible for immediate dispatch planning in `STRICT_VERIFIED` mode.

2. **`POTENTIAL_CANDIDATE`:**
   - OpenStreetMap queried public building, school, college campus, sports stadium, or community center.
   - Capacity marked `UNKNOWN` / `capacity_verified: False`.
   - Requires physical field survey and DDMA authorization prior to real-world relocation dispatch.

3. **`DEMO_SHELTER`:**
   - Clearly labeled prototype test record.
   - Used only in `DEMO` mode.

---

## 3. Coverage & Validation Score Calculation

$$\text{Validation Score} = (0.6 \times \text{Coverage \%}) + \text{Live Weather Bonus} (10 \text{ pts}) + \text{Verified Shelter Bonus} (10 \text{ pts})$$

- **Minimum Evidence Coverage Threshold:** 40%
- If coverage falls below 40%, the system returns `INSUFFICIENT_DATA` status with explicit missing layer warnings instead of fabricating scores.
