"""FastAPI REST API for KYC Maker AI Agent."""

import io
import uuid
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import copy
from backend.app.models import (
    KYCOContacts,
    KYCCase,
    CaseCreateRequest,
    CaseDecisionRequest,
    AlertDispositionRequest,
    CaseMoveQueueRequest,
    CaseAssignRequest,
    CaseClaimRequest,
    CaseReleaseRequest,
    DocumentModel,
    DocumentType,
    CaseStatus,
    ComplianceQueue,
    WorkflowStage,
    CheckerReview,
    MLROEscalation,
    AuditEvent,
    PeriodicReviewRecord,
    KYCTriggerType,
    KYCTriggerSource,
    PriorityLevel,
)
from backend.app.mock_data import COMPLIANCE_ROSTER
from backend.app.database import db
from backend.agent.orchestrator import KYCMakerAgent

app = FastAPI(
    title="KYC Maker AI Agent API",
    description="Detailed process flow implementation for KYC Maker – from case trigger to checker submission and closure.",
    version="2.0.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = KYCMakerAgent()


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "kyc-maker-agent", "timestamp": datetime.utcnow().isoformat()}


@app.put("/api/cases/{case_id}/kyco-contacts", response_model=KYCCase)
def save_kyco_contacts(case_id: str, payload: KYCOContacts):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    import re
    for role in ("kyco_email", "pam_email"):
        address = getattr(payload, role).strip()
        if not re.fullmatch(r"[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+", address):
            raise HTTPException(status_code=422, detail="Both KYCO and PAM require a valid email assignment.")
        setattr(payload, role, address)
    case.kyco_contacts = payload
    case.audit_trail.append(AuditEvent(actor="COMPLIANCE_OFFICER", action="KYCO_CONTACTS_UPDATED", details="Updated KYCO contacts and document request draft."))
    return db.save_case(case)


@app.get("/api/stats")
def get_stats():
    cases = db.list_cases()
    total = len(cases)
    now_str = datetime.utcnow().strftime("%Y-%m-%d")

    maker_queue = sum(1 for c in cases if c.current_queue == ComplianceQueue.MAKER_QUEUE)
    l1_checker_queue = sum(1 for c in cases if c.current_queue == ComplianceQueue.L1_CHECKER_QUEUE)
    l2_checker_queue = sum(1 for c in cases if c.current_queue == ComplianceQueue.L2_CHECKER_QUEUE)
    mlro_queue = sum(1 for c in cases if c.current_queue == ComplianceQueue.MLRO_QUEUE)
    monitoring_queue = sum(1 for c in cases if c.current_queue == ComplianceQueue.PERIODIC_MONITORING_QUEUE)
    completed_archive = sum(1 for c in cases if c.current_queue == ComplianceQueue.COMPLETED_ARCHIVE)

    high_risk_count = sum(1 for c in cases if c.risk_assessment and c.risk_assessment.risk_tier.value in ["HIGH", "CRITICAL"])
    sanction_hits_count = sum(1 for c in cases if any(m.type == "SANCTIONS" for m in c.screening_matches))

    return {
        "total_cases": total,
        "maker_queue_count": maker_queue,
        "l1_checker_queue_count": l1_checker_queue,
        "l2_checker_queue_count": l2_checker_queue,
        "mlro_queue_count": mlro_queue,
        "monitoring_queue_count": monitoring_queue,
        "periodic_monitoring_queue_count": monitoring_queue,
        "completed_archive_count": completed_archive,
        "high_or_critical_risk": high_risk_count,
        "sanctions_hits": sanction_hits_count,
        "periodic_reviews_due": monitoring_queue,
        # Legacy fields for backward compatibility
        "pending_checker": l1_checker_queue + l2_checker_queue,
        "maker_in_progress": maker_queue,
        "returned_to_maker": sum(1 for c in cases if c.status == CaseStatus.RETURNED_TO_MAKER),
        "escalated_mlro": mlro_queue,
        "approved": completed_archive,
        "rejected": sum(1 for c in cases if c.status == CaseStatus.REJECTED),
    }


@app.get("/api/compliance-roster")
def get_compliance_roster():
    """Returns the institutional compliance personnel directory with active workload counts."""
    cases = db.list_cases()
    roster_copy = copy.deepcopy(COMPLIANCE_ROSTER)

    for tier, members in roster_copy.items():
        for m in members:
            name = m["name"]
            if tier == "MAKER":
                m["workload"] = sum(1 for c in cases if c.assigned_maker == name and c.current_queue == ComplianceQueue.MAKER_QUEUE)
            elif tier == "L1_CHECKER":
                m["workload"] = sum(1 for c in cases if c.assigned_checker_l1 == name and c.current_queue == ComplianceQueue.L1_CHECKER_QUEUE)
            elif tier == "L2_CHECKER":
                m["workload"] = sum(1 for c in cases if c.assigned_checker_l2 == name and c.current_queue == ComplianceQueue.L2_CHECKER_QUEUE)
            elif tier == "MLRO":
                m["workload"] = sum(1 for c in cases if c.assigned_mlro == name and c.current_queue == ComplianceQueue.MLRO_QUEUE)

    return roster_copy


@app.post("/api/cases/{case_id}/move-queue", response_model=KYCCase)
def move_case_queue(case_id: str, payload: CaseMoveQueueRequest):
    """Explicitly route / transition a case into a designated operational queue."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_queue = case.current_queue.value
    case.current_queue = payload.target_queue
    case.updated_at = datetime.utcnow()

    if payload.target_queue == ComplianceQueue.MAKER_QUEUE:
        case.current_stage = WorkflowStage.STAGE_4_CDD
        case.status = CaseStatus.MAKER_IN_PROGRESS
    elif payload.target_queue == ComplianceQueue.L1_CHECKER_QUEUE:
        case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
        case.status = CaseStatus.PENDING_L1_CHECKER
    elif payload.target_queue == ComplianceQueue.L2_CHECKER_QUEUE:
        case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
        case.status = CaseStatus.PENDING_L2_CHECKER
    elif payload.target_queue == ComplianceQueue.MLRO_QUEUE:
        case.current_stage = WorkflowStage.STAGE_11_ESCALATION
        case.status = CaseStatus.ESCALATED_MLRO
    elif payload.target_queue == ComplianceQueue.PERIODIC_MONITORING_QUEUE:
        case.current_stage = WorkflowStage.STAGE_12_ONGOING_MONITORING
    elif payload.target_queue == ComplianceQueue.COMPLETED_ARCHIVE:
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        if case.status not in [CaseStatus.APPROVED_SDD, CaseStatus.APPROVED_EDD, CaseStatus.REJECTED]:
            case.status = CaseStatus.APPROVED_SDD

    case.audit_trail.append(
        AuditEvent(
            actor=payload.actor or "COMPLIANCE_OFFICER",
            action="QUEUE_TRANSITION",
            details=f"Record routed from {old_queue} to {payload.target_queue.value}. Rationale: {payload.reason}.",
        )
    )
    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/assign", response_model=KYCCase)
def assign_case(case_id: str, payload: CaseAssignRequest):
    """Assign or reassign a KYC case to an analyst/agent at any governance level."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    lvl = payload.level.upper()
    old_assignee = "None"

    if lvl == "MAKER":
        old_assignee = case.assigned_maker
        case.assigned_maker = payload.assignee_name
    elif lvl in ["L1_CHECKER", "L1"]:
        old_assignee = case.assigned_checker_l1 or "Unassigned"
        case.assigned_checker_l1 = payload.assignee_name
        case.assigned_checker = payload.assignee_name
    elif lvl in ["L2_CHECKER", "L2"]:
        old_assignee = case.assigned_checker_l2 or "Unassigned"
        case.assigned_checker_l2 = payload.assignee_name
    elif lvl == "MLRO":
        old_assignee = case.assigned_mlro or "Unassigned"
        case.assigned_mlro = payload.assignee_name
    else:
        raise HTTPException(status_code=400, detail=f"Invalid assignment level '{payload.level}'. Expected MAKER, L1_CHECKER, L2_CHECKER, or MLRO.")

    case.updated_at = datetime.utcnow()
    case.audit_trail.append(
        AuditEvent(
            actor=payload.assigned_by,
            action="CASE_REASSIGNED",
            details=f"Reassigned {lvl} tier from '{old_assignee}' to '{payload.assignee_name}'. Notes: {payload.notes or 'Routine allocation'}",
        )
    )
    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/claim", response_model=KYCCase)
def claim_case(case_id: str, payload: CaseClaimRequest):
    """Claim a record directly from the active queue (Self-Assignment)."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    tier = payload.level
    if not tier:
        if case.current_queue == ComplianceQueue.MAKER_QUEUE:
            tier = "MAKER"
        elif case.current_queue == ComplianceQueue.L1_CHECKER_QUEUE:
            tier = "L1_CHECKER"
        elif case.current_queue == ComplianceQueue.L2_CHECKER_QUEUE:
            tier = "L2_CHECKER"
        elif case.current_queue == ComplianceQueue.MLRO_QUEUE:
            tier = "MLRO"
        else:
            tier = "L1_CHECKER"

    tier = tier.upper()
    if tier == "MAKER":
        case.assigned_maker = payload.claimant_name
    elif tier in ["L1_CHECKER", "L1"]:
        case.assigned_checker_l1 = payload.claimant_name
        case.assigned_checker = payload.claimant_name
    elif tier in ["L2_CHECKER", "L2"]:
        case.assigned_checker_l2 = payload.claimant_name
    elif tier == "MLRO":
        case.assigned_mlro = payload.claimant_name

    case.updated_at = datetime.utcnow()
    case.audit_trail.append(
        AuditEvent(
            actor=payload.claimant_name,
            action="CASE_CLAIMED",
            details=f"Officer claimed case {case.case_number} in {case.current_queue.value} as {tier} reviewer.",
        )
    )
    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/release", response_model=KYCCase)
def release_case(case_id: str, payload: CaseReleaseRequest):
    """Release a claimed case back to the general unassigned queue pool."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    tier = payload.level
    if not tier:
        if case.current_queue == ComplianceQueue.MAKER_QUEUE:
            tier = "MAKER"
        elif case.current_queue == ComplianceQueue.L1_CHECKER_QUEUE:
            tier = "L1_CHECKER"
        elif case.current_queue == ComplianceQueue.L2_CHECKER_QUEUE:
            tier = "L2_CHECKER"
        elif case.current_queue == ComplianceQueue.MLRO_QUEUE:
            tier = "MLRO"
        else:
            tier = "L1_CHECKER"

    tier = tier.upper()
    pool_label = f"Unassigned ({case.current_queue.value} Pool)"
    if tier == "MAKER":
        case.assigned_maker = pool_label
    elif tier in ["L1_CHECKER", "L1"]:
        case.assigned_checker_l1 = pool_label
    elif tier in ["L2_CHECKER", "L2"]:
        case.assigned_checker_l2 = pool_label
    elif tier == "MLRO":
        case.assigned_mlro = pool_label

    case.updated_at = datetime.utcnow()
    case.audit_trail.append(
        AuditEvent(
            actor=payload.released_by,
            action="CASE_RELEASED",
            details=f"Released case back to {case.current_queue.value} pool. Reason: {payload.reason or 'Unclaimed by officer'}",
        )
    )
    db.save_case(case)
    return case


@app.get("/api/cases", response_model=List[KYCCase])
def list_cases():
    return db.list_cases()


@app.post("/api/cases", response_model=KYCCase)
def create_case(payload: CaseCreateRequest):
    case_number = f"KYC-{datetime.utcnow().year}-{str(uuid.uuid4().int)[:4]}"
    new_case = KYCCase(
        case_number=case_number,
        entity_type=payload.entity_type,
        primary_name=payload.primary_name,
        email=payload.email,
        phone=payload.phone,
        country_of_operation=payload.country_of_operation,
        business_size=payload.business_size,
        trigger_type=payload.trigger_type,
        trigger_source=payload.trigger_source,
        priority=payload.priority,
        current_stage=WorkflowStage.STAGE_2_ASSIGNMENT,
        status=CaseStatus.DRAFT,
        audit_trail=[
            AuditEvent(
                stage=WorkflowStage.STAGE_1_TRIGGER,
                actor="CLIENT_FRONT_OFFICE",
                action="KYC_TRIGGERED",
                details=f"Triggered by {payload.trigger_source.value} for {payload.primary_name}. Trigger Type: {payload.trigger_type.value}. Notes: {payload.notes or 'None'}",
            )
        ],
    )
    saved = db.save_case(new_case)
    # Process case through maker agent
    analyzed = agent.process_case(saved)
    db.save_case(analyzed)
    return analyzed


@app.get("/api/cases/{case_id}", response_model=KYCCase)
def get_case(case_id: str):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str):
    success = db.delete_case(case_id)
    if not success:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted successfully"}


@app.post("/api/cases/{case_id}/documents", response_model=KYCCase)
async def upload_document(
    case_id: str,
    doc_type: DocumentType = Form(...),
    raw_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    text_content = raw_text or ""
    filename = "uploaded_document.txt"

    if file:
        filename = file.filename
        content_bytes = await file.read()
        
        if file.content_type and "text" in file.content_type:
            text_content = content_bytes.decode("utf-8", errors="ignore")
        elif filename.lower().endswith(".pdf"):
            try:
                import pypdf
                pdf_reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                extracted_pages = [page.extract_text() or "" for page in pdf_reader.pages]
                text_content = "\n".join(extracted_pages).strip()
            except Exception as e:
                text_content = f"PDF content read failure: {str(e)}"
        else:
            text_content = f"Image/Binary document '{filename}' uploaded ({len(content_bytes)} bytes)."

    doc = DocumentModel(
        filename=filename,
        doc_type=doc_type,
        raw_text=text_content,
        validation_status="PENDING",
    )
    case.documents.append(doc)
    case.audit_trail.append(
        AuditEvent(
            stage=WorkflowStage.STAGE_3_COLLECTION,
            actor="CLIENT_RM",
            action="DOCUMENT_SUBMITTED",
            details=f"Submitted {doc_type.value} document: '{filename}'.",
        )
    )
    
    analyzed_case = agent.process_case(case)
    db.save_case(analyzed_case)
    return analyzed_case


@app.post("/api/cases/{case_id}/analyze", response_model=KYCCase)
def trigger_maker_agent(case_id: str):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    analyzed_case = agent.process_case(case)
    db.save_case(analyzed_case)
    return analyzed_case


@app.post("/api/cases/{case_id}/alerts/disposition", response_model=KYCCase)
def disposition_alert(case_id: str, payload: AlertDispositionRequest):
    """Step 6: Investigate Alerts / Exceptions - record disposition rationale."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    found_alert = False
    for match in case.screening_matches:
        if match.id == payload.alert_id:
            match.disposition = payload.disposition
            match.disposition_rationale = payload.rationale
            match.investigated_by = payload.investigator_name
            match.investigated_at = datetime.utcnow()
            found_alert = True
            break

    if not found_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    case.audit_trail.append(
        AuditEvent(
            stage=WorkflowStage.STAGE_6_ALERT_INVESTIGATION,
            actor=payload.investigator_name,
            action=f"ALERT_DISPOSITION_{payload.disposition.value}",
            details=f"Dispositioned alert as {payload.disposition.value}. Rationale: {payload.rationale}",
        )
    )

    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/periodic-review", response_model=KYCCase)
def trigger_periodic_review(case_id: str):
    """Step 1 & 12: Trigger Periodic Review (re-KYC) cycle based on risk policy."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.trigger_type = KYCTriggerType.PERIODIC_RE_KYC
    case.trigger_source = KYCTriggerSource.SYSTEM_ALERT
    analyzed_case = agent.process_case(case, review_type="PERIODIC_RE_KYC")

    # Add explicit audit event
    cadence = analyzed_case.risk_assessment.recommended_review_cycle_months if analyzed_case.risk_assessment else 12
    sub_tier = analyzed_case.risk_assessment.risk_sub_tier if analyzed_case.risk_assessment else "STANDARD"
    analyzed_case.audit_trail.append(
        AuditEvent(
            stage=WorkflowStage.STAGE_12_ONGOING_MONITORING,
            actor="AUTO_SURVEILLANCE_ENGINE",
            action="PR_CR_REFRESH_TRIGGERED",
            details=f"Automated PR/CR Surveillance Engine triggered delta refresh for {analyzed_case.primary_name}. Risk Policy: {sub_tier} triggered cadence of {cadence} months ({cadence // 12} yr). Next review scheduled for {analyzed_case.next_review_date}.",
        )
    )
    db.save_case(analyzed_case)
    return analyzed_case


@app.post("/api/periodic-review/auto-trigger")
def auto_trigger_periodic_reviews(
    case_id: Optional[str] = None,
    force_all: bool = False,
    simulate_tier: Optional[str] = None
):
    """
    Automated Continuous & Periodic Review (PR/CR) Surveillance Engine.
    Evaluates customer risk ratings against cadence policy:
    - High Risks (High-High, High-Medium, High-Low, Critical): 1 Year (12 months)
    - Medium Risks (Medium-High, Medium-Low): 2 to 3 Years (24 to 36 months)
    - Low Risk: 5 Years (60 months)
    """
    now_str = datetime.utcnow().strftime("%Y-%m-%d")
    all_cases = db.list_cases()
    triggered_cases = []

    for c in all_cases:
        should_trigger = False
        reason = ""

        if case_id and c.id == case_id:
            should_trigger = True
            reason = f"Targeted execution on Case #{c.case_number}"
        elif force_all:
            should_trigger = True
            reason = "Global automated surveillance scan"
        elif simulate_tier and c.risk_assessment and (
            simulate_tier.upper() in c.risk_assessment.risk_tier.value.upper() or
            (c.risk_assessment.risk_sub_tier and simulate_tier.upper() in c.risk_assessment.risk_sub_tier.upper())
        ):
            should_trigger = True
            reason = f"Simulated {simulate_tier.upper()} risk cadence trigger"
        elif c.next_review_date and c.next_review_date <= now_str and c.current_queue != ComplianceQueue.MAKER_QUEUE:
            should_trigger = True
            reason = f"Scheduled cadence date reached ({c.next_review_date})"
        elif c.current_queue == ComplianceQueue.PERIODIC_MONITORING_QUEUE:
            should_trigger = True
            reason = "Case located in Periodic Monitoring Queue awaiting refresh"

        if should_trigger:
            c.trigger_type = KYCTriggerType.PERIODIC_RE_KYC
            c.trigger_source = KYCTriggerSource.SYSTEM_ALERT
            refreshed = agent.process_case(c, review_type="PERIODIC_RE_KYC")
            
            cadence = refreshed.risk_assessment.recommended_review_cycle_months if refreshed.risk_assessment else 12
            sub_tier = refreshed.risk_assessment.risk_sub_tier if refreshed.risk_assessment else "STANDARD"
            refreshed.audit_trail.append(
                AuditEvent(
                    stage=WorkflowStage.STAGE_12_ONGOING_MONITORING,
                    actor="AUTO_SURVEILLANCE_ENGINE",
                    action="AUTOMATIC_PR_CR_TRIGGERED",
                    details=f"Automated PR/CR Surveillance Engine triggered delta refresh. Reason: {reason}. Policy: {sub_tier} requires {cadence} months cadence ({cadence // 12} yr). Next review: {refreshed.next_review_date}.",
                )
            )
            db.save_case(refreshed)
            triggered_cases.append({
                "id": refreshed.id,
                "case_number": refreshed.case_number,
                "primary_name": refreshed.primary_name,
                "risk_tier": refreshed.risk_assessment.risk_tier.value if refreshed.risk_assessment else "N/A",
                "risk_sub_tier": refreshed.risk_assessment.risk_sub_tier if refreshed.risk_assessment else "N/A",
                "review_cycle_months": refreshed.review_cycle_months,
                "next_review_date": refreshed.next_review_date,
                "current_queue": refreshed.current_queue.value,
                "status": refreshed.status.value,
                "reason": reason,
            })

    return {
        "status": "SUCCESS",
        "triggered_count": len(triggered_cases),
        "triggered_cases": triggered_cases,
        "policy_matrix": {
            "high_risks": "1 Year (12 months) - High-High, High-Medium, High-Low, Critical",
            "medium_risks": "2 to 3 Years (24 to 36 months) - Medium-High, Medium-Low",
            "low_risk": "5 Years (60 months) - Standard Low Risk SDD",
        },
        "message": f"Successfully triggered {len(triggered_cases)} automated PR/CR review(s)."
    }


@app.get("/api/periodic-review/schedule")
def get_periodic_review_schedule():
    """Retrieve the automated risk-based PR/CR cadence schedule policy."""
    return {
        "policy_name": "Automated Risk-Based Periodic Review (PR/CR) Policy",
        "rules": [
            {
                "tier": "HIGH",
                "sub_tiers": ["HIGH_HIGH", "HIGH_MEDIUM", "HIGH_LOW"],
                "score_range": "65 - 100",
                "cadence_years": 1,
                "cadence_months": 12,
                "action": "Mandatory Annual Enhanced Due Diligence (EDD) Refresh",
                "description": "High risks like High-High, High-Medium, High-Low are refreshed automatically every 1 year.",
            },
            {
                "tier": "MEDIUM",
                "sub_tiers": ["MEDIUM_HIGH", "MEDIUM_LOW"],
                "score_range": "30 - 64",
                "cadence_years": "2 - 3",
                "cadence_months": "24 - 36",
                "action": "Standard Due Diligence (SDD) Active Monitoring Refresh",
                "description": "Medium risks are refreshed once in 2 to 3 years (Medium-High: 2 yrs / 24 mo; Medium-Low: 3 yrs / 36 mo).",
            },
            {
                "tier": "LOW",
                "sub_tiers": ["LOW"],
                "score_range": "0 - 29",
                "cadence_years": 5,
                "cadence_months": 60,
                "action": "Standard Low-Risk SDD Maintenance Refresh",
                "description": "Low risks are refreshed automatically every 5 years (60 months).",
            },
        ]
    }


@app.post("/api/cases/{case_id}/sync-external-intelligence", response_model=KYCCase)
def sync_external_intelligence(case_id: str):
    """Step 4 & 5A: Trigger live synchronization of Dun & Bradstreet (D&B) and LexisNexis intelligence."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    analyzed_case = agent.process_case(case)
    db.save_case(analyzed_case)
    return analyzed_case


@app.post("/api/cases/{case_id}/submit-to-checker", response_model=KYCCase)
def submit_to_checker(case_id: str):
    """Step 7A -> 8: Maker submits completed record to L1 Checker Queue."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
    case.status = CaseStatus.PENDING_L1_CHECKER
    case.current_queue = ComplianceQueue.L1_CHECKER_QUEUE
    case.updated_at = datetime.utcnow()
    case.audit_trail.append(
        AuditEvent(
            stage=WorkflowStage.STAGE_7_MAKER_COMPLETION,
            actor="KYC_MAKER_AGENT",
            action="SUBMITTED_TO_L1_CHECKER",
            details="Maker verified quality self-check checklist and routed dossier to L1 Checker Queue for 4-eyes review.",
        )
    )
    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/decision", response_model=KYCCase)
def submit_checker_decision(case_id: str, payload: CaseDecisionRequest):
    """Step 8 & 9: Independent Checker Review (L1 / L2)."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cycle_months = payload.review_cycle_months or case.review_cycle_months or (
        case.risk_assessment.recommended_review_cycle_months if case.risk_assessment else 12
    )
    next_date = payload.next_review_date or (
        (datetime.utcnow() + timedelta(days=cycle_months * 30)).strftime("%Y-%m-%d")
    )

    checker_lvl = payload.checker_level or "L1"
    review = CheckerReview(
        checker_level=checker_lvl,
        decision=payload.decision,
        checker_name=payload.checker_name,
        comments=payload.comments,
        rfi_notes=payload.rfi_notes,
        escalation_reason=payload.escalation_reason,
        review_cycle_months=cycle_months,
        next_review_date=next_date,
        reviewed_at=datetime.utcnow(),
    )
    
    case.checker_review = review
    if checker_lvl == "L2":
        case.l2_review = review
    else:
        case.l1_review = review

    case.status = payload.decision
    case.review_cycle_months = cycle_months
    case.last_reviewed_at = datetime.utcnow()
    case.next_review_date = next_date
    case.updated_at = datetime.utcnow()

    # Step Branching & Queue Transitions:
    if payload.decision in [CaseStatus.APPROVED_SDD, CaseStatus.APPROVED_EDD]:
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        case.current_queue = ComplianceQueue.COMPLETED_ARCHIVE
        if case.risk_assessment and case.maker_memo:
            record = PeriodicReviewRecord(
                review_type=case.trigger_type.value,
                new_risk_tier=case.risk_assessment.risk_tier,
                new_score=case.risk_assessment.overall_score,
                maker_recommendation=case.maker_memo.recommended_action,
                maker_summary=case.maker_memo.case_summary,
                checker_decision=payload.decision,
                checker_name=payload.checker_name,
                checker_comments=payload.comments,
            )
            case.review_history.append(record)

        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_10_CASE_CLOSURE,
                actor=f"{checker_lvl}_CHECKER",
                action="CASE_APPROVED_AND_CLOSED",
                details=f"{checker_lvl} Checker ({payload.checker_name}) approved {payload.decision.value}. Case sealed in Core Archive. Next re-KYC review scheduled for {next_date} ({cycle_months} mo).",
            )
        )

    elif payload.decision == CaseStatus.PENDING_L2_CHECKER:
        # L1 Escalates to L2 Senior Checker for 6-Eyes
        case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
        case.current_queue = ComplianceQueue.L2_CHECKER_QUEUE
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_8_CHECKER_REVIEW,
                actor="L1_CHECKER",
                action="ESCALATED_TO_L2_CHECKER",
                details=f"L1 Checker ({payload.checker_name}) completed 4-eyes review and escalated case to L2 Senior Checker Queue for 6-eyes approval. Rationale: {payload.escalation_reason or payload.comments}",
            )
        )

    elif payload.decision == CaseStatus.RETURNED_TO_MAKER:
        case.current_stage = WorkflowStage.STAGE_7_MAKER_COMPLETION
        case.current_queue = ComplianceQueue.MAKER_QUEUE
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_7_MAKER_COMPLETION,
                actor=f"{checker_lvl}_CHECKER",
                action="RETURNED_TO_MAKER_FOR_AMENDMENT",
                details=f"{checker_lvl} Checker ({payload.checker_name}) returned case to Maker Queue for amendment. Required items: {payload.rfi_notes or payload.comments}",
            )
        )

    elif payload.decision == CaseStatus.RETURNED_TO_L1:
        case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
        case.current_queue = ComplianceQueue.L1_CHECKER_QUEUE
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_8_CHECKER_REVIEW,
                actor="L2_CHECKER",
                action="RETURNED_TO_L1_CHECKER",
                details=f"L2 Senior Checker ({payload.checker_name}) remanded case back to L1 Checker Queue. Notes: {payload.comments}",
            )
        )

    elif payload.decision == CaseStatus.ESCALATED_MLRO:
        case.current_stage = WorkflowStage.STAGE_11_ESCALATION
        case.current_queue = ComplianceQueue.MLRO_QUEUE
        case.mlro_escalation = MLROEscalation(
            escalated_by=payload.checker_name,
            escalation_reason=payload.escalation_reason or payload.comments,
        )
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_11_ESCALATION,
                actor=f"{checker_lvl}_CHECKER",
                action="ESCALATED_TO_MLRO",
                details=f"Escalated to MLRO / Compliance Lead Queue. Reason: {payload.escalation_reason or payload.comments}",
            )
        )

    else:
        # Rejected / Exit
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        case.current_queue = ComplianceQueue.COMPLETED_ARCHIVE
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_10_CASE_CLOSURE,
                actor=f"{checker_lvl}_CHECKER",
                action="CASE_REJECTED",
                details=f"{checker_lvl} Checker ({payload.checker_name}) rejected onboarding. Reason: {payload.comments}",
            )
        )

    db.save_case(case)
    return case


@app.post("/api/cases/{case_id}/mlro-decision", response_model=KYCCase)
def submit_mlro_decision(case_id: str, decision: str = Form(...), notes: str = Form(...), reviewer: str = Form("Global MLRO")):
    """Step 11: MLRO Senior Escalation Decision."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not case.mlro_escalation:
        case.mlro_escalation = MLROEscalation(escalation_reason="Escalated for senior compliance authorization")

    case.mlro_escalation.mlro_decision = decision
    case.mlro_escalation.mlro_notes = notes
    case.mlro_escalation.mlro_reviewer = reviewer
    case.mlro_escalation.decided_at = datetime.utcnow()

    if decision == "APPROVED":
        case.status = CaseStatus.APPROVED_EDD
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        case.current_queue = ComplianceQueue.COMPLETED_ARCHIVE
    elif decision == "REJECTED":
        case.status = CaseStatus.REJECTED
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        case.current_queue = ComplianceQueue.COMPLETED_ARCHIVE
    else:
        case.status = CaseStatus.RETURNED_TO_MAKER
        case.current_stage = WorkflowStage.STAGE_7_MAKER_COMPLETION
        case.current_queue = ComplianceQueue.MAKER_QUEUE

    case.audit_trail.append(
        AuditEvent(
            stage=WorkflowStage.STAGE_11_ESCALATION,
            actor=reviewer,
            action=f"MLRO_DECISION_{decision}",
            details=f"Senior MLRO ({reviewer}) concluded review: {decision}. Notes: {notes}",
        )
    )

    db.save_case(case)
    return case


@app.get("/api/cases/{case_id}/export/csv")
def export_case_csv(case_id: str):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    output = io.StringIO()
    output.write("Case Number,Primary Name,Entity Type,Country,Status,Stage,Overall Risk,Risk Tier\n")
    risk_score = case.risk_assessment.overall_score if case.risk_assessment else 0
    risk_tier = case.risk_assessment.risk_tier.value if case.risk_assessment else "N/A"
    output.write(f'"{case.case_number}","{case.primary_name}","{case.entity_type.value}","{case.country_of_operation}","{case.status.value}","{case.current_stage.value}",{risk_score},"{risk_tier}"\n')
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=KYC_{case.case_number}.csv"}
    )


@app.post("/api/cases/reset")
def reset_database():
    db.initialize_presets()
    return {"message": "Database reset to demo cases", "count": len(db.list_cases())}
