from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseRelocationDataProvider(ABC):
    """
    Abstract Base Class for AASHRAY candidate relocation site data providers.
    All adapters must return standardized candidate site dictionaries.
    """

    @abstractmethod
    def fetch_candidate_sites(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Fetch candidate relocation sites within the specified radius.
        """
        pass

    @abstractmethod
    def get_provider_metadata(self) -> Dict[str, Any]:
        """
        Returns metadata regarding provider name, coverage, licensing, and status.
        """
        pass
