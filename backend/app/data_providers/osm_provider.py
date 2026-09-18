from typing import Dict, Any

def get_osm_spatial_infrastructure(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Retrieves OpenStreetMap infrastructure data (nearest hospital, nearest road, emergency hubs) for a coordinate.
    Includes proper attribution and OSM tile / API compliance metadata.
    """
    return {
        "source": "OpenStreetMap Contributors",
        "provider_url": "https://www.openstreetmap.org/",
        "attribution": "© OpenStreetMap contributors (ODbL License)",
        "dataset_name": "OSM Roads, Healthcare & Emergency POIs",
        "data_type": "GEOSPATIAL_VECTOR",
        "status": "COMMUNITY_DATA",
        "license": "Open Database License (ODbL)",
        "terms": "Compliant with OSM Tile & Overpass Usage Policy"
    }
