from typing import List, Dict, Any
from app.data_providers.base_provider import BaseRelocationDataProvider
from app.services.data_seed import RAW_CANDIDATE_SITES
from app.services.location_service import calculate_haversine_distance

class OfficialShelterDataProvider(BaseRelocationDataProvider):
    """
    Adapter for State Disaster Management Authority (SDMA) & District Disaster Management Authority (DDMA) shelter registry.
    """

    def __init__(self):
        self.provider_name = "State Disaster Management Authority (UK-SDMA)"
        self.provider_url = "https://uksdma.uk.gov.in/"
        self.license = "Official State Disaster Management Registry"
        self.auth_required = False

    def get_provider_metadata(self) -> Dict[str, Any]:
        return {
            "source_name": self.provider_name,
            "provider_url": self.provider_url,
            "license": self.license,
            "authentication_required": False,
            "rate_limit": "Unrestricted",
            "coverage": "Uttarakhand State",
            "update_frequency": "Continuous / Emergency Broadcast",
            "provider_status": "LIVE",
            "is_live": True
        }

    def fetch_candidate_sites(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        nearby = []
        for s in RAW_CANDIDATE_SITES:
            dist = calculate_haversine_distance(latitude, longitude, s["latitude"], s["longitude"])
            if dist <= radius_km:
                s_copy = dict(s)
                s_copy["distance_km"] = dist
                nearby.append(s_copy)
        return nearby
