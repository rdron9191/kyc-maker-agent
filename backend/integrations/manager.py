"""External Intelligence Manager for D&B, LexisNexis, and GLEIF Connectors."""

import hashlib
from typing import Dict, Optional, List, Tuple
from datetime import datetime
from backend.app.models import (
    KYCCase,
    EntityType,
    ExternalIntelligenceBundle,
    ScreeningMatch,
    AuditEvent,
    WorkflowStage,
)
from backend.integrations.dnb_adapter import DunAndBradstreetAdapter
from backend.integrations.lexisnexis_adapter import LexisNexisBridgerAdapter
from backend.integrations.gleif_adapter import GLEIFAdapter


class ExternalIntelligenceManager:
    """Orchestrates third-party intelligence data feeds with query caching & audit provenance."""

    def __init__(self):
        self.dnb = DunAndBradstreetAdapter()
        self.lexisnexis = LexisNexisBridgerAdapter()
        self.gleif = GLEIFAdapter()
        # In-memory query cache: hash -> (timestamp, bundle)
        self._cache: Dict[str, Tuple[datetime, ExternalIntelligenceBundle]] = {}

    def _generate_cache_key(self, name: str, country: str, entity_type: str) -> str:
        raw = f"{name.strip().upper()}:{country.strip().upper()}:{entity_type}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def enrich_case(
        self,
        case: KYCCase,
        force_refresh: bool = False,
    ) -> Tuple[ExternalIntelligenceBundle, List[ScreeningMatch]]:
        """Fetch unified third-party intelligence from D&B, LexisNexis, and GLEIF."""
        cache_key = self._generate_cache_key(
            case.primary_name,
            case.country_of_operation,
            case.entity_type.value,
        )

        # Check cache if not forcing refresh
        if not force_refresh and cache_key in self._cache:
            _, cached_bundle = self._cache[cache_key]
            # Copy and mark cached
            bundle = cached_bundle.model_copy(update={"is_cached": True})
            return bundle, []

        is_corp = (case.entity_type == EntityType.CORPORATE)

        # 1. Fetch D&B Corporate Profile (for Corporate entities)
        dnb_prof = None
        gleif_rec = None
        if is_corp:
            b_size = case.business_size.value if case.business_size else "MEDIUM"
            dnb_prof = self.dnb.fetch_corporate_profile(
                primary_name=case.primary_name,
                country=case.country_of_operation,
                business_size=b_size,
            )
            gleif_rec = self.gleif.lookup_lei(
                primary_name=case.primary_name,
                country=case.country_of_operation,
            )

        # 2. Collect all entity names to screen via LexisNexis
        names_to_screen = [case.primary_name]
        for doc in case.documents:
            if doc.extracted_data:
                if doc.extracted_data.full_name and doc.extracted_data.full_name.value:
                    names_to_screen.append(doc.extracted_data.full_name.value)
                for dir_name in doc.extracted_data.directors or []:
                    names_to_screen.append(dir_name)
                for ubo in doc.extracted_data.ubos or []:
                    if isinstance(ubo, dict) and ubo.get("name"):
                        names_to_screen.append(ubo["name"])

        if dnb_prof and dnb_prof.verified_ubos:
            for ubo in dnb_prof.verified_ubos:
                names_to_screen.append(ubo.name)

        # 3. Screen via LexisNexis Bridger Insight
        ln_matches, ln_summary = self.lexisnexis.screen_entity(
            names_to_screen=list(set(names_to_screen)),
            country=case.country_of_operation,
            entity_type=case.entity_type,
            threshold=70.0,
        )

        # 4. Assemble External Intelligence Bundle
        prov_sig = f"SHA256:DNB_{dnb_prof.duns_number if dnb_prof else 'IND'}_LN_{ln_summary.query_hash[:8]}"
        bundle = ExternalIntelligenceBundle(
            dnb_profile=dnb_prof,
            lexisnexis_summary=ln_summary,
            gleif_record=gleif_rec,
            synced_at=datetime.utcnow(),
            is_cached=False,
            data_provenance_signature=prov_sig,
        )

        # Update cache
        self._cache[cache_key] = (datetime.utcnow(), bundle)

        # Sync key fields to CDD profile if corporate
        if is_corp and case.cdd_profile and dnb_prof:
            case.cdd_profile.duns_number = dnb_prof.duns_number
            case.cdd_profile.lei = gleif_rec.lei if gleif_rec else None
            case.cdd_profile.dnb_verified_status = f"{dnb_prof.operating_status} (PAYDEX: {dnb_prof.paydex_score})"
            if dnb_prof.annual_turnover:
                case.cdd_profile.expected_monthly_turnover = f"Annual Revenue: {dnb_prof.annual_turnover} ({dnb_prof.employee_count} FTEs)"

        return bundle, ln_matches


intelligence_manager = ExternalIntelligenceManager()
