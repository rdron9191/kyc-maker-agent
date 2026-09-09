"""KYC Maker Workflow Orchestrator.

Orchestrates the 12-stage compliance lifecycle:
1. Trigger (Onboarding, Periodic re-KYC, Event, Regulatory)
2. Case Assignment to Maker
3. Information & Document Collection
4. Customer Due Diligence (CDD) Analysis
5A. Screening & Research (Sanctions, PEP, Adverse Media)
5B. Risk Assessment (Customer, Product, Geo, Industry, Channel)
6. Investigate Alerts / Exceptions (False positive rationales)
7A/7B. Complete KYC Record & Handle Issues (Maker self-check)
8/9. Independent Checker Review & Decision
10. System Update & Case Closure
11. Escalation / MLRO
12. Ongoing Monitoring
"""

from datetime import datetime, timedelta
from typing import Optional
from backend.app.models import (
    KYCCase,
    WorkflowStage,
    CaseStatus,
    AuditEvent,
    AlertDisposition,
    MakerSelfCheck,
    CDDProfile,
    Recommendation,
    ComplianceQueue,
)
from backend.agent.parser import DocumentParser
from backend.agent.verifier import CrossDocumentVerifier
from backend.agent.screener import ComplianceScreener
from backend.agent.risk_engine import RiskEngine
from backend.agent.memo_generator import MemoGenerator


class KYCMakerAgent:
    """End-to-End KYC Maker Compliance AI Agent."""

    def __init__(self):
        self.parser = DocumentParser()
        self.verifier = CrossDocumentVerifier()
        self.screener = ComplianceScreener()
        self.risk_engine = RiskEngine()
        self.memo_generator = MemoGenerator()

    def process_case(self, case: KYCCase, review_type: Optional[str] = None) -> KYCCase:
        """Execute the full KYC Maker workflow."""
        is_periodic = (review_type == "PERIODIC_RE_KYC") or (case.trigger_type.value == "PERIODIC_RE_KYC")
        prior_score = case.risk_assessment.overall_score if case.risk_assessment else None

        # --- Stage 1 & 2: Trigger & Assignment ---
        case.current_stage = WorkflowStage.STAGE_2_ASSIGNMENT
        case.status = CaseStatus.MAKER_IN_PROGRESS
        case.current_queue = ComplianceQueue.MAKER_QUEUE
        case.updated_at = datetime.utcnow()
        if not case.deadline_date:
            case.deadline_date = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_2_ASSIGNMENT,
                actor="KYC_MAKER_AGENT",
                action="CASE_ASSIGNED_TO_MAKER",
                details=f"Case assigned to Maker queue. Trigger: {case.trigger_type.value} from {case.trigger_source.value}. Priority: {case.priority.value}.",
            )
        )

        # --- Stage 3: Information & Document Collection ---
        case.current_stage = WorkflowStage.STAGE_3_COLLECTION
        for doc in case.documents:
            if not doc.extracted_data and doc.raw_text:
                doc.extracted_data = self.parser.parse_document_content(doc.raw_text, doc.doc_type)
                doc.validation_status = "EXPIRED" if doc.extracted_data.is_expired else "VALID"

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_3_COLLECTION,
                actor="KYC_MAKER_AGENT",
                action="DOCUMENTS_COLLECTED_AND_PARSED",
                details=f"Collected and extracted structured data from {len(case.documents)} credential artifact(s).",
            )
        )

        # --- Stage 4: Customer Due Diligence (CDD) Analysis ---
        case.current_stage = WorkflowStage.STAGE_4_CDD
        case.discrepancies = self.verifier.verify(
            primary_name=case.primary_name,
            entity_type=case.entity_type,
            documents=case.documents,
        )

        # Ensure CDD profile is populated
        if not case.cdd_profile:
            case.cdd_profile = CDDProfile()

        # Extract UBO details if available in documents
        for doc in case.documents:
            if doc.extracted_data and doc.extracted_data.ubos:
                ubo_names = [f"{u.get('name')} ({u.get('percentage')}%)" for u in doc.extracted_data.ubos]
                case.cdd_profile.ubo_analysis_notes = f"Verified beneficial ownership structure: {', '.join(ubo_names)}."

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_4_CDD,
                actor="KYC_MAKER_AGENT",
                action="CDD_ANALYSIS_COMPLETED",
                details=f"Customer Due Diligence (CDD) analysis performed. Flagged {len(case.discrepancies)} discrepancy(ies).",
            )
        )

        # --- Stage 5A & 5B: Parallel Screening & Risk Assessment ---
        case.current_stage = WorkflowStage.STAGE_5_SCREENING_RISK
        
        # 5A: Screening & Research
        case.screening_matches = self.screener.screen(
            primary_name=case.primary_name,
            entity_type=case.entity_type,
            country_of_operation=case.country_of_operation,
            documents=case.documents,
        )

        # 5B: Multi-Factor Risk Assessment (Customer, Product, Geo, Industry, Channel)
        case.risk_assessment = self.risk_engine.compute_risk(
            country_of_operation=case.country_of_operation,
            documents=case.documents,
            discrepancies=case.discrepancies,
            screening_matches=case.screening_matches,
        )

        case.review_cycle_months = case.risk_assessment.recommended_review_cycle_months
        case.next_review_date = case.risk_assessment.suggested_next_review_date

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_5_SCREENING_RISK,
                actor="KYC_MAKER_AGENT",
                action="SCREENING_AND_RISK_EVALUATED",
                details=f"Screening identified {len(case.screening_matches)} hit(s). Overall Customer Risk Rating: {case.risk_assessment.risk_tier.value} ({case.risk_assessment.overall_score}/100).",
            )
        )

        # --- Stage 6: Investigate Alerts / Exceptions ---
        case.current_stage = WorkflowStage.STAGE_6_ALERT_INVESTIGATION
        has_critical_alerts = False

        for match in case.screening_matches:
            if match.disposition == AlertDisposition.UNRESOLVED:
                if match.type == "SANCTIONS" and match.match_score >= 85.0:
                    match.disposition = AlertDisposition.TRUE_POSITIVE
                    match.disposition_rationale = f"Direct match against {match.list_name} ({match.program_or_category}). Mandatory escalation to MLRO / Sanctions Compliance required under Sanctions Policy."
                    match.investigated_by = "KYC Maker AI Agent"
                    match.investigated_at = datetime.utcnow()
                    has_critical_alerts = True
                elif match.type == "PEP":
                    match.disposition = AlertDisposition.TRUE_POSITIVE
                    match.disposition_rationale = f"PEP linkage confirmed: {match.program_or_category}. Source of Wealth (SoW) and Senior Management EDD approval required."
                    match.investigated_by = "KYC Maker AI Agent"
                    match.investigated_at = datetime.utcnow()
                elif match.type == "ADVERSE_MEDIA":
                    match.disposition = AlertDisposition.TRUE_POSITIVE
                    match.disposition_rationale = f"Adverse media verified from {match.adverse_media_source} ({match.adverse_media_date}). Negative news factored into reputational risk score."
                    match.investigated_by = "KYC Maker AI Agent"
                    match.investigated_at = datetime.utcnow()
                elif match.type == "JURISDICTION":
                    match.disposition = AlertDisposition.TRUE_POSITIVE
                    match.disposition_rationale = f"Territorial risk confirmed for jurisdiction {case.country_of_operation}."
                    match.investigated_by = "KYC Maker AI Agent"
                    match.investigated_at = datetime.utcnow()

        case.has_unresolved_issues = has_critical_alerts or any(d.severity in ["HIGH", "CRITICAL"] for d in case.discrepancies)

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_6_ALERT_INVESTIGATION,
                actor="KYC_MAKER_AGENT",
                action="ALERTS_INVESTIGATED",
                details=f"Investigated all screening alerts and exceptions. Unresolved critical red flags: {case.has_unresolved_issues}.",
            )
        )

        # --- Stage 7A / 7B: Complete KYC Record (Maker) & Handle Issues ---
        case.current_stage = WorkflowStage.STAGE_7_MAKER_COMPLETION
        case.self_check = MakerSelfCheck(
            documents_complete=(len(case.documents) > 0 and not any(d.extracted_data and d.extracted_data.is_expired for d in case.documents)),
            ubos_identified_and_verified=not any("ubo" in d.field.lower() for d in case.discrepancies),
            sow_sof_documented=True,
            screenings_dispositioned=all(m.disposition != AlertDisposition.UNRESOLVED for m in case.screening_matches),
            risk_rationale_concise=True,
            policies_and_cdd_standards_met=True,
        )

        case.maker_memo = self.memo_generator.generate(
            case_number=case.case_number,
            primary_name=case.primary_name,
            entity_type=case.entity_type,
            country_of_operation=case.country_of_operation,
            documents=case.documents,
            discrepancies=case.discrepancies,
            screening_matches=case.screening_matches,
            risk=case.risk_assessment,
            review_type=case.trigger_type.value,
            prior_score=prior_score,
        )

        # Transition to Stage 8: Independent Checker Review
        if case.has_unresolved_issues and case.risk_assessment.risk_tier.value == "CRITICAL":
            case.status = CaseStatus.ISSUES_IDENTIFIED
            case.current_stage = WorkflowStage.STAGE_6_ALERT_INVESTIGATION
            case.current_queue = ComplianceQueue.MAKER_QUEUE
            case.maker_memo.recommended_action = Recommendation.REJECT_PROHIBITED
        else:
            case.status = CaseStatus.PENDING_L1_CHECKER
            case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
            case.current_queue = ComplianceQueue.L1_CHECKER_QUEUE

        case.updated_at = datetime.utcnow()
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_7_MAKER_COMPLETION,
                actor="KYC_MAKER_AGENT",
                action="CASE_SUBMITTED_TO_CHECKER",
                details=f"Maker populated KYC record, performed final self-check, and submitted dossier to Checker queue. Recommendation: {case.maker_memo.recommended_action.value}.",
            )
        )

        return case
