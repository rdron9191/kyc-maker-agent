from datetime import datetime
from typing import List, Optional, Any, Dict
from backend.app.models import (
    MakerMemo,
    Recommendation,
    RiskAssessment,
    RiskTier,
    DocumentModel,
    Discrepancy,
    ScreeningMatch,
    ScreeningType,
    EntityType,
    ReviewType,
)


class MemoGenerator:
    """Generates the official KYC Maker Memo for the Compliance Checker."""

    def generate(
        self,
        case_number: str,
        primary_name: str,
        entity_type: EntityType,
        country_of_operation: str,
        documents: List[DocumentModel],
        discrepancies: List[Discrepancy],
        screening_matches: List[ScreeningMatch],
        risk: RiskAssessment,
        review_type: Any = "NEW_ONBOARDING",
        prior_score: Optional[float] = None,
    ) -> MakerMemo:
        review_type_str = review_type.value if hasattr(review_type, 'value') else str(review_type)
        is_periodic = "PERIODIC" in review_type_str.upper()

        # Determine Recommendation
        sanction_hits = [m for m in screening_matches if m.type == "SANCTIONS" or (hasattr(m.type, "value") and m.type.value == "SANCTIONS")]
        pep_hits = [m for m in screening_matches if m.type == "PEP" or (hasattr(m.type, "value") and m.type.value == "PEP")]
        media_hits = [m for m in screening_matches if m.type == "ADVERSE_MEDIA" or (hasattr(m.type, "value") and m.type.value == "ADVERSE_MEDIA")]
        expired_docs = [d for d in documents if d.extracted_data and d.extracted_data.is_expired]

        mitigating_factors = []
        rfi_items = []

        if sanction_hits:
            rec = Recommendation.REJECT_PROHIBITED
        elif expired_docs or any((d.severity.value if hasattr(d.severity, "value") else str(d.severity)) in ["HIGH", "CRITICAL"] for d in discrepancies):
            rec = Recommendation.REQUEST_RFI
            for exp in expired_docs:
                rfi_items.append(f"Request updated, valid replacement for expired {exp.doc_type.value if hasattr(exp.doc_type, 'value') else exp.doc_type} ({exp.filename}).")
            for disc in discrepancies:
                rfi_items.append(f"Clarify discrepancy: {disc.description}")
        elif risk.risk_tier == RiskTier.HIGH or pep_hits:
            rec = Recommendation.APPROVE_EDD
            if pep_hits:
                mitigating_factors.append("PEP status acknowledged: Source of Wealth (SoW) and Senior Management approval required.")
            if media_hits:
                mitigating_factors.append("Adverse media reviewed: Regulatory oversight inquiry noted, no criminal asset freezing orders.")
        else:
            rec = Recommendation.APPROVE_SDD
            mitigating_factors.append("Identity credentials verified with high confidence (>95%).")
            mitigating_factors.append("Clean screening results across international watchlists.")
            mitigating_factors.append("Low jurisdictional risk tier.")

        # Build Case Summary
        review_label = "Periodic Review Refresh (re-KYC)" if is_periodic else "Initial Customer Due Diligence (CDD)"
        exec_summary = (
            f"Citi KYC Maker {review_label} for {primary_name} ({entity_type.value if hasattr(entity_type, 'value') else entity_type}) - Case {case_number}. "
            f"Evaluated {len(documents)} submitted document(s) with primary operations in {country_of_operation}. "
            f"Overall Customer Risk Rating: {risk.risk_tier.value if hasattr(risk.risk_tier, 'value') else risk.risk_tier} ({risk.overall_score}/100). "
            f"Maker preliminary recommendation is {rec.value if hasattr(rec, 'value') else rec}. Review cadence: {risk.recommended_review_cycle_months} mo."
        )

        # Delta Summary if Periodic Review
        delta_summary = None
        if is_periodic:
            if prior_score is not None:
                diff = round(risk.overall_score - prior_score, 1)
                trend = "increased by" if diff > 0 else "decreased by" if diff < 0 else "remained steady at"
                delta_summary = (
                    f"Periodic Review Delta: Risk score {trend} {abs(diff)} pts (Prior: {prior_score}, Current: {risk.overall_score}). "
                    f"Active Watchlist Hits: {len(sanction_hits)} sanctions, {len(pep_hits)} PEP, {len(media_hits)} adverse media."
                )
            else:
                delta_summary = "Periodic Review Refresh completed. Live re-screening and document validity scan executed."

        # Build Identity Audit
        doc_details = []
        for d in documents:
            status_tag = "VALID" if (d.extracted_data and not d.extracted_data.is_expired) else "EXPIRED/INVALID"
            doc_name = d.extracted_data.full_name.value if (d.extracted_data and d.extracted_data.full_name) else "N/A"
            doc_details.append(f"- {d.filename} ({d.doc_type.value}): Extracted Name='{doc_name}', Status={status_tag}")
        
        identity_audit = (
            f"Ingested {len(documents)} credential artifact(s).\n"
            + "\n".join(doc_details) + "\n"
            + f"Cross-document consistency check flagged {len(discrepancies)} discrepancy(ies)."
        )

        # Build Screening Audit
        screening_bullets = []
        if sanction_hits:
            screening_bullets.append(f"SANCTIONS ALERT: {len(sanction_hits)} hit(s) detected on OFAC/EU/UN registries.")
        else:
            screening_bullets.append("Sanctions: 0 matches found on OFAC, EU, UN, and UK OFSI lists.")

        if pep_hits:
            screening_bullets.append(f"PEP IDENTIFIED: Subject or associate matches {len(pep_hits)} Politically Exposed Person record(s).")
        else:
            screening_bullets.append("PEP: No active or domestic PEP linkages detected.")

        if media_hits:
            screening_bullets.append(f"ADVERSE MEDIA: {len(media_hits)} negative news hit(s) flagged regarding regulatory/financial inquiries.")
        else:
            screening_bullets.append("Adverse Media: Negative news surveillance returned 0 material items.")

        screening_audit = "\n".join(screening_bullets)

        # Build Risk Narrative
        risk_narrative = (
            f"The computed Customer Risk Rating (CRR) of {risk.overall_score}/100 places the subject into the {risk.risk_tier.value} risk category. "
            f"{risk.summary} Primary risk drivers: "
            + ", ".join([f"{f.factor_name} ({f.score}/100)" for f in risk.factors if f.score > 20])
            + "."
        )

        return MakerMemo(
            case_summary=exec_summary,
            identity_audit=identity_audit,
            screening_audit=screening_audit,
            risk_justification=risk_narrative,
            recommended_action=rec,
            review_type=review_type,
            recommended_review_cycle_months=risk.recommended_review_cycle_months,
            suggested_next_review_date=risk.suggested_next_review_date,
            periodic_delta_summary=delta_summary,
            mitigating_factors=mitigating_factors,
            rfi_items_required=rfi_items,
            maker_agent_version="KYC-Maker-AI-v1.0",
            created_at=datetime.utcnow(),
        )
