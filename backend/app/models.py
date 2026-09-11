"""KYC Maker Workflow Data Models.

Covers the entire 12-step KYC Process Flow:
1. Trigger for KYC
2. Case Assignment to Maker
3. Information & Document Collection (SoW/SoF, UBOs)
4. Customer Due Diligence (CDD) Analysis
5A. Screening & Research (Sanctions, PEP, Media)
5B. Risk Assessment (Inherent, Product, Geo, Sector, Delivery)
6. Investigate Alerts / Exceptions (False positive rationales)
7A/7B. Complete KYC Record & Issue Handling (Maker self-check)
8/9. Independent Checker Review & Decision (Approve, Return to Maker, Escalate)
10. System Update & Case Closure
11. Escalation / MLRO / Compliance Review
12. Ongoing Monitoring & Periodic Review Refresh
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid


class EntityType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    CORPORATE = "CORPORATE"


class BusinessSize(str, Enum):
    MICRO_SMB = "MICRO_SMB"
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"
    XL_ENTERPRISE = "XL_ENTERPRISE"


class KYCTriggerType(str, Enum):
    NEW_ONBOARDING = "NEW_ONBOARDING"
    PERIODIC_RE_KYC = "PERIODIC_RE_KYC"
    EVENT_DRIVEN_REVIEW = "EVENT_DRIVEN_REVIEW"
    REGULATORY_TRIGGER = "REGULATORY_TRIGGER"


ReviewType = KYCTriggerType


class KYCTriggerSource(str, Enum):
    CLIENT_FRONT_OFFICE = "CLIENT_FRONT_OFFICE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    REGULATORY_CHANGE = "REGULATORY_CHANGE"
    COMPLIANCE_RISK = "COMPLIANCE_RISK"


class PriorityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class WorkflowStage(str, Enum):
    STAGE_1_TRIGGER = "STAGE_1_TRIGGER"
    STAGE_2_ASSIGNMENT = "STAGE_2_ASSIGNMENT"
    STAGE_3_COLLECTION = "STAGE_3_COLLECTION"
    STAGE_4_CDD = "STAGE_4_CDD"
    STAGE_5_SCREENING_RISK = "STAGE_5_SCREENING_RISK"
    STAGE_6_ALERT_INVESTIGATION = "STAGE_6_ALERT_INVESTIGATION"
    STAGE_7_MAKER_COMPLETION = "STAGE_7_MAKER_COMPLETION"
    STAGE_8_CHECKER_REVIEW = "STAGE_8_CHECKER_REVIEW"
    STAGE_9_CHECKER_DECISION = "STAGE_9_CHECKER_DECISION"
    STAGE_10_CASE_CLOSURE = "STAGE_10_CASE_CLOSURE"
    STAGE_11_ESCALATION = "STAGE_11_ESCALATION"
    STAGE_12_ONGOING_MONITORING = "STAGE_12_ONGOING_MONITORING"


class ComplianceQueue(str, Enum):
    MAKER_QUEUE = "MAKER_QUEUE"
    L1_CHECKER_QUEUE = "L1_CHECKER_QUEUE"
    L2_CHECKER_QUEUE = "L2_CHECKER_QUEUE"
    MLRO_QUEUE = "MLRO_QUEUE"
    PERIODIC_MONITORING_QUEUE = "PERIODIC_MONITORING_QUEUE"
    COMPLETED_ARCHIVE = "COMPLETED_ARCHIVE"


class DocumentType(str, Enum):
    PASSPORT = "PASSPORT"
    NATIONAL_ID = "NATIONAL_ID"
    DRIVERS_LICENSE = "DRIVERS_LICENSE"
    UTILITY_BILL = "UTILITY_BILL"
    BANK_STATEMENT = "BANK_STATEMENT"
    CERT_OF_INCORPORATION = "CERT_OF_INCORPORATION"
    ARTICLES_OF_ASSOCIATION = "ARTICLES_OF_ASSOCIATION"
    TAX_RETURN = "TAX_RETURN"
    SOURCE_OF_WEALTH = "SOURCE_OF_WEALTH"
    SOURCE_OF_FUNDS = "SOURCE_OF_FUNDS"
    OTHER = "OTHER"


class CaseStatus(str, Enum):
    DRAFT = "DRAFT"
    MAKER_IN_PROGRESS = "MAKER_IN_PROGRESS"
    ALERT_INVESTIGATION = "ALERT_INVESTIGATION"
    ISSUES_IDENTIFIED = "ISSUES_IDENTIFIED"
    PENDING_CHECKER = "PENDING_CHECKER"
    PENDING_L1_CHECKER = "PENDING_L1_CHECKER"
    PENDING_L2_CHECKER = "PENDING_L2_CHECKER"
    RETURNED_TO_MAKER = "RETURNED_TO_MAKER"
    RETURNED_TO_L1 = "RETURNED_TO_L1"
    ESCALATED_MLRO = "ESCALATED_MLRO"
    APPROVED_SDD = "APPROVED_SDD"
    APPROVED_EDD = "APPROVED_EDD"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class RiskTier(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Recommendation(str, Enum):
    APPROVE_SDD = "APPROVE_SDD"
    APPROVE_EDD = "APPROVE_EDD"
    REQUEST_RFI = "REQUEST_RFI"
    ESCALATE_MLRO = "ESCALATE_MLRO"
    REJECT_PROHIBITED = "REJECT_PROHIBITED"


class DiscrepancySeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ScreeningType(str, Enum):
    SANCTIONS = "SANCTIONS"
    PEP = "PEP"
    ADVERSE_MEDIA = "ADVERSE_MEDIA"
    JURISDICTION = "JURISDICTION"


class AlertDisposition(str, Enum):
    UNRESOLVED = "UNRESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    TRUE_POSITIVE = "TRUE_POSITIVE"
    ESCALATED = "ESCALATED"


class ExtractedField(BaseModel):
    value: Optional[str] = None
    confidence: float = 1.0
    source_bbox: Optional[List[float]] = None


class ExtractedIdentity(BaseModel):
    full_name: Optional[ExtractedField] = None
    first_name: Optional[ExtractedField] = None
    last_name: Optional[ExtractedField] = None
    date_of_birth: Optional[ExtractedField] = None
    gender: Optional[ExtractedField] = None
    nationality: Optional[ExtractedField] = None
    country_of_residence: Optional[ExtractedField] = None
    id_number: Optional[ExtractedField] = None
    issue_date: Optional[ExtractedField] = None
    expiry_date: Optional[ExtractedField] = None
    issuing_authority: Optional[ExtractedField] = None
    mrz_code: Optional[ExtractedField] = None
    mrz_valid: Optional[bool] = None
    is_expired: Optional[bool] = False
    
    # Address
    street_address: Optional[ExtractedField] = None
    city: Optional[ExtractedField] = None
    postal_code: Optional[ExtractedField] = None
    country: Optional[ExtractedField] = None

    # Corporate fields (for KYB)
    company_name: Optional[ExtractedField] = None
    registration_number: Optional[ExtractedField] = None
    jurisdiction_of_incorporation: Optional[ExtractedField] = None
    incorporation_date: Optional[ExtractedField] = None
    directors: Optional[List[str]] = Field(default_factory=list)
    ubos: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class DocumentModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    doc_type: DocumentType
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    file_path: Optional[str] = None
    extracted_data: Optional[ExtractedIdentity] = None
    raw_text: Optional[str] = None
    validation_status: str = "PENDING"


class Discrepancy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field: str
    expected: str
    found: str
    severity: DiscrepancySeverity = DiscrepancySeverity.MEDIUM
    description: str
    source_documents: List[str] = Field(default_factory=list)
    resolved: bool = False
    resolution_notes: Optional[str] = None


class ScreeningMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # SANCTIONS, PEP, ADVERSE_MEDIA, JURISDICTION
    target_name: str
    matched_entity: str
    match_score: float
    list_name: str
    program_or_category: Optional[str] = None
    adverse_media_headline: Optional[str] = None
    adverse_media_source: Optional[str] = None
    adverse_media_date: Optional[str] = None
    risk_summary: str
    source_provider: str = "LexisNexis Bridger Insight XG"
    provider_hit_id: Optional[str] = None
    
    # Step 6: Investigation & Disposition
    disposition: AlertDisposition = AlertDisposition.UNRESOLVED
    disposition_rationale: Optional[str] = None
    investigated_by: Optional[str] = None
    investigated_at: Optional[datetime] = None


class DNBVerifiedUBO(BaseModel):
    name: str
    percentage: float
    is_pep: bool = False
    nationality: Optional[str] = None
    registry_verified: bool = True
    tier_level: int = 1  # 1 = Direct Shareholder, 2 = Indirect Parent Owner


class DNBProfile(BaseModel):
    duns_number: str = "12-345-6789"
    company_name: str
    operating_status: str = "ACTIVE"
    registration_number: Optional[str] = None
    jurisdiction_of_incorporation: Optional[str] = "US"
    parent_company: Optional[str] = None
    global_ultimate_duns: Optional[str] = None
    annual_turnover: Optional[str] = "$10,000,000 - $50,000,000"
    employee_count: Optional[int] = 120
    paydex_score: Optional[int] = 80  # 1-100 Dun & Bradstreet payment performance score
    sic_code: Optional[str] = "7371 - Computer Programming Services"
    naics_code: Optional[str] = "541511 - Custom Computer Programming"
    verified_ubos: List[DNBVerifiedUBO] = Field(default_factory=list)
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)
    data_source: str = "Dun & Bradstreet (D&B Direct+ API)"


class LexisNexisScreeningSummary(BaseModel):
    query_hash: str = "SHA256:LIVE_QUERY"
    search_timestamp: datetime = Field(default_factory=datetime.utcnow)
    provider_source: str = "LexisNexis Bridger Insight XG / WorldCompliance"
    total_hits: int = 0
    sanctions_count: int = 0
    pep_count: int = 0
    adverse_media_count: int = 0
    search_confidence_threshold: float = 80.0
    status: str = "COMPLETED"


class GLEIFRecord(BaseModel):
    lei: str = "5493006MHB84DD0ZWV18"
    legal_name: str
    entity_status: str = "ACTIVE"
    managing_lou: str = "GLEIF Global Legal Entity Identifier Foundation"
    registered_country: str = "US"
    validation_authority: str = "Official Company Registry"
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class ExternalIntelligenceBundle(BaseModel):
    dnb_profile: Optional[DNBProfile] = None
    lexisnexis_summary: Optional[LexisNexisScreeningSummary] = None
    gleif_record: Optional[GLEIFRecord] = None
    synced_at: datetime = Field(default_factory=datetime.utcnow)
    is_cached: bool = False
    data_provenance_signature: str = "SHA256:TIER1_AUTHENTICATED_VENDOR_FEED"


class CDDProfile(BaseModel):
    """Step 4: Customer Due Diligence Details."""
    business_model: str = "Standard retail / commercial banking relationship."
    products_and_services: List[str] = Field(default_factory=lambda: ["Corporate Checking", "Trade Finance", "Wire Transfers"])
    purpose_of_relationship: str = "Operational liquidity and commercial settlements."
    source_of_wealth: str = "Accumulated earnings from commercial operations & investments."
    source_of_funds: str = "Incoming commercial payments from vetted corporate counterparties."
    expected_monthly_turnover: str = "$500,000 - $2,000,000"
    geographic_presence: List[str] = Field(default_factory=lambda: ["US", "GB", "DE"])
    industry_sector: str = "Technology & Professional Services"
    business_size: Optional[str] = "MEDIUM"
    delivery_channel: str = "Online / Direct Institutional Channel"
    duns_number: Optional[str] = "12-345-6789"
    lei: Optional[str] = "5493006MHB84DD0ZWV18"
    dnb_verified_status: Optional[str] = "VERIFIED_ACTIVE"
    ubo_analysis_notes: Optional[str] = "Identified and verified all UBOs holding >= 25% voting equity."


class RiskFactor(BaseModel):
    category: str  # Customer, Product, Geography, Industry/Sector, Delivery Channel
    factor_name: str
    score: float
    weight: float
    contribution: float
    reasoning: str


class RiskAssessment(BaseModel):
    """Step 5B: Multi-Factor Risk Assessment (Maker Analysis)."""
    overall_score: float
    risk_tier: RiskTier
    risk_sub_tier: Optional[str] = "LOW"  # "HIGH_HIGH", "HIGH_MEDIUM", "HIGH_LOW", "MEDIUM_HIGH", "MEDIUM_LOW", "LOW"
    pr_cr_trigger_rule: Optional[str] = "5 Years (60 Months) - Low Risk PR/CR Cadence"
    recommended_due_diligence: str
    recommended_review_cycle_months: int = 60
    suggested_next_review_date: Optional[str] = None
    customer_risk: float = 20.0
    product_risk: float = 15.0
    geographic_risk: float = 15.0
    industry_risk: float = 20.0
    delivery_channel_risk: float = 10.0
    factors: List[RiskFactor] = Field(default_factory=list)
    summary: str


class MakerSelfCheck(BaseModel):
    """Step 7A: Maker Quality Self-Check."""
    documents_complete: bool = True
    ubos_identified_and_verified: bool = True
    sow_sof_documented: bool = True
    screenings_dispositioned: bool = True
    risk_rationale_concise: bool = True
    policies_and_cdd_standards_met: bool = True


class MakerMemo(BaseModel):
    """Step 7A: Completed KYC Record Memo."""
    case_summary: str
    cdd_narrative: str = "Customer Due Diligence (CDD) standards satisfied under Global KYC Policy."
    identity_audit: str
    screening_audit: str
    risk_justification: str
    recommended_action: Recommendation
    review_type: str = "INITIAL_ONBOARDING"
    recommended_review_cycle_months: int = 12
    suggested_next_review_date: Optional[str] = None
    periodic_delta_summary: Optional[str] = None
    mitigating_factors: List[str] = Field(default_factory=list)
    rfi_items_required: List[str] = Field(default_factory=list)
    maker_agent_version: str = "KYC-Maker-AI-v2.0"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CheckerReview(BaseModel):
    """Step 8 & 9: Independent Checker Review (L1 / L2)."""
    checker_level: str = "L1"  # "L1" or "L2"
    decision: CaseStatus
    checker_name: str = "Compliance Checker"
    comments: str
    rfi_notes: Optional[str] = None
    escalation_reason: Optional[str] = None
    review_cycle_months: Optional[int] = 12
    next_review_date: Optional[str] = None
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)


class MLROEscalation(BaseModel):
    """Step 11: Escalation / Additional Review (MLRO / Compliance Lead)."""
    escalated_by: str = "KYC Checker"
    escalated_at: datetime = Field(default_factory=datetime.utcnow)
    escalation_reason: str
    mlro_reviewer: Optional[str] = "Global MLRO / Head of FCC"
    mlro_decision: Optional[str] = "PENDING"  # APPROVED, REJECTED, CONDITIONAL
    mlro_notes: Optional[str] = None
    decided_at: Optional[datetime] = None


class PeriodicReviewRecord(BaseModel):
    """Step 12: Ongoing Monitoring & Periodic Review Snapshot."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    review_date: datetime = Field(default_factory=datetime.utcnow)
    review_type: str = "PERIODIC_RE_KYC"
    prior_risk_tier: Optional[RiskTier] = None
    new_risk_tier: RiskTier
    prior_score: Optional[float] = None
    new_score: float
    maker_recommendation: Recommendation
    maker_summary: str
    checker_decision: Optional[CaseStatus] = None
    checker_name: Optional[str] = None
    checker_comments: Optional[str] = None


class AuditEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    stage: Optional[WorkflowStage] = None
    actor: str  # e.g., "SYSTEM", "KYC_MAKER_AGENT", "CHECKER_OFFICER", "MLRO"
    action: str
    details: str


class CaseCreateRequest(BaseModel):
    entity_type: EntityType = EntityType.INDIVIDUAL
    primary_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country_of_operation: str = "US"
    trigger_type: KYCTriggerType = KYCTriggerType.NEW_ONBOARDING
    trigger_source: KYCTriggerSource = KYCTriggerSource.CLIENT_FRONT_OFFICE
    priority: PriorityLevel = PriorityLevel.MEDIUM
    business_size: Optional[BusinessSize] = BusinessSize.MEDIUM
    notes: Optional[str] = None


class CaseDecisionRequest(BaseModel):
    checker_level: str = "L1"  # "L1" or "L2"
    decision: CaseStatus
    checker_name: str = "Compliance Officer"
    comments: str
    rfi_notes: Optional[str] = None
    escalation_reason: Optional[str] = None
    review_cycle_months: Optional[int] = None
    next_review_date: Optional[str] = None


class AlertDispositionRequest(BaseModel):
    alert_id: str
    disposition: AlertDisposition
    rationale: str
    investigator_name: str = "KYC Maker Specialist"


class CaseMoveQueueRequest(BaseModel):
    target_queue: ComplianceQueue
    reason: Optional[str] = "Manual queue transition"
    actor: Optional[str] = "Compliance Officer"


class CaseAssignRequest(BaseModel):
    level: str  # "MAKER", "L1_CHECKER", "L2_CHECKER", "MLRO"
    assignee_name: str
    assigned_by: Optional[str] = "Compliance Supervisor"
    notes: Optional[str] = None


class CaseClaimRequest(BaseModel):
    level: Optional[str] = None  # Auto-inferred if omitted
    claimant_name: str
    claimant_role: Optional[str] = None


class CaseReleaseRequest(BaseModel):
    level: Optional[str] = None
    released_by: str = "Compliance Officer"
    reason: Optional[str] = "Released back to queue pool"


class KYCCase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_number: str
    entity_type: EntityType
    primary_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country_of_operation: str = "US"
    
    # Step 1 & 2: Trigger & Assignment
    current_stage: WorkflowStage = WorkflowStage.STAGE_2_ASSIGNMENT
    current_queue: ComplianceQueue = ComplianceQueue.MAKER_QUEUE
    trigger_type: KYCTriggerType = KYCTriggerType.NEW_ONBOARDING
    trigger_source: KYCTriggerSource = KYCTriggerSource.CLIENT_FRONT_OFFICE
    trigger_date: datetime = Field(default_factory=datetime.utcnow)
    priority: PriorityLevel = PriorityLevel.MEDIUM
    assigned_maker: str = "KYC Maker AI Agent (Core)"
    assigned_checker: Optional[str] = "Senior Compliance Checker"
    assigned_checker_l1: Optional[str] = "Sarah Jenkins (L1 Checker)"
    assigned_checker_l2: Optional[str] = "Marcus Vance (L2 Senior VP)"
    assigned_mlro: Optional[str] = "Arthur Pendelton (Global MLRO)"
    business_size: Optional[BusinessSize] = BusinessSize.MEDIUM
    deadline_date: Optional[str] = None
    
    status: CaseStatus = CaseStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Step 3 & 4: Collection & CDD
    documents: List[DocumentModel] = Field(default_factory=list)
    cdd_profile: Optional[CDDProfile] = Field(default_factory=CDDProfile)
    
    # Step 5A & 5B: Screening, Risk & Third-Party Intelligence
    screening_matches: List[ScreeningMatch] = Field(default_factory=list)
    risk_assessment: Optional[RiskAssessment] = None
    external_intelligence: Optional[ExternalIntelligenceBundle] = None
    
    # Step 6: Alert Investigation & Issues
    discrepancies: List[Discrepancy] = Field(default_factory=list)
    has_unresolved_issues: bool = False
    
    # Step 7A: Maker Completion
    self_check: MakerSelfCheck = Field(default_factory=MakerSelfCheck)
    maker_memo: Optional[MakerMemo] = None
    
    # Step 8, 9, 10, 11: Checker Review & Escalation
    checker_review: Optional[CheckerReview] = None
    l1_review: Optional[CheckerReview] = None
    l2_review: Optional[CheckerReview] = None
    mlro_escalation: Optional[MLROEscalation] = None
    
    # Step 12: Ongoing Monitoring & Periodic Review
    review_cycle_months: int = 12
    last_reviewed_at: Optional[datetime] = None
    next_review_date: Optional[str] = None
    review_history: List[PeriodicReviewRecord] = Field(default_factory=list)

    # Immutable Audit Trail
    audit_trail: List[AuditEvent] = Field(default_factory=list)
