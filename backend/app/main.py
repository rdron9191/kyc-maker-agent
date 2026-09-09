"""FastAPI REST API for KYC Maker AI Agent."""

import io
import uuid
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.models import (
    KYCCase,
    CaseCreateRequest,
    CaseDecisionRequest,
    AlertDispositionRequest,
    DocumentModel,
    DocumentType,
    CaseStatus,
    WorkflowStage,
    CheckerReview,
    MLROEscalation,
    AuditEvent,
    PeriodicReviewRecord,
    KYCTriggerType,
    KYCTriggerSource,
    PriorityLevel,
)
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


@app.get("/api/stats")
def get_stats():
    cases = db.list_cases()
    total = len(cases)
    pending_checker = sum(1 for c in cases if c.status == CaseStatus.PENDING_CHECKER)
    maker_in_progress = sum(1 for c in cases if c.status == CaseStatus.MAKER_IN_PROGRESS)
    returned_to_maker = sum(1 for c in cases if c.status == CaseStatus.RETURNED_TO_MAKER)
    escalated_mlro = sum(1 for c in cases if c.status == CaseStatus.ESCALATED_MLRO)
    approved = sum(1 for c in cases if c.status in [CaseStatus.APPROVED_SDD, CaseStatus.APPROVED_EDD, CaseStatus.CLOSED])
    rfi = sum(1 for c in cases if c.status == CaseStatus.ISSUES_IDENTIFIED)
    rejected = sum(1 for c in cases if c.status == CaseStatus.REJECTED)
    
    high_risk_count = 0
    sanction_hits_count = 0
    reviews_due_count = 0
    now_str = datetime.utcnow().strftime("%Y-%m-%d")

    for c in cases:
        if c.risk_assessment and c.risk_assessment.risk_tier.value in ["HIGH", "CRITICAL"]:
            high_risk_count += 1
        if any(m.type == "SANCTIONS" for m in c.screening_matches):
            sanction_hits_count += 1
        if c.next_review_date and c.next_review_date <= now_str:
            reviews_due_count += 1

    return {
        "total_cases": total,
        "pending_checker": pending_checker,
        "maker_in_progress": maker_in_progress,
        "returned_to_maker": returned_to_maker,
        "escalated_mlro": escalated_mlro,
        "approved": approved,
        "issues_identified": rfi,
        "rejected": rejected,
        "high_or_critical_risk": high_risk_count,
        "sanctions_hits": sanction_hits_count,
        "periodic_reviews_due": reviews_due_count,
    }


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
    """Step 1 & 12: Trigger Periodic Review (re-KYC) cycle."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.trigger_type = KYCTriggerType.PERIODIC_RE_KYC
    case.trigger_source = KYCTriggerSource.SYSTEM_ALERT
    analyzed_case = agent.process_case(case, review_type="PERIODIC_RE_KYC")
    db.save_case(analyzed_case)
    return analyzed_case


@app.post("/api/cases/{case_id}/decision", response_model=KYCCase)
def submit_checker_decision(case_id: str, payload: CaseDecisionRequest):
    """Step 8 & 9: Checker Review & Decision."""
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cycle_months = payload.review_cycle_months or case.review_cycle_months or (
        case.risk_assessment.recommended_review_cycle_months if case.risk_assessment else 12
    )
    next_date = payload.next_review_date or (
        (datetime.utcnow() + timedelta(days=cycle_months * 30)).strftime("%Y-%m-%d")
    )

    case.checker_review = CheckerReview(
        decision=payload.decision,
        checker_name=payload.checker_name,
        comments=payload.comments,
        rfi_notes=payload.rfi_notes,
        escalation_reason=payload.escalation_reason,
        review_cycle_months=cycle_months,
        next_review_date=next_date,
        reviewed_at=datetime.utcnow(),
    )
    case.status = payload.decision
    case.review_cycle_months = cycle_months
    case.last_reviewed_at = datetime.utcnow()
    case.next_review_date = next_date
    case.updated_at = datetime.utcnow()

    # Step Branching based on Decision:
    if payload.decision in [CaseStatus.APPROVED_SDD, CaseStatus.APPROVED_EDD]:
        # Step 10: System Update & Case Closure
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
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
                actor="CHECKER_OFFICER",
                action="CASE_APPROVED_AND_CLOSED",
                details=f"Checker ({payload.checker_name}) approved {payload.decision.value}. KYC profile updated in Core system. Next re-KYC review scheduled for {next_date} ({cycle_months} mo).",
            )
        )

    elif payload.decision == CaseStatus.RETURNED_TO_MAKER:
        # Step C: Return to Maker for Amendment
        case.current_stage = WorkflowStage.STAGE_7_MAKER_COMPLETION
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_7_MAKER_COMPLETION,
                actor="CHECKER_OFFICER",
                action="RETURNED_FOR_AMENDMENT",
                details=f"Checker ({payload.checker_name}) returned case to Maker for amendment. Items to address: {payload.rfi_notes or payload.comments}",
            )
        )

    elif payload.decision == CaseStatus.ESCALATED_MLRO:
        # Step 11: Escalation / Additional Review (MLRO / Compliance)
        case.current_stage = WorkflowStage.STAGE_11_ESCALATION
        case.mlro_escalation = MLROEscalation(
            escalated_by=payload.checker_name,
            escalation_reason=payload.escalation_reason or payload.comments,
        )
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_11_ESCALATION,
                actor="CHECKER_OFFICER",
                action="ESCALATED_TO_MLRO",
                details=f"Escalated to MLRO / Compliance Lead for senior review. Reason: {payload.escalation_reason or payload.comments}",
            )
        )

    else:
        # Rejected / Exit
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
        case.audit_trail.append(
            AuditEvent(
                stage=WorkflowStage.STAGE_10_CASE_CLOSURE,
                actor="CHECKER_OFFICER",
                action="CASE_REJECTED",
                details=f"Checker ({payload.checker_name}) rejected onboarding. Reason: {payload.comments}",
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
    elif decision == "REJECTED":
        case.status = CaseStatus.REJECTED
        case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
    else:
        case.status = CaseStatus.RETURNED_TO_MAKER
        case.current_stage = WorkflowStage.STAGE_7_MAKER_COMPLETION

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
