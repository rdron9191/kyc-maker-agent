"""Customer Risk Rating (CRR) Engine for KYC Maker AI Agent."""

from typing import List
from backend.app.models import (
    RiskAssessment,
    RiskTier,
    RiskFactor,
    Discrepancy,
    ScreeningMatch,
    ScreeningType,
    DiscrepancySeverity,
    DocumentModel,
)
from backend.app.mock_data import COUNTRY_RISK_INDEX


class RiskEngine:
    """Computes transparent, auditable Customer Risk Ratings."""

    def compute_risk(
        self,
        country_of_operation: str,
        documents: List[DocumentModel],
        discrepancies: List[Discrepancy],
        screening_matches: List[ScreeningMatch],
    ) -> RiskAssessment:
        factors: List[RiskFactor] = []

        # 1. Identity & Document Factor (Weight: 0.20)
        doc_score = 0.0
        doc_reasons = []
        if not documents:
            doc_score = 90.0
            doc_reasons.append("No documents provided.")
        else:
            expired_docs = [d for d in documents if d.extracted_data and d.extracted_data.is_expired]
            if expired_docs:
                doc_score += 50.0
                doc_reasons.append(f"{len(expired_docs)} expired document(s) detected.")
            
            discrepancy_score = 0.0
            for disc in discrepancies:
                if disc.severity == DiscrepancySeverity.CRITICAL:
                    discrepancy_score += 40.0
                elif disc.severity == DiscrepancySeverity.HIGH:
                    discrepancy_score += 25.0
                elif disc.severity == DiscrepancySeverity.MEDIUM:
                    discrepancy_score += 15.0
                else:
                    discrepancy_score += 5.0
            
            doc_score = min(100.0, doc_score + discrepancy_score)
            if not doc_reasons and not discrepancies:
                doc_score = 10.0
                doc_reasons.append("Documents are valid, unexpired, and cross-verified.")
            elif discrepancies:
                doc_reasons.append(f"{len(discrepancies)} data consistency discrepancy(ies) flagged.")

        factors.append(
            RiskFactor(
                category="Identity & Verification",
                factor_name="Document Authenticity & Consistency",
                score=round(doc_score, 1),
                weight=0.20,
                contribution=round(doc_score * 0.20, 1),
                reasoning="; ".join(doc_reasons),
            )
        )

        # 2. Jurisdiction Risk Factor (Weight: 0.20)
        c_info = COUNTRY_RISK_INDEX.get(country_of_operation.upper(), {"score": 25, "risk_level": "LOW", "fatf_status": "STANDARD"})
        geo_score = float(c_info.get("score", 25))
        jurisdiction_hits = [m for m in screening_matches if m.type == ScreeningType.JURISDICTION]
        if jurisdiction_hits:
            highest_geo = max([m.match_score for m in jurisdiction_hits] + [geo_score])
            geo_score = highest_geo

        factors.append(
            RiskFactor(
                category="Jurisdiction",
                factor_name="Territorial & FATF Country Risk",
                score=round(geo_score, 1),
                weight=0.20,
                contribution=round(geo_score * 0.20, 1),
                reasoning=f"Country of operation ({country_of_operation}): {c_info.get('risk_level', 'LOW')} risk tier (FATF status: {c_info.get('fatf_status')}).",
            )
        )

        # 3. PEP Exposure Factor (Weight: 0.20)
        pep_matches = [m for m in screening_matches if m.type == ScreeningType.PEP]
        if pep_matches:
            pep_score = 85.0
            pep_reasons = [f"Direct PEP match on {m.matched_entity} ({m.program_or_category})" for m in pep_matches]
        else:
            pep_score = 5.0
            pep_reasons = ["No Politically Exposed Person (PEP) indicators detected."]

        factors.append(
            RiskFactor(
                category="Political Exposure",
                factor_name="PEP & Public Official Ties",
                score=round(pep_score, 1),
                weight=0.20,
                contribution=round(pep_score * 0.20, 1),
                reasoning="; ".join(pep_reasons),
            )
        )

        # 4. Sanctions & Watchlist Factor (Weight: 0.30)
        sanction_matches = [m for m in screening_matches if m.type == ScreeningType.SANCTIONS]
        if sanction_matches:
            sanction_score = 100.0
            sanction_reasons = [f"HIT: {m.matched_entity} on {m.list_name} (Match: {m.match_score}%)" for m in sanction_matches]
        else:
            sanction_score = 0.0
            sanction_reasons = ["Zero matches across OFAC, EU, UN, and international sanctions registries."]

        factors.append(
            RiskFactor(
                category="Sanctions & Watchlists",
                factor_name="Global Watchlist Matching",
                score=round(sanction_score, 1),
                weight=0.30,
                contribution=round(sanction_score * 0.30, 1),
                reasoning="; ".join(sanction_reasons),
            )
        )

        # 5. Adverse Media Factor (Weight: 0.10)
        media_matches = [m for m in screening_matches if m.type == ScreeningType.ADVERSE_MEDIA]
        if media_matches:
            media_score = 80.0
            media_reasons = [f"Adverse media reported: '{m.adverse_media_headline}' ({m.program_or_category})" for m in media_matches]
        else:
            media_score = 5.0
            media_reasons = ["No adverse media or negative regulatory news detected."]

        factors.append(
            RiskFactor(
                category="Adverse Media",
                factor_name="Reputational & Criminal News Surveillance",
                score=round(media_score, 1),
                weight=0.10,
                contribution=round(media_score * 0.10, 1),
                reasoning="; ".join(media_reasons),
            )
        )

        # Calculate Overall Score
        overall_score = sum(f.contribution for f in factors)
        
        # Hard Critical Rule: Sanctions match forces score to >= 95
        if sanction_matches:
            overall_score = max(overall_score, 98.0)
        # High Risk Rule: PEP with adverse media or high-risk jurisdiction triggers EDD (>= 75)
        elif pep_matches and (media_matches or geo_score >= 40):
            overall_score = max(overall_score, 76.0)
        elif pep_matches:
            overall_score = max(overall_score, 70.0)

        # Assign Risk Tier & Periodic Review Cadence
        if overall_score >= 90.0:
            tier = RiskTier.CRITICAL
            dd = "Prohibited Onboarding / Mandatory Compliance Escalation"
            review_cycle_months = 3
        elif overall_score >= 70.0:
            tier = RiskTier.HIGH
            dd = "Enhanced Due Diligence (EDD) Required"
            review_cycle_months = 12
        elif overall_score >= 30.0:
            tier = RiskTier.MEDIUM
            dd = "Standard Due Diligence (SDD) with Active Monitoring"
            review_cycle_months = 24
        else:
            tier = RiskTier.LOW
            dd = "Standard Due Diligence (SDD) - Low Risk"
            review_cycle_months = 36

        # Calculate suggested next review date
        from datetime import datetime, timedelta
        next_date = (datetime.utcnow() + timedelta(days=review_cycle_months * 30)).strftime("%Y-%m-%d")

        summary_text = (
            f"Overall Customer Risk Rating is {tier.value} ({round(overall_score, 1)}/100). "
            f"{'Critical watchlist hits require prohibition.' if tier == RiskTier.CRITICAL else 'Enhanced Due Diligence required prior to account activation.' if tier == RiskTier.HIGH else 'Clean risk profile suitable for standard onboarding.'} "
            f"Mandatory Periodic Review cycle: Every {review_cycle_months} months."
        )

        return RiskAssessment(
            overall_score=round(overall_score, 1),
            risk_tier=tier,
            recommended_due_diligence=dd,
            recommended_review_cycle_months=review_cycle_months,
            suggested_next_review_date=next_date,
            factors=factors,
            summary=summary_text,
        )
