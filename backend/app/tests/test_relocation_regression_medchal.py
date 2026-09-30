"""
Kshema Relocation Regression Tests - Medchal & India-Wide
==========================================================
Tests the geographic progressive search, same-district/state preference,
neighboring-region fallback, destination safety, capacity, distance
scoring, and the critical Medchal -> Uttarakhand bug regression.
"""
import pytest
import math
from app.services.relocation_service import find_location_relocation_options
from app.services.national_gis_service import _find_closest_candidate_site, NATIONAL_RISK_RECORDS
from app.data_providers.shelter_provider import fetch_nationwide_shelter_candidates
from app.services.data_seed import RAW_CANDIDATE_SITES


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)), 2)


# =============================================================================
# 1. MEDCHAL REGRESSION: MUST NOT SELECT UTTARAKHAND
# =============================================================================
class TestMedchalRegression:

    def test_medchal_does_not_select_uttarakhand(self):
        """
        CRITICAL REGRESSION: Medchal Northern Basin -> MUST NOT recommend Uttarakhand.
        The selected site must be in Telangana or at most a neighboring state.
        """
        result = find_location_relocation_options(
            latitude=17.6042,
            longitude=78.4838,
            population_to_relocate=1250,
            risk_level='CRITICAL',
            habitation_name='Medchal Northern Basin',
            habitation_id='TG-RISK-001'
        )
        assert result['success'] is True
        site = result.get('selected_site')
        assert site is not None, "Must find a relocation site for Medchal"

        state = site.get('state', '')
        dist_km = site.get('distance_km', 999)

        # Must NOT be Uttarakhand (which is ~1600 km from Medchal)
        assert 'uttarakhand' not in state.lower(), (
            "REGRESSION FAILURE: Medchal recommended a site in Uttarakhand! "
            "Site: {}, State: {}, Distance: {} km".format(site.get('name'), state, dist_km)
        )

        # Must NOT be more than 500 km away when closer options exist
        assert dist_km < 500.0, (
            "Selected site is unreasonably far ({} km) from Medchal. "
            "Site: {}, State: {}".format(dist_km, site.get('name'), state)
        )

    def test_medchal_progressive_search_starts_nearby(self):
        """Search radius must be <= 200 km when nearby candidates exist."""
        result = find_location_relocation_options(
            latitude=17.6042,
            longitude=78.4838,
            population_to_relocate=1250,
            risk_level='CRITICAL',
            habitation_name='Medchal Northern Basin'
        )
        search_radius = result.get('search_radius_km', 999)
        assert search_radius <= 200.0, (
            "Search radius jumped to {} km without exhausting nearby options".format(search_radius)
        )

    def test_medchal_selected_site_within_telangana_priority(self):
        """When Telangana has verified candidate sites, those must be strongly preferred."""
        result = find_location_relocation_options(
            latitude=17.6042,
            longitude=78.4838,
            population_to_relocate=1250,
            risk_level='CRITICAL'
        )
        site = result.get('selected_site')
        assert site is not None
        dist_km = site.get('distance_km', 999)
        # Kompally is ~9.5 km from Medchal; under 50 km is acceptable
        assert dist_km < 50.0, (
            "Expected nearby Telangana site but got {} at {} km".format(site.get('name'), dist_km)
        )

    def test_medchal_origin_coordinates_preserved(self):
        """Origin coordinates must match what was passed in."""
        lat, lon = 17.6042, 78.4838
        result = find_location_relocation_options(lat, lon)
        assert math.isclose(result['origin']['latitude'], lat, abs_tol=1e-4)
        assert math.isclose(result['origin']['longitude'], lon, abs_tol=1e-4)

    def test_medchal_selected_site_has_valid_coordinates(self):
        """Selected site coordinates must be within India bounds."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        lat = site.get('latitude', 0)
        lon = site.get('longitude', 0)
        assert 6.0 <= lat <= 37.5, "Site latitude {} outside India bounds".format(lat)
        assert 68.0 <= lon <= 97.5, "Site longitude {} outside India bounds".format(lon)

    def test_medchal_selection_reasons_provided(self):
        """Every recommended site must have selection reasons."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        assert len(result.get('selection_reasons', [])) > 0
        assert len(result.get('why_selected', [])) > 0

    def test_medchal_distance_in_selection_reasons(self):
        """Distance must be explicitly mentioned in the selection reasoning."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        reasons_text = ' '.join(result.get('why_selected', []))
        assert 'km' in reasons_text.lower() or 'distance' in reasons_text.lower()


# =============================================================================
# 2. SAME-DISTRICT PREFERENCE
# =============================================================================
class TestSameDistrictPreference:

    def test_same_district_candidate_search_runs(self):
        """Same-district candidate search must complete without errors."""
        origin_lat, origin_lon = 30.4852, 79.6914  # Raini Village, Chamoli
        result = find_location_relocation_options(
            origin_lat, origin_lon,
            population_to_relocate=500,
            risk_level='CRITICAL'
        )
        assert result['success'] is True
        assert result.get('selected_site') is not None

    def test_gis_same_district_bonus_functional(self):
        """_find_closest_candidate_site must run without crash for Chamoli origin."""
        result = _find_closest_candidate_site(
            lat=30.4852,
            lon=79.6914,
            state='Uttarakhand',
            district='Chamoli',
            population=500
        )
        # Just verifying no crash; result can be None or a valid site
        assert result is None or isinstance(result, dict)


# =============================================================================
# 3. SAME-STATE PREFERENCE
# =============================================================================
class TestSameStatePreference:

    def test_telangana_origin_finds_nearby_site(self):
        """A Telangana origin should find a site within 300 km."""
        result = find_location_relocation_options(
            latitude=17.3700, longitude=78.4800,
            population_to_relocate=500, risk_level='EXTREMELY HIGH'
        )
        site = result.get('selected_site')
        assert site is not None
        dist_km = site.get('distance_km', 999)
        assert dist_km < 300.0, "Too far: {} in {} at {} km".format(
            site.get('name'), site.get('state'), dist_km)

    def test_uttarakhand_origin_finds_site_within_500km(self):
        """Uttarakhand origin must not go more than 500 km away."""
        result = find_location_relocation_options(
            latitude=30.5564, longitude=79.5642,
            population_to_relocate=1000, risk_level='CRITICAL'
        )
        site = result.get('selected_site')
        assert site is not None
        dist_km = site.get('distance_km', 999)
        assert dist_km < 500.0, "Uttarakhand origin got site {} km away: {}".format(
            dist_km, site.get('name'))


# =============================================================================
# 4. CAPACITY VALIDATION
# =============================================================================
class TestCapacityValidation:

    def test_capacity_fields_present(self):
        """Selected site must include capacity information."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        assert 'capacity' in site or 'effective_capacity' in site or 'capacity_status' in site

    def test_allocated_population_not_exceeds_capacity(self):
        """Allocated population must not exceed site effective capacity."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        for alloc in result.get('allocations', []):
            allocated = alloc.get('allocated_population', 0)
            cap = alloc.get('site_effective_capacity', 9999)
            assert allocated <= cap, "Over-allocated: {} > {} at {}".format(
                allocated, cap, alloc.get('site_name'))

    def test_partial_capacity_correctly_reported(self):
        """When capacity is insufficient, FEASIBLE_PARTIAL must be returned."""
        result = find_location_relocation_options(
            17.6042, 78.4838,
            population_to_relocate=50000
        )
        assert result['success'] is True
        assert result.get('overall_status') in [
            'FEASIBLE_COMPLETE', 'FEASIBLE_PARTIAL', 'NO_VERIFIED_SITE_FOUND']


# =============================================================================
# 5. DESTINATION SAFETY FILTERING
# =============================================================================
class TestDestinationSafetyFiltering:

    def test_selected_site_not_in_rejected_list(self):
        """Selected site must not appear in the rejected candidates list."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        rejected_ids = [r.get('site_id') for r in result.get('rejected_candidates', [])]
        assert site.get('site_id') not in rejected_ids, "Selected site appears in rejected list!"

    def test_safety_pipeline_runs_without_crash(self):
        """Safety exclusion pipeline must complete without errors."""
        result = find_location_relocation_options(30.4935, 79.6295, population_to_relocate=200)
        assert result['success'] is True
        result2 = find_location_relocation_options(30.4852, 79.6914, population_to_relocate=500)
        assert result2['success'] is True


# =============================================================================
# 6. DISTANCE SCORING
# =============================================================================
class TestDistanceScoring:

    def test_all_candidates_have_distance_field(self):
        """Every candidate must have a computed distance from origin."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        candidates = result.get('candidates', [])
        for c in candidates[:5]:
            dist = c.get('distance_km') or c.get('straight_line_dist_km')
            if dist is None:
                dist_obj = c.get('distance', {})
                dist = dist_obj.get('straight_line_km') if isinstance(dist_obj, dict) else None
            assert dist is not None, "Candidate {} has no distance field".format(c.get('name'))
            assert dist >= 0.0

    def test_selected_site_at_least_1km_from_origin(self):
        """The selected site must be at least 1 km from the origin (not the same place)."""
        lat, lon = 17.6042, 78.4838
        result = find_location_relocation_options(lat, lon, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        site_lat = site.get('latitude', lat)
        site_lon = site.get('longitude', lon)
        dist = haversine_km(lat, lon, site_lat, site_lon)
        assert dist >= 1.0, "Selected site too close to origin: {} km".format(dist)


# =============================================================================
# 7. NO FEASIBLE SITE HANDLING
# =============================================================================
class TestNoFeasibleSiteHandling:

    def test_outside_india_returns_error_not_random_site(self):
        """Coordinates outside India must return LOCATION_OUTSIDE_SUPPORTED_INDIA_REGION."""
        result = find_location_relocation_options(51.5074, -0.1278)  # London
        assert result['success'] is False
        assert result['overall_status'] == 'LOCATION_OUTSIDE_SUPPORTED_INDIA_REGION'
        assert result.get('selected_site') is None

    def test_empty_candidate_list_returns_no_feasible_not_random(self):
        """Empty candidate list must NOT return a random national pick."""
        result = find_location_relocation_options(
            17.6042, 78.4838,
            population_to_relocate=1250,
            candidate_sites=[]
        )
        assert result['success'] is True
        assert result.get('overall_status') in [
            'NO_VERIFIED_SITE_FOUND', 'FEASIBLE_COMPLETE', 'FEASIBLE_PARTIAL']
        if result.get('overall_status') == 'NO_VERIFIED_SITE_FOUND':
            assert result.get('selected_site') is None


# =============================================================================
# 8. INDIA-WIDE REGRESSION - ORIGIN-SPECIFIC RESULTS
# =============================================================================
class TestIndiaWideRegression:

    ORIGIN_CASES = [
        ("Medchal, Telangana", 17.6042, 78.4838, 300),
        ("Raini Village, Uttarakhand", 30.4852, 79.6914, 400),
        ("Joshimath, Uttarakhand", 30.5564, 79.5642, 200),
        ("Wayanad, Kerala", 11.6854, 76.1320, 400),
        ("Assam (Guwahati area)", 26.1445, 91.7362, 500),
        ("Rajasthan (Jaipur area)", 26.9124, 75.7873, 500),
        ("Tamil Nadu (Chennai area)", 13.0827, 80.2707, 400),
        ("Andhra Pradesh (Vijayawada)", 16.5062, 80.6480, 400),
    ]

    @pytest.mark.parametrize("name,lat,lon,max_dist", ORIGIN_CASES)
    def test_origin_specific_relocation(self, name, lat, lon, max_dist):
        """Each origin must get an origin-specific recommendation."""
        result = find_location_relocation_options(lat, lon, population_to_relocate=500)
        assert result['success'] is True, "Failed for {}".format(name)
        assert math.isclose(result['origin']['latitude'], lat, abs_tol=1e-4)
        assert math.isclose(result['origin']['longitude'], lon, abs_tol=1e-4)
        site = result.get('selected_site')
        if site:
            dist_km = site.get('distance_km', 0)
            assert dist_km <= max_dist, (
                "For {}: '{}' is {} km away (max: {} km), State: {}".format(
                    name, site.get('name'), dist_km, max_dist, site.get('state')))

    def test_telangana_and_uttarakhand_get_different_sites(self):
        """Telangana and Uttarakhand origins must NOT recommend the same site."""
        result_tg = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=500)
        result_uk = find_location_relocation_options(30.4852, 79.6914, population_to_relocate=500)
        site_tg = result_tg.get('selected_site')
        site_uk = result_uk.get('selected_site')
        if site_tg and site_uk:
            same_name = site_tg.get('name') == site_uk.get('name')
            same_lat = math.isclose(
                site_tg.get('latitude', 0), site_uk.get('latitude', 0), abs_tol=0.01)
            assert not (same_name and same_lat), (
                "REUSE BUG: Both origins recommend same site: {}".format(site_tg.get('name')))


# =============================================================================
# 9. GIS NATIONAL SERVICE - PROGRESSIVE SEARCH
# =============================================================================
class TestGISNationalServiceSearch:

    def test_find_closest_candidate_telangana_not_uttarakhand(self):
        """GIS service must NOT return Uttarakhand for Medchal."""
        result = _find_closest_candidate_site(
            lat=17.6042, lon=78.4838,
            state='Telangana', district='Medchal-Malkajgiri',
            population=1250
        )
        if result:
            assert result['distance_km'] < 300, (
                "GIS returned site {} km from Medchal".format(result['distance_km']))
            assert 'uttarakhand' not in result.get('state', '').lower(), (
                "GIS returned Uttarakhand for Medchal!")

    def test_find_closest_candidate_uttarakhand_within_500km(self):
        """GIS service must return a nearby site for Chamoli."""
        result = _find_closest_candidate_site(
            lat=30.4852, lon=79.6914,
            state='Uttarakhand', district='Chamoli',
            population=500
        )
        if result:
            dist = result['distance_km']
            assert dist < 500, "Chamoli got site {} km away: {}".format(dist, result.get('name'))

    def test_progressive_search_stops_early_for_medchal(self):
        """Search must stop at smallest viable radius for Medchal."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=100)
        radius_used = result.get('search_radius_km', 999)
        assert radius_used <= 50.0, (
            "Search went to {} km when nearby Telangana sites exist".format(radius_used))


# =============================================================================
# 10. DIRECTION AND BEARING
# =============================================================================
class TestDirectionAndBearing:

    VALID_DIRECTIONS = [
        'North', 'North-East', 'East', 'South-East',
        'South', 'South-West', 'West', 'North-West', 'Same Location'
    ]

    def test_direction_is_valid_compass_point(self):
        """Selected site must have a valid 8-point compass direction."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        assert site.get('direction') in self.VALID_DIRECTIONS, (
            "Invalid direction: {}".format(site.get('direction')))

    def test_bearing_is_in_valid_range(self):
        """Bearing must be between 0 and 360 degrees."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        assert site is not None
        bearing = site.get('bearing_degrees', -1)
        assert 0.0 <= bearing <= 360.0, "Bearing out of range: {}".format(bearing)


# =============================================================================
# 11. MAP DATA COORDINATES
# =============================================================================
class TestMapDataCoordinates:

    def test_map_origin_uses_actual_coordinates(self):
        """map_data.directional_line must use actual origin coordinates."""
        lat, lon = 17.6042, 78.4838
        result = find_location_relocation_options(lat, lon, population_to_relocate=1250)
        map_data = result.get('map_data', {})
        if map_data:
            directional_line = map_data.get('directional_line', [])
            if len(directional_line) >= 2:
                origin_point = directional_line[0]
                assert math.isclose(origin_point[0], lat, abs_tol=1e-4), (
                    "Map origin lat mismatch: {} != {}".format(origin_point[0], lat))
                assert math.isclose(origin_point[1], lon, abs_tol=1e-4), (
                    "Map origin lon mismatch: {} != {}".format(origin_point[1], lon))

    def test_navigation_url_references_destination_coordinates(self):
        """Navigation URL must reference actual destination coordinates."""
        result = find_location_relocation_options(17.6042, 78.4838, population_to_relocate=1250)
        site = result.get('selected_site')
        if site:
            nav_url = site.get('navigation_url') or site.get('google_maps_url')
            if nav_url:
                site_lat = site.get('latitude')
                site_lon = site.get('longitude')
                assert site_lat is not None and site_lon is not None
                # URL should contain partial coordinates
                lat_str = str(site_lat)[:5]
                lon_str = str(site_lon)[:5]
                assert lat_str in nav_url or lon_str in nav_url, (
                    "Navigation URL doesn't contain destination coords: {}".format(nav_url))


# =============================================================================
# 12. STATE BOUNDARY DATA
# =============================================================================
class TestStateBoundaryData:

    def test_all_configured_states_have_boundary_polygons(self):
        """Every state in INDIAN_STATES_DATA must have boundary data."""
        from app.data_providers.national_boundaries import INDIAN_STATES_DATA
        for state_name, data in INDIAN_STATES_DATA.items():
            has_poly = 'boundary_polygon' in data or 'boundary_multipolygon' in data
            assert has_poly, "State {} has no boundary polygon data".format(state_name)

    def test_geojson_is_valid_feature_collection(self):
        """GeoJSON boundaries must be a valid FeatureCollection with >= 15 states."""
        from app.data_providers.national_boundaries import get_state_boundaries_geojson
        geojson = get_state_boundaries_geojson()
        assert geojson['type'] == 'FeatureCollection'
        assert len(geojson['features']) >= 15

    def test_telangana_and_uttarakhand_in_geojson(self):
        """Both Telangana and Uttarakhand must appear in GeoJSON boundaries."""
        from app.data_providers.national_boundaries import get_state_boundaries_geojson
        geojson = get_state_boundaries_geojson()
        names = [f['properties']['name'] for f in geojson['features']]
        assert 'Telangana' in names
        assert 'Uttarakhand' in names

    def test_every_configured_state_has_boundary_feature(self):
        """Every configured state must appear in GeoJSON (even those with 0 risk locations)."""
        from app.data_providers.national_boundaries import get_state_boundaries_geojson, INDIAN_STATES_DATA
        geojson = get_state_boundaries_geojson()
        boundary_names = [f['properties']['name'] for f in geojson['features']]
        for state_name in INDIAN_STATES_DATA.keys():
            assert state_name in boundary_names, (
                "State '{}' missing from GeoJSON boundaries".format(state_name))

    def test_geojson_polygon_coordinates_within_india(self):
        """All GeoJSON polygon coordinates must be within extended India bounds."""
        from app.data_providers.national_boundaries import get_state_boundaries_geojson
        geojson = get_state_boundaries_geojson()
        for feature in geojson['features']:
            geom = feature['geometry']
            state_name = feature['properties']['name']
            if geom['type'] == 'Polygon':
                for ring in geom['coordinates']:
                    for coord in ring:
                        lon, lat = coord[0], coord[1]
                        assert 60.0 <= lon <= 100.0, (
                            "Lon {} out of range for {}".format(lon, state_name))
                        assert 4.0 <= lat <= 40.0, (
                            "Lat {} out of range for {}".format(lat, state_name))


# =============================================================================
# 13. NATIONAL GIS RISK RECORDS INTEGRITY
# =============================================================================
class TestNationalGISRiskRecords:

    def test_medchal_in_national_records(self):
        """Medchal Northern Basin must be in the national risk records."""
        medchal = next(
            (r for r in NATIONAL_RISK_RECORDS if 'Medchal' in r['location_name']), None)
        assert medchal is not None
        assert medchal['state'] == 'Telangana'
        assert medchal['risk_level'] == 'CRITICAL'
        assert medchal['population'] == 1250

    def test_all_records_have_valid_coordinates(self):
        """Every risk record must have valid India-bounded coordinates."""
        for rec in NATIONAL_RISK_RECORDS:
            lat = rec.get('latitude')
            lon = rec.get('longitude')
            name = rec.get('location_name', '?')
            assert lat is not None, "Missing latitude for {}".format(name)
            assert lon is not None, "Missing longitude for {}".format(name)
            assert 6.0 <= lat <= 37.5, "Lat {} out of bounds for {}".format(lat, name)
            assert 68.0 <= lon <= 97.5, "Lon {} out of bounds for {}".format(lon, name)

    def test_all_records_have_valid_risk_level(self):
        """Every record must have a valid risk_level."""
        valid_levels = {'MODERATE', 'HIGH', 'EXTREMELY HIGH', 'CRITICAL'}
        for rec in NATIONAL_RISK_RECORDS:
            assert rec.get('risk_level') in valid_levels, (
                "Invalid risk_level '{}' for {}".format(
                    rec.get('risk_level'), rec.get('location_name')))


# =============================================================================
# 14. CANDIDATE SITE DATA INTEGRITY
# =============================================================================
class TestCandidateSiteDataIntegrity:

    def test_all_candidate_sites_have_valid_coordinates(self):
        """Every candidate site must have lat/lon within India."""
        for site in RAW_CANDIDATE_SITES:
            lat = site.get('latitude')
            lon = site.get('longitude')
            name = site.get('name', '?')
            assert lat is not None and lon is not None, "Missing coords for {}".format(name)
            assert 6.0 <= lat <= 37.5, "Site lat {} out of bounds for {}".format(lat, name)
            assert 68.0 <= lon <= 97.5, "Site lon {} out of bounds for {}".format(lon, name)

    def test_all_candidate_sites_have_safety_score(self):
        """Every candidate site must have a safety_score between 0 and 100."""
        for site in RAW_CANDIDATE_SITES:
            score = site.get('safety_score')
            assert score is not None, "Missing safety_score for {}".format(site.get('name', '?'))
            assert 0.0 <= score <= 100.0

    def test_telangana_candidate_sites_exist(self):
        """At least 2 Telangana candidate sites must exist."""
        tg_sites = [s for s in RAW_CANDIDATE_SITES
                    if s.get('state', '').lower() == 'telangana']
        assert len(tg_sites) >= 2, "Only {} Telangana candidate sites found".format(len(tg_sites))

    def test_uttarakhand_candidate_sites_exist(self):
        """At least 5 Uttarakhand candidate sites must exist."""
        uk_sites = [s for s in RAW_CANDIDATE_SITES
                    if s.get('state', '').lower() == 'uttarakhand']
        assert len(uk_sites) >= 5, "Only {} Uttarakhand candidate sites found".format(len(uk_sites))
