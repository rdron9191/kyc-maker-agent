"""Automated Sanctions, PEP, Adverse Media, and Jurisdiction Screener."""

from typing import List, Dict, Any, Set
from difflib import SequenceMatcher
from backend.app.models import (
    ScreeningMatch,
    ScreeningType,
    EntityType,
    DocumentModel,
)
from backend.app.mock_data import (
    SANCTIONS_WATCHLIST,
    PEP_DATABASE,
    ADVERSE_MEDIA_DATABASE,
    COUNTRY_RISK_INDEX,
)
from backend.agent.verifier import names_match, string_similarity


class ComplianceScreener:
    """Performs screening against sanctions, PEP lists, adverse media, and country indices."""

    def __init__(self):
        self.sanctions_db = SANCTIONS_WATCHLIST
        self.pep_db = PEP_DATABASE
        self.media_db = ADVERSE_MEDIA_DATABASE
        self.country_risk = COUNTRY_RISK_INDEX

    def _get_entities_to_screen(
        self,
        primary_name: str,
        entity_type: EntityType,
        documents: List[DocumentModel],
    ) -> Set[str]:
        names: Set[str] = {primary_name}
        
        for doc in documents:
            if not doc.extracted_data:
                continue
            if doc.extracted_data.full_name and doc.extracted_data.full_name.value:
                names.add(doc.extracted_data.full_name.value)
            if doc.extracted_data.company_name and doc.extracted_data.company_name.value:
                names.add(doc.extracted_data.company_name.value)
            for director in doc.extracted_data.directors or []:
                names.add(director)
            for ubo in doc.extracted_data.ubos or []:
                if isinstance(ubo, dict) and ubo.get("name"):
                    names.add(ubo["name"])

        return {n.strip() for n in names if n.strip()}

    def screen(
        self,
        primary_name: str,
        entity_type: EntityType,
        country_of_operation: str,
        documents: List[DocumentModel],
    ) -> List[ScreeningMatch]:
        matches: List[ScreeningMatch] = []
        entities = self._get_entities_to_screen(primary_name, entity_type, documents)

        # 1. Sanctions Screening
        for entity in entities:
            for record in self.sanctions_db:
                target_names = [record["entity_name"]] + record.get("aliases", [])
                best_score = 0.0
                best_target = ""

                for t_name in target_names:
                    is_match, score = names_match(entity, t_name)
                    if score > best_score:
                        best_score = score
                        best_target = t_name

                if best_score >= 0.70:
                    matches.append(
                        ScreeningMatch(
                            type=ScreeningType.SANCTIONS,
                            target_name=entity,
                            matched_entity=record["entity_name"],
                            match_score=round(best_score * 100, 1),
                            list_name=record["list_name"],
                            program_or_category=record.get("program"),
                            risk_summary=record.get("remarks", "Direct match with official sanctions regime."),
                            is_false_positive=False if best_score > 0.85 else False,
                            analyst_note=f"Matched against alias/official name '{best_target}' ({int(best_score*100)}% match confidence).",
                        )
                    )

        # 2. PEP Screening
        for entity in entities:
            for record in self.pep_db:
                target_names = [record["entity_name"]] + record.get("aliases", [])
                best_score = 0.0
                best_target = ""

                for t_name in target_names:
                    is_match, score = names_match(entity, t_name)
                    if score > best_score:
                        best_score = score
                        best_target = t_name

                if best_score >= 0.70:
                    matches.append(
                        ScreeningMatch(
                            type=ScreeningType.PEP,
                            target_name=entity,
                            matched_entity=record["entity_name"],
                            match_score=round(best_score * 100, 1),
                            list_name=f"Global PEP Register ({record.get('pep_tier', 'Tier 1')})",
                            program_or_category=record.get("role"),
                            risk_summary=f"Politically Exposed Person: {record.get('role')} ({record.get('country')}, {record.get('tenure')}).",
                            is_false_positive=False,
                            analyst_note=f"Associates: {', '.join(record.get('family_associates', [])) if record.get('family_associates') else 'None recorded'}",
                        )
                    )

        # 3. Adverse Media Screening
        for entity in entities:
            for record in self.media_db:
                is_match, score = names_match(entity, record["entity_name"])
                if score >= 0.65:
                    matches.append(
                        ScreeningMatch(
                            type=ScreeningType.ADVERSE_MEDIA,
                            target_name=entity,
                            matched_entity=record["entity_name"],
                            match_score=round(score * 100, 1),
                            list_name="Adverse Media & Negative News Surveillance",
                            program_or_category=record.get("risk_category"),
                            adverse_media_headline=record.get("headline"),
                            adverse_media_source=record.get("source"),
                            adverse_media_date=record.get("date"),
                            risk_summary=record.get("summary", "Public news source mentions regulatory or criminal investigation."),
                            is_false_positive=False,
                            analyst_note=f"Published in {record.get('source')} ({record.get('date')}).",
                        )
                    )

        # 4. High-Risk Jurisdiction Check
        # Check country of operation and nationality/address countries in documents
        countries_to_check = {country_of_operation.upper()}
        for doc in documents:
            if doc.extracted_data:
                if doc.extracted_data.nationality and doc.extracted_data.nationality.value:
                    countries_to_check.add(doc.extracted_data.nationality.value.upper())
                if doc.extracted_data.country and doc.extracted_data.country.value:
                    countries_to_check.add(doc.extracted_data.country.value.upper())
                if doc.extracted_data.country_of_residence and doc.extracted_data.country_of_residence.value:
                    countries_to_check.add(doc.extracted_data.country_of_residence.value.upper())

        for c_code in countries_to_check:
            c_info = self.country_risk.get(c_code)
            if c_info and c_info.get("score", 0) >= 60:
                matches.append(
                    ScreeningMatch(
                        type=ScreeningType.JURISDICTION,
                        target_name=f"Country Code: {c_code}",
                        matched_entity=c_info.get("name", c_code),
                        match_score=float(c_info.get("score", 70)),
                        list_name=f"FATF & Country Risk Index ({c_info.get('fatf_status')})",
                        program_or_category=f"Risk Level: {c_info.get('risk_level')}",
                        risk_summary=f"Jurisdiction '{c_info.get('name')}' is categorized as {c_info.get('risk_level')} risk (Score: {c_info.get('score')}/100, FATF: {c_info.get('fatf_status')}).",
                        is_false_positive=False,
                        analyst_note="Enhanced territorial risk monitoring applies.",
                    )
                )

        return matches
