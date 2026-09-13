"""Case repository and persistence layer for KYC Maker AI Agent."""

import copy
import json
import os
import sqlite3
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from backend.app.models import (
    KYCCase,
    DocumentModel,
    DocumentType,
    ExtractedIdentity,
    ExtractedField,
    CaseStatus,
    AuditEvent,
    ComplianceQueue,
    WorkflowStage,
    CheckerReview,
    MLROEscalation,
)
from backend.app.mock_data import PRESET_DEMO_CASES
from backend.agent.orchestrator import KYCMakerAgent


class CaseDatabase:
    """SQLite-backed case repository with an in-memory read cache.

    Cases are stored as JSON snapshots so the repository can persist the full
    Pydantic dossier (including nested audit and review records) without
    coupling the API models to a large relational schema.
    """

    def __init__(self):
        self._cases: Dict[str, KYCCase] = {}
        default_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "kyc_maker.sqlite3"))
        self.database_path = os.getenv("KYC_DB_PATH", default_path)
        os.makedirs(os.path.dirname(self.database_path), exist_ok=True)
        self._connection = sqlite3.connect(self.database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._create_schema()
        self.agent = KYCMakerAgent()
        if not self._load_cases():
            self.initialize_presets()

    def _create_schema(self):
        self._connection.execute(
            """
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                case_number TEXT NOT NULL,
                current_queue TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        self._connection.execute("CREATE INDEX IF NOT EXISTS idx_cases_queue ON cases(current_queue)")
        self._connection.execute("CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at)")
        self._connection.commit()

    def _load_cases(self) -> bool:
        rows = self._connection.execute("SELECT payload FROM cases ORDER BY updated_at DESC").fetchall()
        self._cases = {case.id: case for row in rows if (case := KYCCase.model_validate(json.loads(row["payload"]))) }
        return bool(self._cases)

    def _persist_case(self, case: KYCCase):
        self._connection.execute(
            """
            INSERT INTO cases (id, case_number, current_queue, status, updated_at, payload)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                case_number=excluded.case_number,
                current_queue=excluded.current_queue,
                status=excluded.status,
                updated_at=excluded.updated_at,
                payload=excluded.payload
            """,
            (
                case.id,
                case.case_number,
                case.current_queue.value,
                case.status.value,
                case.updated_at.isoformat(),
                json.dumps(case.model_dump(mode="json")),
            ),
        )

    def initialize_presets(self):
        """Populate the database with realistic demo cases pre-analyzed by the Maker Agent."""
        self._cases.clear()
        self._connection.execute("DELETE FROM cases")
        
        for preset in PRESET_DEMO_CASES:
            case_id = str(uuid.uuid4())
            docs = []
            
            for d in preset.get("documents", []):
                extracted = None
                if "extracted_data" in d:
                    ext_raw = d["extracted_data"]
                    extracted = ExtractedIdentity(
                        full_name=ExtractedField(**ext_raw["full_name"]) if "full_name" in ext_raw else None,
                        first_name=ExtractedField(**ext_raw["first_name"]) if "first_name" in ext_raw else None,
                        last_name=ExtractedField(**ext_raw["last_name"]) if "last_name" in ext_raw else None,
                        date_of_birth=ExtractedField(**ext_raw["date_of_birth"]) if "date_of_birth" in ext_raw else None,
                        gender=ExtractedField(**ext_raw["gender"]) if "gender" in ext_raw else None,
                        nationality=ExtractedField(**ext_raw["nationality"]) if "nationality" in ext_raw else None,
                        country_of_residence=ExtractedField(**ext_raw["country_of_residence"]) if "country_of_residence" in ext_raw else None,
                        id_number=ExtractedField(**ext_raw["id_number"]) if "id_number" in ext_raw else None,
                        issue_date=ExtractedField(**ext_raw["issue_date"]) if "issue_date" in ext_raw else None,
                        expiry_date=ExtractedField(**ext_raw["expiry_date"]) if "expiry_date" in ext_raw else None,
                        issuing_authority=ExtractedField(**ext_raw["issuing_authority"]) if "issuing_authority" in ext_raw else None,
                        mrz_code=ExtractedField(**ext_raw["mrz_code"]) if "mrz_code" in ext_raw else None,
                        mrz_valid=ext_raw.get("mrz_valid"),
                        is_expired=ext_raw.get("is_expired", False),
                        street_address=ExtractedField(**ext_raw["street_address"]) if "street_address" in ext_raw else None,
                        city=ExtractedField(**ext_raw["city"]) if "city" in ext_raw else None,
                        postal_code=ExtractedField(**ext_raw["postal_code"]) if "postal_code" in ext_raw else None,
                        country=ExtractedField(**ext_raw["country"]) if "country" in ext_raw else None,
                        company_name=ExtractedField(**ext_raw["company_name"]) if "company_name" in ext_raw else None,
                        registration_number=ExtractedField(**ext_raw["registration_number"]) if "registration_number" in ext_raw else None,
                        jurisdiction_of_incorporation=ExtractedField(**ext_raw["jurisdiction_of_incorporation"]) if "jurisdiction_of_incorporation" in ext_raw else None,
                        directors=ext_raw.get("directors", []),
                        ubos=ext_raw.get("ubos", []),
                    )

                doc = DocumentModel(
                    filename=d["filename"],
                    doc_type=DocumentType(d["doc_type"]),
                    raw_text=d.get("raw_text"),
                    extracted_data=extracted,
                    validation_status=d.get("validation_status", "VALID"),
                )
                docs.append(doc)

            case = KYCCase(
                id=case_id,
                case_number=preset["case_number"],
                entity_type=preset["entity_type"],
                primary_name=preset["primary_name"],
                email=preset.get("email"),
                phone=preset.get("phone"),
                country_of_operation=preset.get("country_of_operation", "US"),
                business_size=preset.get("business_size", "MEDIUM"),
                trigger_type=preset.get("trigger_type", "NEW_ONBOARDING"),
                priority=preset.get("priority", "MEDIUM"),
                status=CaseStatus.DRAFT,
                documents=docs,
                audit_trail=[
                    AuditEvent(
                        actor="SYSTEM",
                        action="CASE_CREATED",
                        details=f"Demo Onboarding Package initialized: {preset.get('description')}",
                    )
                ],
            )
            
            # Run Maker pipeline
            self.agent.process_case(case)

            # Assign realistic operational queues & reviews for demo cases
            c_num = case.case_number
            if c_num == "KYC-2026-0891":  # Alexander Wright (Low Risk)
                case.status = CaseStatus.APPROVED_SDD
                case.current_queue = ComplianceQueue.COMPLETED_ARCHIVE
                case.current_stage = WorkflowStage.STAGE_10_CASE_CLOSURE
                case.review_cycle_months = 60
                case.next_review_date = (datetime.utcnow() + timedelta(days=60 * 30)).strftime("%Y-%m-%d")
                case.checker_review = CheckerReview(
                    checker_level="L1",
                    checker_name="Sarah Jenkins (L1 Checker)",
                    decision=CaseStatus.APPROVED_SDD,
                    comments="Clean retail onboarding credentials verified. Identity confidence 99%. Approved SDD. Low risk cadence: 5 years (60 months).",
                    review_cycle_months=60,
                    next_review_date=case.next_review_date,
                )
                case.l1_review = case.checker_review
            elif c_num == "KYC-2026-0895":  # Apex Nordic Seafood AS (In Periodic Monitoring Queue - Cadence Reached)
                case.status = CaseStatus.APPROVED_SDD
                case.current_queue = ComplianceQueue.PERIODIC_MONITORING_QUEUE
                case.current_stage = WorkflowStage.STAGE_12_ONGOING_MONITORING
                case.review_cycle_months = 60
                case.next_review_date = datetime.utcnow().strftime("%Y-%m-%d")  # Due for auto-trigger today
                case.checker_review = CheckerReview(
                    checker_level="L1",
                    checker_name="Sarah Jenkins (L1 Checker)",
                    decision=CaseStatus.APPROVED_SDD,
                    comments="Standard Due Diligence verified. Periodic monitoring surveillance active.",
                    review_cycle_months=60,
                    next_review_date=case.next_review_date,
                )
                case.l1_review = case.checker_review
            elif c_num == "KYC-2026-0894":  # Quantum Dynamics Technologies (Medium Risk)
                case.status = CaseStatus.PENDING_L1_CHECKER
                case.current_queue = ComplianceQueue.L1_CHECKER_QUEUE
                case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
            elif c_num in ["KYC-2026-0896", "KYC-2026-0897"]:  # Veritas Logistics & Nexus Pay (High Risks)
                case.status = CaseStatus.PENDING_L2_CHECKER
                case.current_queue = ComplianceQueue.L2_CHECKER_QUEUE
                case.current_stage = WorkflowStage.STAGE_8_CHECKER_REVIEW
                case.review_cycle_months = 12
                case.l1_review = CheckerReview(
                    checker_level="L1",
                    checker_name="Liam O'Connor (L1 Checker)",
                    decision=CaseStatus.PENDING_L2_CHECKER,
                    comments="L1 4-eyes review completed. Escalating to L2 Senior Checker for 6-eyes sign-off due to PEP linkage / high-velocity wire activity. High-risk annual PR/CR review scheduled.",
                    escalation_reason="6-Eyes senior oversight required under Global KYC policy",
                    review_cycle_months=12,
                )
            elif c_num == "KYC-2026-0898":  # Aethelgard Heavy Industries
                case.status = CaseStatus.MAKER_IN_PROGRESS
                case.current_queue = ComplianceQueue.MAKER_QUEUE
                case.current_stage = WorkflowStage.STAGE_4_CDD
            elif c_num in ["KYC-2026-0892", "KYC-2026-0893", "KYC-2026-0899"]:  # Elena, Tariq, Atlas Trans-Oceanic
                case.status = CaseStatus.ESCALATED_MLRO
                case.current_queue = ComplianceQueue.MLRO_QUEUE
                case.current_stage = WorkflowStage.STAGE_11_ESCALATION
                reason = "Sanctions match on OFAC SDN" if c_num == "KYC-2026-0893" else "PEP Tier 1 corruption inquiry" if c_num == "KYC-2026-0892" else "XL Enterprise high wire turnover authorization (> $250M/mo)"
                case.mlro_escalation = MLROEscalation(
                    escalated_by="Senior Compliance Officer",
                    escalation_reason=reason,
                )

            self._cases[case.id] = case
            self._persist_case(case)

        self._connection.commit()

    def list_cases(self) -> List[KYCCase]:
        # Return sorted by updated_at descending
        return sorted(self._cases.values(), key=lambda c: c.updated_at, reverse=True)

    def get_case(self, case_id: str) -> Optional[KYCCase]:
        return self._cases.get(case_id)

    def save_case(self, case: KYCCase) -> KYCCase:
        case.updated_at = datetime.utcnow()
        self._cases[case.id] = case
        self._persist_case(case)
        self._connection.commit()
        return case

    def delete_case(self, case_id: str) -> bool:
        if case_id in self._cases:
            del self._cases[case_id]
            self._connection.execute("DELETE FROM cases WHERE id = ?", (case_id,))
            self._connection.commit()
            return True
        return False


db = CaseDatabase()
