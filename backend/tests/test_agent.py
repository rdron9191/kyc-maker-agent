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
    ScreeningMatch,
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
    assert analyzed.status in [CaseStatus.PENDING_CHECKER, CaseStatus.PENDING_L1_CHECKER, CaseStatus.MAKER_IN_PROGRESS]
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


def test_dnb_adapter_corporate_profile():
    """Verify Dun & Bradstreet Direct+ connector extracts D-U-N-S, financials, and UBO tree."""
    from backend.integrations.dnb_adapter import DunAndBradstreetAdapter
    dnb = DunAndBradstreetAdapter()
    profile = dnb.fetch_corporate_profile("Quantum Dynamics Technologies Ltd", country="GB")
    assert profile.duns_number == "08-112-4982"
    assert profile.operating_status == "ACTIVE"
    assert profile.paydex_score == 82
    assert len(profile.verified_ubos) >= 2
    assert profile.verified_ubos[0].percentage >= 25.0


def test_lexisnexis_screening_adapter():
    """Verify LexisNexis Bridger Insight adapter executes watchlists and computes query hash."""
    from backend.integrations.lexisnexis_adapter import LexisNexisBridgerAdapter
    ln = LexisNexisBridgerAdapter()
    matches, summary = ln.screen_entity(
        names_to_screen=["Tariq Al-Mansoor", "Elena Rostova"],
        country="US",
    )
    assert len(matches) >= 2
    assert summary.sanctions_count >= 1
    assert summary.pep_count >= 1
    assert summary.query_hash.startswith("SHA256:")
    assert matches[0].source_provider.startswith("LexisNexis")


def test_gleif_adapter():
    """Verify GLEIF Legal Entity Identifier lookup."""
    from backend.integrations.gleif_adapter import GLEIFAdapter
    gleif = GLEIFAdapter()
    record = gleif.lookup_lei("Apex Nordic Seafood AS", country="NO")
    assert len(record.lei) == 20
    assert record.entity_status.startswith("ACTIVE")


def test_sync_external_intelligence_api():
    """Verify live third-party sync endpoint enriches case with D&B and LexisNexis."""
    cases_res = client.get("/api/cases")
    corp_case = next(c for c in cases_res.json() if c["entity_type"] == "CORPORATE")
    
    sync_res = client.post(f"/api/cases/{corp_case['id']}/sync-external-intelligence")
    assert sync_res.status_code == 200
    synced_data = sync_res.json()
    assert synced_data["external_intelligence"] is not None
    assert synced_data["external_intelligence"]["dnb_profile"] is not None
    assert synced_data["external_intelligence"]["lexisnexis_summary"] is not None


def test_risk_based_pr_cr_cadence_matrix():
    """Verify PR/CR cadences: High risks (1 yr/12 mo), Medium (2-3 yrs/24-36 mo), Low (5 yrs/60 mo)."""
    engine = RiskEngine()
    screener = ComplianceScreener()

    # 1. High-High Risk (Sanctions hit or score >= 80)
    high_match = screener.screen("Tariq Al-Mansoor", EntityType.INDIVIDUAL, "SY", [])
    risk_high = engine.compute_risk("SY", [], [], high_match)
    assert risk_high.risk_tier == RiskTier.CRITICAL
    assert risk_high.recommended_review_cycle_months == 12  # 1 Year
    assert "1 Year" in risk_high.pr_cr_trigger_rule

    # 2. Low Risk (Clean profile, low risk country)
    risk_low = engine.compute_risk("GB", [], [], [])
    assert risk_low.risk_tier == RiskTier.LOW
    assert risk_low.recommended_review_cycle_months == 60  # 5 Years
    assert "5 Years" in risk_low.pr_cr_trigger_rule
    assert risk_low.risk_sub_tier == "LOW"


def test_auto_trigger_periodic_reviews_api():
    """Verify POST /api/periodic-review/auto-trigger and GET /api/periodic-review/schedule."""
    # 1. Schedule endpoint
    sched_res = client.get("/api/periodic-review/schedule")
    assert sched_res.status_code == 200
    rules = sched_res.json()["rules"]
    assert len(rules) == 3
    high_rule = next(r for r in rules if r["tier"] == "HIGH")
    assert high_rule["cadence_years"] == 1
    assert high_rule["cadence_months"] == 12
    low_rule = next(r for r in rules if r["tier"] == "LOW")
    assert low_rule["cadence_years"] == 5
    assert low_rule["cadence_months"] == 60

    # 2. Auto-trigger surveillance scan
    trigger_res = client.post("/api/periodic-review/auto-trigger", params={"force_all": True})
    assert trigger_res.status_code == 200
    data = trigger_res.json()
    assert data["status"] == "SUCCESS"
    assert data["triggered_count"] > 0
    assert "policy_matrix" in data


def test_queue_routing_and_assignment_apis():
    """Verify queue transition, self-claiming, releasing, and multi-tier reassignments."""
    # 1. Roster verification
    roster_res = client.get("/api/compliance-roster")
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert "MAKER" in roster and "L1_CHECKER" in roster and "L2_CHECKER" in roster and "MLRO" in roster

    # Get a test case
    cases_res = client.get("/api/cases")
    test_case = cases_res.json()[0]
    case_id = test_case["id"]

    # 2. Queue movement
    move_res = client.post(
        f"/api/cases/{case_id}/move-queue",
        json={"target_queue": "L2_CHECKER_QUEUE", "reason": "Test escalation", "actor": "Test Officer"}
    )
    assert move_res.status_code == 200
    moved_case = move_res.json()
    assert moved_case["current_queue"] == "L2_CHECKER_QUEUE"
    assert moved_case["status"] == "PENDING_L2_CHECKER"

    # 3. Claim case
    claim_res = client.post(
        f"/api/cases/{case_id}/claim",
        json={"claimant_name": "Marcus Vance", "claimant_role": "L2 Senior VP", "level": "L2_CHECKER"}
    )
    assert claim_res.status_code == 200
    claimed_case = claim_res.json()
    assert claimed_case["assigned_checker_l2"] == "Marcus Vance"

    # 4. Release case
    release_res = client.post(
        f"/api/cases/{case_id}/release",
        json={"level": "L2_CHECKER", "released_by": "Marcus Vance", "reason": "Testing release"}
    )
    assert release_res.status_code == 200
    released_case = release_res.json()
    assert "Unassigned" in released_case["assigned_checker_l2"]

    # 5. Multi-tier assignment
    assign_res = client.post(
        f"/api/cases/{case_id}/assign",
        json={"level": "MLRO", "assignee_name": "Victoria Vance", "assigned_by": "Test Lead"}
    )
    assert assign_res.status_code == 200
    assigned_case = assign_res.json()
    assert assigned_case["assigned_mlro"] == "Victoria Vance"




