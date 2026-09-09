"""Automated Test Suite for KYC Maker AI Agent."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models import (
    KYCCase,
    EntityType,
    DocumentModel,
    DocumentType,
    CaseStatus,
    RiskTier,
    Recommendation,
)
from backend.agent.parser import DocumentParser, parse_mrz
from backend.agent.verifier import CrossDocumentVerifier, names_match
from backend.agent.screener import ComplianceScreener
from backend.agent.risk_engine import RiskEngine
from backend.agent.orchestrator import KYCMakerAgent

client = TestClient(app)


def test_mrz_parsing():
    """Verify ICAO 9303 MRZ parser extracts identity, dates, and validity correctly."""
    mrz = "P<USAWRIGHT<<ALEXANDER<JAMES<<<<<<<<<<<<<<<\n5489021348USA8806144M3104097<<<<<<<<<<<<<<06"
    res = parse_mrz(mrz)
    assert res["valid"] is True
    assert res["first_name"] == "ALEXANDER JAMES"
    assert res["last_name"] == "WRIGHT"
    assert res["nationality"] == "USA"
    assert res["document_number"] == "548902134"
    assert res["gender"] == "M"
    assert res["is_expired"] is False


def test_names_match_fuzzy():
    """Verify fuzzy matching handles middle names and variations."""
    matched, score = names_match("Alexander James Wright", "Alexander Wright")
    assert matched is True
    assert score >= 0.75

    matched, score = names_match("Elena Petrovna Rostova", "Elena Rostova")
    assert matched is True
    assert score >= 0.75

    matched, score = names_match("Alexander Wright", "Viktor Kozlov")
    assert matched is False
    assert score < 0.5


def test_cross_verifier_flags_expired_doc():
    """Verify expired document is flagged as HIGH severity discrepancy."""
    verifier = CrossDocumentVerifier()
    doc = DocumentModel(
        filename="expired_id.pdf",
        doc_type=DocumentType.NATIONAL_ID,
        raw_text="NATIONAL ID\nName: John Doe\nExpiry: 2020-01-01 (EXPIRED)",
    )
    doc.extracted_data = DocumentParser().parse_document_content(doc.raw_text, doc.doc_type)
    discrepancies = verifier.verify("John Doe", EntityType.INDIVIDUAL, [doc])
    
    assert any(d.field == "document_validity" for d in discrepancies)


def test_compliance_screener_sanctions_hit():
    """Verify screener catches known OFAC sanctions target."""
    screener = ComplianceScreener()
    matches = screener.screen("Tariq Al-Mansoor", EntityType.INDIVIDUAL, "SY", [])
    
    sanction_matches = [m for m in matches if m.type == "SANCTIONS" or (hasattr(m.type, 'value') and m.type.value == "SANCTIONS")]
    assert len(sanction_matches) >= 1
    assert "OFAC SDN" in sanction_matches[0].list_name
    assert sanction_matches[0].match_score >= 85.0


def test_risk_engine_critical_for_sanctions():
    """Verify risk engine assigns CRITICAL tier to sanctions matches."""
    screener = ComplianceScreener()
    risk_engine = RiskEngine()
    
    matches = screener.screen("Tariq Al-Mansoor", EntityType.INDIVIDUAL, "SY", [])
    risk = risk_engine.compute_risk("SY", [], [], matches)
    
    assert risk.risk_tier == RiskTier.CRITICAL
    assert risk.overall_score >= 90.0


def test_end_to_end_maker_pipeline_clean_case():
    """Verify end-to-end maker processing for clean low-risk profile."""
    agent = KYCMakerAgent()
    doc = DocumentModel(
        filename="passport.pdf",
        doc_type=DocumentType.PASSPORT,
        raw_text="P<USAWRIGHT<<ALEXANDER<JAMES<<<<<<<<<<<<<<<\n5489021348USA8806144M3104097<<<<<<<<<<<<<<06",
    )
    case = KYCCase(
        case_number="KYC-TEST-001",
        entity_type=EntityType.INDIVIDUAL,
        primary_name="Alexander James Wright",
        country_of_operation="US",
        status=CaseStatus.DRAFT,
        documents=[doc],
    )
    
    analyzed = agent.process_case(case)
    assert analyzed.status in [CaseStatus.PENDING_CHECKER, CaseStatus.PENDING_L1_CHECKER]
    assert analyzed.risk_assessment.risk_tier == RiskTier.LOW
    assert analyzed.maker_memo.recommended_action == Recommendation.APPROVE_SDD


def test_api_endpoints():
    """Verify REST API routes for listing, creating, and deciding cases."""
    # List cases
    res = client.get("/api/cases")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4

    # Stats
    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_cases"] >= 4
    assert stats["high_or_critical_risk"] >= 2

    # Checker decision on a case
    first_case_id = data[0]["id"]
    decision_payload = {
        "decision": "APPROVED_SDD",
        "checker_name": "Compliance Supervisor Jane",
        "comments": "Audited Maker findings and confirmed valid proof of identity.",
    }
    dec_res = client.post(f"/api/cases/{first_case_id}/decision", json=decision_payload)
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["status"] == "APPROVED_SDD"
    assert dec_data["checker_review"]["checker_name"] == "Compliance Supervisor Jane"
    assert dec_data["next_review_date"] is not None


def test_periodic_review_flow():
    """Verify triggering periodic review re-evaluates risk and updates memo."""
    cases_res = client.get("/api/cases")
    first_case_id = cases_res.json()[0]["id"]

    # Trigger Periodic Review
    pr_res = client.post(f"/api/cases/{first_case_id}/periodic-review")
    assert pr_res.status_code == 200
    pr_data = pr_res.json()
    assert pr_data["trigger_type"] == "PERIODIC_RE_KYC"
    assert pr_data["maker_memo"]["periodic_delta_summary"] is not None

