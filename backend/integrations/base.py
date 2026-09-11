"""Abstract Connector Interface for Third-Party Compliance & Intelligence Providers."""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from backend.app.models import (
    DNBProfile,
    LexisNexisScreeningSummary,
    GLEIFRecord,
    ScreeningMatch,
    EntityType,
)


class BaseExternalComplianceProvider(ABC):
    """Base interface for all third-party data vendor connectors (D&B, LexisNexis, GLEIF)."""

    @abstractmethod
    def fetch_corporate_profile(
        self,
        primary_name: str,
        country: str,
        registration_number: Optional[str] = None,
    ) -> Optional[DNBProfile]:
        """Fetch verified corporate profile, D-U-N-S, financials, and UBO tree from provider."""
        pass

    @abstractmethod
    def screen_entity(
        self,
        name: str,
        country: str,
        entity_type: EntityType,
        threshold: float = 75.0,
    ) -> List[ScreeningMatch]:
        """Execute watchlists, PEP, and adverse media screening via provider."""
        pass

    @abstractmethod
    def lookup_lei(
        self,
        primary_name: str,
        country: str,
    ) -> Optional[GLEIFRecord]:
        """Lookup Legal Entity Identifier (LEI) and official registry status."""
        pass
