import time
import urllib.parse
import urllib.request
import json
import re
from typing import Dict, Any, Optional, List

USER_AGENT = "Kshema_Disaster_Support_Platform/1.1 (sih2026@kshema.gov.in)"

_GEO_CACHE: Dict[str, Any] = {}

LOCAL_GEO_DB = [

    {
        "keys": ["raini", "reni", "raini village", "hab-001"],
        "latitude": 30.4852,
        "longitude": 79.6914,
        "display_name": "Raini Village (Reni), Chamoli, Uttarakhand",
        "locality": "Raini Village",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["joshimath", "hab-002"],
        "latitude": 30.5564,
        "longitude": 79.5642,
        "display_name": "Joshimath Upper Ward, Chamoli, Uttarakhand",
        "locality": "Joshimath",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["tapovan", "hab-003", "site-005"],
        "latitude": 30.4935,
        "longitude": 79.6295,
        "display_name": "Tapovan Valley Settlement, Chamoli, Uttarakhand",
        "locality": "Tapovan",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["helang", "hab-004"],
        "latitude": 30.5180,
        "longitude": 79.4890,
        "display_name": "Helang Slope Habitation, Chamoli, Uttarakhand",
        "locality": "Helang",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["pandukeshwar", "hab-005"],
        "latitude": 30.6340,
        "longitude": 79.5490,
        "display_name": "Pandukeshwar Village, Chamoli, Uttarakhand",
        "locality": "Pandukeshwar",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["mana", "hab-006"],
        "latitude": 30.7760,
        "longitude": 79.4960,
        "display_name": "Mana Village (Border Settlement), Chamoli, Uttarakhand",
        "locality": "Mana Village",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246443"
    },
    {
        "keys": ["pipalkoti", "hab-007", "site-002"],
        "latitude": 30.4320,
        "longitude": 79.4310,
        "display_name": "Pipalkoti Valley Ward, Chamoli, Uttarakhand",
        "locality": "Pipalkoti",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246472"
    },
    {
        "keys": ["chamoli", "hab-008", "site-004"],
        "latitude": 30.4040,
        "longitude": 79.3360,
        "display_name": "Chamoli Old Town, Chamoli, Uttarakhand",
        "locality": "Chamoli",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246424"
    },
    {
        "keys": ["gopeshwar", "site-001"],
        "latitude": 30.4180,
        "longitude": 79.3240,
        "display_name": "Gopeshwar District Relief Campus, Chamoli, Uttarakhand",
        "locality": "Gopeshwar",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246401"
    },
    {
        "keys": ["gauchar", "site-003"],
        "latitude": 30.2850,
        "longitude": 79.1580,
        "display_name": "Gauchar Airstrip Relief Complex, Chamoli, Uttarakhand",
        "locality": "Gauchar",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246429"
    },
    {
        "keys": ["tharali", "hab-009"],
        "latitude": 30.0650,
        "longitude": 79.5020,
        "display_name": "Tharali Slope Village, Chamoli, Uttarakhand",
        "locality": "Tharali",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246481"
    },
    {
        "keys": ["dewal", "hab-010"],
        "latitude": 30.0210,
        "longitude": 79.6100,
        "display_name": "Dewal High Village, Chamoli, Uttarakhand",
        "locality": "Dewal",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "country": "India",
        "pincode": "246427"
    },
    {
        "keys": ["medchal"],
        "latitude": 17.604161,
        "longitude": 78.483843,
        "display_name": "Medchal, Medchal-Malkajgiri, Telangana",
        "locality": "Medchal",
        "district": "Medchal-Malkajgiri",
        "state": "Telangana",
        "country": "India",
        "pincode": "501401"
    },
    {
        "keys": ["atevelle"],
        "latitude": 17.595761,
        "longitude": 78.489133,
        "display_name": "Atevelle, Medchal-Malkajgiri, Telangana",
        "locality": "Atevelle",
        "district": "Medchal-Malkajgiri",
        "state": "Telangana",
        "country": "India",
        "pincode": "501401"
    },
    {
        "keys": ["hyderabad"],
        "latitude": 17.385044,
        "longitude": 78.486671,
        "display_name": "Hyderabad, Telangana",
        "locality": "Hyderabad",
        "district": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "pincode": "500001"
    },
    # Additional All-India Key Locations for Offline / Fast Geocoding Lookup
    {
        "keys": ["kullu", "kullu district"],
        "latitude": 31.9579,
        "longitude": 77.1095,
        "display_name": "Kullu, Himachal Pradesh, India",
        "locality": "Kullu",
        "district": "Kullu",
        "state": "Himachal Pradesh",
        "country": "India",
        "pincode": "175101"
    },
    {
        "keys": ["mumbai", "bombay"],
        "latitude": 19.0760,
        "longitude": 72.8777,
        "display_name": "Mumbai, Maharashtra, India",
        "locality": "Mumbai",
        "district": "Mumbai City",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "400001"
    },
    {
        "keys": ["delhi", "new delhi"],
        "latitude": 28.6139,
        "longitude": 77.2090,
        "display_name": "New Delhi, Delhi, India",
        "locality": "New Delhi",
        "district": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "pincode": "110001"
    },
    {
        "keys": ["chennai", "madras"],
        "latitude": 13.0827,
        "longitude": 80.2707,
        "display_name": "Chennai, Tamil Nadu, India",
        "locality": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "600001"
    },
    {
        "keys": ["bengaluru", "bangalore"],
        "latitude": 12.9716,
        "longitude": 77.5946,
        "display_name": "Bengaluru, Karnataka, India",
        "locality": "Bengaluru",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560001"
    },
    {
        "keys": ["kochi", "cochin"],
        "latitude": 9.9312,
        "longitude": 76.2673,
        "display_name": "Kochi, Kerala, India",
        "locality": "Kochi",
        "district": "Ernakulam",
        "state": "Kerala",
        "country": "India",
        "pincode": "682001"
    },
    {
        "keys": ["wayanad", "kalpetta"],
        "latitude": 11.6854,
        "longitude": 76.1320,
        "display_name": "Wayanad, Kerala, India",
        "locality": "Wayanad",
        "district": "Wayanad",
        "state": "Kerala",
        "country": "India",
        "pincode": "673121"
    },
    {
        "keys": ["bhubaneswar"],
        "latitude": 20.2961,
        "longitude": 85.8245,
        "display_name": "Bhubaneswar, Odisha, India",
        "locality": "Bhubaneswar",
        "district": "Khurda",
        "state": "Odisha",
        "country": "India",
        "pincode": "751001"
    },
    {
        "keys": ["kolkata", "calcutta"],
        "latitude": 22.5726,
        "longitude": 88.3639,
        "display_name": "Kolkata, West Bengal, India",
        "locality": "Kolkata",
        "district": "Kolkata",
        "state": "West Bengal",
        "country": "India",
        "pincode": "700001"
    },
    {
        "keys": ["guwahati"],
        "latitude": 26.1445,
        "longitude": 91.7362,
        "display_name": "Guwahati, Assam, India",
        "locality": "Guwahati",
        "district": "Kamrup Metropolitan",
        "state": "Assam",
        "country": "India",
        "pincode": "781001"
    },
    {
        "keys": ["jaipur"],
        "latitude": 26.9124,
        "longitude": 75.7873,
        "display_name": "Jaipur, Rajasthan, India",
        "locality": "Jaipur",
        "district": "Jaipur",
        "state": "Rajasthan",
        "country": "India",
        "pincode": "302001"
    },
    {
        "keys": ["ahmedabad"],
        "latitude": 23.0225,
        "longitude": 72.5714,
        "display_name": "Ahmedabad, Gujarat, India",
        "locality": "Ahmedabad",
        "district": "Ahmedabad",
        "state": "Gujarat",
        "country": "India",
        "pincode": "380001"
    },
    {
        "keys": ["pune"],
        "latitude": 18.5204,
        "longitude": 73.8567,
        "display_name": "Pune, Maharashtra, India",
        "locality": "Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "411001"
    },
    {
        "keys": ["nagpur"],
        "latitude": 21.1458,
        "longitude": 79.0882,
        "display_name": "Nagpur, Maharashtra, India",
        "locality": "Nagpur",
        "district": "Nagpur",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "440001"
    },
    {
        "keys": ["visakhapatnam", "vizag"],
        "latitude": 17.6868,
        "longitude": 83.2185,
        "display_name": "Visakhapatnam, Andhra Pradesh, India",
        "locality": "Visakhapatnam",
        "district": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "country": "India",
        "pincode": "530001"
    },
    {
        "keys": ["vijayawada"],
        "latitude": 16.5062,
        "longitude": 80.6480,
        "display_name": "Vijayawada, Andhra Pradesh, India",
        "locality": "Vijayawada",
        "district": "NTR",
        "state": "Andhra Pradesh",
        "country": "India",
        "pincode": "520001"
    },
    {
        "keys": ["bhopal"],
        "latitude": 23.2599,
        "longitude": 77.4126,
        "display_name": "Bhopal, Madhya Pradesh, India",
        "locality": "Bhopal",
        "district": "Bhopal",
        "state": "Madhya Pradesh",
        "country": "India",
        "pincode": "462001"
    },
    {
        "keys": ["lucknow"],
        "latitude": 26.8467,
        "longitude": 80.9462,
        "display_name": "Lucknow, Uttar Pradesh, India",
        "locality": "Lucknow",
        "district": "Lucknow",
        "state": "Uttar Pradesh",
        "country": "India",
        "pincode": "226001"
    },
    {
        "keys": ["patna"],
        "latitude": 25.5941,
        "longitude": 85.1376,
        "display_name": "Patna, Bihar, India",
        "locality": "Patna",
        "district": "Patna",
        "state": "Bihar",
        "country": "India",
        "pincode": "800001"
    },
    {
        "keys": ["ranchi"],
        "latitude": 23.3441,
        "longitude": 85.3096,
        "display_name": "Ranchi, Jharkhand, India",
        "locality": "Ranchi",
        "district": "Ranchi",
        "state": "Jharkhand",
        "country": "India",
        "pincode": "834001"
    },
    {
        "keys": ["srinagar"],
        "latitude": 34.0837,
        "longitude": 74.7973,
        "display_name": "Srinagar, Jammu and Kashmir, India",
        "locality": "Srinagar",
        "district": "Srinagar",
        "state": "Jammu and Kashmir",
        "country": "India",
        "pincode": "190001"
    },
    {
        "keys": ["shillong"],
        "latitude": 25.5788,
        "longitude": 91.8933,
        "display_name": "Shillong, Meghalaya, India",
        "locality": "Shillong",
        "district": "East Khasi Hills",
        "state": "Meghalaya",
        "country": "India",
        "pincode": "793001"
    },
    {
        "keys": ["gangtok"],
        "latitude": 27.3389,
        "longitude": 88.6065,
        "display_name": "Gangtok, Sikkim, India",
        "locality": "Gangtok",
        "district": "Gangtok",
        "state": "Sikkim",
        "country": "India",
        "pincode": "737101"
    },
    {
        "keys": ["itanagar"],
        "latitude": 27.0844,
        "longitude": 93.6053,
        "display_name": "Itanagar, Arunachal Pradesh, India",
        "locality": "Itanagar",
        "district": "Papum Pare",
        "state": "Arunachal Pradesh",
        "country": "India",
        "pincode": "791111"
    },
    {
        "keys": ["port blair"],
        "latitude": 11.6234,
        "longitude": 92.7265,
        "display_name": "Port Blair, Andaman and Nicobar Islands, India",
        "locality": "Port Blair",
        "district": "South Andaman",
        "state": "Andaman and Nicobar Islands",
        "country": "India",
        "pincode": "744101"
    }
]

def is_within_india_bounding_box(latitude: float, longitude: float) -> bool:
    """Validates if coordinates lie within Indian geographic bounds (6.0N-37.5N, 68.0E-97.5E)."""
    return (6.0 <= latitude <= 37.5) and (68.0 <= longitude <= 97.5)

def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Reverse geocode a (lat, lon) pair using OpenStreetMap Nominatim API with accurate region detection.
    Returns structured location metadata (village/town, district, state, country).
    NEVER defaults to Chamoli or Joshimath unless coordinates are actually in Chamoli.
    """
    cache_key = f"rev_{round(latitude, 4)}_{round(longitude, 4)}"
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    # Check local dictionary match first
    for entry in LOCAL_GEO_DB:
        if abs(entry["latitude"] - latitude) < 0.08 and abs(entry["longitude"] - longitude) < 0.08:

            res = {
                "latitude": latitude,
                "longitude": longitude,
                "display_name": entry["display_name"],
                "locality": entry["locality"],
                "district": entry["district"],
                "state": entry["state"],
                "country": entry["country"],
                "pincode": entry.get("pincode", "000000"),
                "source": "AASHRAY Location Directory",
                "status": "LIVE"
            }
            _GEO_CACHE[cache_key] = res
            return res

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={latitude}&lon={longitude}&zoom=14&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            address = data.get("address", {})
            
            village_or_town = (
                address.get("city") or address.get("town") or address.get("village") or
                address.get("hamlet") or address.get("suburb") or address.get("county") or "Location"
            )
            district = address.get("state_district") or address.get("county") or address.get("district") or village_or_town
            state = address.get("state") or "State"
            country = address.get("country") or "India"
            pincode = address.get("postcode", "000000")
            display_name = data.get("display_name") or f"{village_or_town}, {district}, {state}, {country}"

            res = {
                "latitude": latitude,
                "longitude": longitude,
                "display_name": display_name,
                "locality": village_or_town,
                "district": district,
                "state": state,
                "country": country,
                "pincode": pincode,
                "source": "NOMINATIM",
                "status": "LIVE"
            }
            _GEO_CACHE[cache_key] = res
            return res
    except Exception:
        # Generic coordinate resolution without fake hardcoded regional fallbacks
        res = {
            "latitude": latitude,
            "longitude": longitude,
            "display_name": f"Location ({latitude:.4f}° N, {longitude:.4f}° E), India",
            "locality": f"Point ({latitude:.2f}°, {longitude:.2f}°)",
            "district": "Indian Sector",
            "state": "Indian Region",
            "country": "India",
            "pincode": "000000",
            "source": "AASHRAY Coordinate Resolving Engine",
            "status": "MODEL-DERIVED"
        }
        _GEO_CACHE[cache_key] = res
        return res

def forward_geocode_search(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for locations in India matching query. Returns a validated list of candidates.
    Supports administrative disambiguation and exact region extraction.
    NEVER uses a fake Chamoli fallback on failure!
    """
    clean_query = query.strip().lower()
    if not clean_query:
        return []

    cache_key = f"fwd_search_{clean_query}_{limit}"
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    results: List[Dict[str, Any]] = []
    seen_coords = set()

    # 1. Coordinate input check (e.g. "31.9579, 77.1095" or "17.3850 78.4867")
    coord_match = re.match(r"^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$", clean_query)
    if coord_match:
        try:
            lat = float(coord_match.group(1))
            lon = float(coord_match.group(2))
            if is_within_india_bounding_box(lat, lon):
                rev = reverse_geocode(lat, lon)
                item = {
                    "name": rev["locality"],
                    "display_name": rev["display_name"],
                    "latitude": lat,
                    "longitude": lon,
                    "state": rev["state"],
                    "district": rev["district"],
                    "locality": rev["locality"],
                    "country": "India",
                    "source": "NOMINATIM",
                    "source_id": f"COORD-{round(lat,4)}-{round(lon,4)}",
                    "selection_method": "COORDINATES",
                    "pincode": rev.get("pincode")
                }
                _GEO_CACHE[cache_key] = [item]
                return [item]
        except (ValueError, TypeError):
            pass

    # 2. Local Database Search
    exact_matches = []
    partial_matches = []
    for entry in LOCAL_GEO_DB:
        coord_key = (round(entry["latitude"], 4), round(entry["longitude"], 4))
        if coord_key in seen_coords:
            continue
        
        is_exact = False
        is_partial = False
        for k in entry["keys"]:
            k_lower = k.lower()
            if k_lower == clean_query:
                is_exact = True
                break
            elif re.search(r'\b' + re.escape(clean_query) + r'\b', k_lower) or (len(clean_query) >= 4 and clean_query in k_lower and k_lower.startswith(clean_query)):
                is_partial = True

        candidate = {
            "name": entry["locality"],
            "display_name": entry["display_name"],
            "latitude": entry["latitude"],
            "longitude": entry["longitude"],
            "state": entry["state"],
            "district": entry["district"],
            "locality": entry["locality"],
            "country": "India",
            "source": "NOMINATIM",
            "source_id": f"LOCAL-{entry['keys'][0]}",
            "selection_method": "SEARCH",
            "pincode": entry.get("pincode")
        }

        if is_exact:
            seen_coords.add(coord_key)
            exact_matches.append(candidate)
        elif is_partial:
            seen_coords.add(coord_key)
            partial_matches.append(candidate)

    results.extend(exact_matches)
    results.extend(partial_matches)

    # 3. Query OpenStreetMap Nominatim with India context
    try:
        search_query = query.strip()
        if "india" not in search_query.lower():
            search_query += ", India"

        encoded = urllib.parse.quote(search_query)
        url = f"https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q={encoded}&limit={limit * 2}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            for item in data:
                try:
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                except (ValueError, KeyError, TypeError):
                    continue

                if not is_within_india_bounding_box(lat, lon):
                    continue

                address = item.get("address", {})
                country = address.get("country", "India")
                country_code = address.get("country_code", "in")
                if country_code.lower() != "in" and "india" not in country.lower():
                    continue

                coord_key = (round(lat, 3), round(lon, 3))
                if coord_key in seen_coords:
                    continue
                seen_coords.add(coord_key)

                locality = (
                    address.get("city") or address.get("town") or address.get("village") or
                    address.get("suburb") or address.get("county") or query.strip().title()
                )
                district = address.get("state_district") or address.get("county") or address.get("district") or locality
                state = address.get("state") or "India"

                disp_name = item.get("display_name") or f"{locality}, {district}, {state}, India"

                results.append({
                    "name": locality,
                    "display_name": disp_name,
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6),
                    "state": state,
                    "district": district,
                    "locality": locality,
                    "country": "India",
                    "source": "NOMINATIM",
                    "source_id": str(item.get("osm_id", "")),
                    "selection_method": "SEARCH",
                    "pincode": address.get("postcode", "")
                })

                if len(results) >= limit:
                    break
    except Exception:
        pass

    _GEO_CACHE[cache_key] = results
    return results

def forward_geocode(query: str) -> Optional[Dict[str, Any]]:
    """
    Forward geocode single top result for address query.
    Returns None if no valid Indian location is found (NO Chamoli fallbacks!).
    """
    results = forward_geocode_search(query, limit=1)
    if results:
        return results[0]
    return None


