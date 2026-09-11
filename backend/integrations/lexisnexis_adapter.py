"""LexisNexis Bridger Insight XG / WorldCompliance Screening Adapter."""

import os
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.app.models import (
    ScreeningMatch,
    ScreeningType,
    AlertDisposition,
    EntityType,
    LexisNexisScreeningSummary,
)
from backend.app.mock_data import (
    SANCTIONS_WATCHLIST,
    PEP_DATABASE,
    ADVERSE_MEDIA_DATABASE,
)
from backend.agent.verifier import names_match


class LexisNexisBridgerAdapter:
    """Adapter for LexisNexis Bridger Insight XG & WorldCompliance API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("LEXISNEXIS_API_KEY", "MOCK_LEXISNEXIS_BRIDGER_KEY")
        self.api_endpoint = os.getenv("LEXISNEXIS_ENDPOINT", "https://api.lexisnexis.com/bridger/v1/screen")

    def compute_query_hash(self, entity_name: str, country: str) -> str:
        """Compute cryptographic audit hash of the screening query."""
        raw = f"LN:{entity_name.strip().upper()}:{country.strip().upper()}:{datetime.utcnow().strftime('%Y-%m-%d')}"
        return f"SHA256:{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:16]}"

    def screen_entity(
        self,
        names_to_screen: List[str],
        country: str,
        entity_type: EntityType = EntityType.CORPORATE,
        threshold: float = 70.0,
    ) -> (List[ScreeningMatch], LexisNexisScreeningSummary):
        """Execute watchlists, PEP, and adverse media screening via LexisNexis Bridger Insight."""
        matches: List[ScreeningMatch] = []
        sanctions_hits = 0
        pep_hits = 0
        media_hits = 0

        for entity in names_to_screen:
            if not entity or len(entity.strip()) < 2:
                continue
            
            # 1. Sanctions Screening
            for record in SANCTIONS_WATCHLIST:
                targets = [record["entity_name"]] + record.get("aliases", [])
                for t in targets:
                    is_match, score = names_match(entity, t)
                    if score * 100 >= threshold:
                        sanctions_hits += 1
                        matches.append(
                            ScreeningMatch(
                                type=ScreeningType.SANCTIONS,
                                target_name=entity,
                                matched_entity=record["entity_name"],
                                match_score=round(score * 100, 1),
                                list_name=f"LexisNexis Watchlist: {record['list_name']}",
                                program_or_category=record.get("program"),
                                risk_summary=record.get("remarks", "Direct match against LexisNexis global sanctions registry."),
                                source_provider="LexisNexis Bridger Insight XG / WorldCompliance",
                                provider_hit_id=f"LN-SANC-{abs(hash(record['entity_name'])) % 1000000}",
                                disposition=AlertDisposition.UNRESOLVED,
                            )
                        )
                        break

            # 2. PEP Screening
            for record in PEP_DATABASE:
                targets = [record["entity_name"]] + record.get("aliases", [])
                for t in targets:
                    is_match, score = names_match(entity, t)
                    if score * 100 >= threshold:
                        pep_hits += 1
                        matches.append(
                            ScreeningMatch(
                                type=ScreeningType.PEP,
                                target_name=entity,
                                matched_entity=record["entity_name"],
                                match_score=round(score * 100, 1),
                                list_name=f"LexisNexis PEP Tier: {record['pep_tier']}",
                                program_or_category=f"{record.get('role')} ({record.get('country')})",
                                risk_summary=f"LexisNexis PEP Profile: {record.get('role')} in {record.get('country')}. Direct ministerial linkage.",
                                source_provider="LexisNexis WorldCompliance PEP Directory",
                                provider_hit_id=f"LN-PEP-{abs(hash(record['entity_name'])) % 1000000}",
                                disposition=AlertDisposition.UNRESOLVED,
                            )
                        )
                        break

            # 3. Adverse Media Screening
            for record in ADVERSE_MEDIA_DATABASE:
                targets = [record["entity_name"]]
                cat = record.get("risk_category", record.get("category", "FINANCIAL_CRIME"))
                for t in targets:
                    is_match, score = names_match(entity, t)
                    if score * 100 >= threshold:
                        media_hits += 1
                        matches.append(
                            ScreeningMatch(
                                type=ScreeningType.ADVERSE_MEDIA,
                                target_name=entity,
                                matched_entity=record["entity_name"],
                                match_score=round(score * 100, 1),
                                list_name=f"LexisNexis Adverse Media: {cat}",
                                program_or_category=cat,
                                adverse_media_headline=record.get("headline"),
                                adverse_media_source=record.get("source"),
                                adverse_media_date=record.get("date"),
                                risk_summary=record.get("summary", "Adverse media report identified in LexisNexis news repository."),
                                source_provider="LexisNexis Negative News Intelligence",
                                provider_hit_id=f"LN-NEWS-{abs(hash(record.get('headline', 'news'))) % 1000000}",
                                disposition=AlertDisposition.UNRESOLVED,
                            )
                        )
                        break

        # Generate summary
        primary_search = names_to_screen[0] if names_to_screen else "Unknown"
        summary = LexisNexisScreeningSummary(
            query_hash=self.compute_query_hash(primary_search, country),
            search_timestamp=datetime.utcnow(),
            provider_source="LexisNexis Bridger Insight XG / WorldCompliance",
            total_hits=len(matches),
            sanctions_count=sanctions_hits,
            pep_count=pep_hits,
            adverse_media_count=media_hits,
            search_confidence_threshold=threshold,
            status="COMPLETED",
        )

        return matches, summary
