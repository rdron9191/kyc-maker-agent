"""Cross-Document Verification & Consistency Engine for KYC Maker AI Agent."""

import re
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher
from backend.app.models import (
    DocumentModel,
    Discrepancy,
    DiscrepancySeverity,
    EntityType,
)


def normalize_name(name: str) -> str:
    """Normalize names for fuzzy token matching."""
    if not name:
        return ""
    # remove punctuation and extra spaces
    cleaned = re.sub(r"[^A-Za-z0-9\s]", " ", name).lower()
    tokens = sorted(cleaned.split())
    return " ".join(tokens)


def string_similarity(a: str, b: str) -> float:
    """Compute normalized sequence similarity ratio."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def names_match(name1: str, name2: str) -> Tuple[bool, float]:
    """Check if two names match, taking into account middle names and order."""
    if not name1 or not name2:
        return False, 0.0
    
    # Direct similarity
    direct_sim = string_similarity(name1, name2)
    # Normalized token similarity
    token_sim = string_similarity(normalize_name(name1), normalize_name(name2))
    
    # Check subset token inclusion (e.g. "Alexander James Wright" vs "Alexander Wright" vs "Alexander J Wright")
    tokens1 = set(re.findall(r"\b[A-Za-z]+\b", name1.lower()))
    tokens2 = set(re.findall(r"\b[A-Za-z]+\b", name2.lower()))
    
    # Filter single letter initials for overlap check
    full_tokens1 = {t for t in tokens1 if len(t) > 1}
    full_tokens2 = {t for t in tokens2 if len(t) > 1}
    
    common = full_tokens1.intersection(full_tokens2)
    min_tokens = min(len(full_tokens1), len(full_tokens2))
    subset_match = (len(common) >= min_tokens) if min_tokens > 0 else False
    
    best_score = max(direct_sim, token_sim, 0.90 if subset_match else 0.0)
    return (best_score >= 0.75), best_score


class CrossDocumentVerifier:
    """Validates data consistency across all uploaded documents."""

    def verify(
        self,
        primary_name: str,
        entity_type: EntityType,
        documents: List[DocumentModel],
    ) -> List[Discrepancy]:
        discrepancies: List[Discrepancy] = []

        if not documents:
            discrepancies.append(
                Discrepancy(
                    field="documents",
                    expected="At least 1 valid identity/onboarding document",
                    found="0 documents submitted",
                    severity=DiscrepancySeverity.CRITICAL,
                    description="No verification documents were provided for this case.",
                    source_documents=[],
                )
            )
            return discrepancies

        # 1. Document Expiration Verification
        for doc in documents:
            if doc.extracted_data and doc.extracted_data.is_expired:
                discrepancies.append(
                    Discrepancy(
                        field="document_validity",
                        expected="Active, unexpired document",
                        found=f"Expired document ({doc.extracted_data.expiry_date.value if doc.extracted_data.expiry_date else 'Expired'})",
                        severity=DiscrepancySeverity.HIGH,
                        description=f"Document '{doc.filename}' ({doc.doc_type}) has expired and cannot be accepted for verification.",
                        source_documents=[doc.filename],
                    )
                )

        # 2. Name Matching between Case Record and Documents
        for doc in documents:
            if not doc.extracted_data:
                continue
            
            doc_name = None
            if doc.extracted_data.full_name and doc.extracted_data.full_name.value:
                doc_name = doc.extracted_data.full_name.value
            elif doc.extracted_data.company_name and doc.extracted_data.company_name.value:
                doc_name = doc.extracted_data.company_name.value

            if doc_name:
                matched, score = names_match(primary_name, doc_name)
                if not matched:
                    # If corporate, check if doc is a UBO's ID
                    is_ubo_doc = False
                    if entity_type == EntityType.CORPORATE:
                        for other_doc in documents:
                            if other_doc.extracted_data and other_doc.extracted_data.ubos:
                                ubo_names = [u.get("name", "").lower() for u in other_doc.extracted_data.ubos]
                                if any(string_similarity(doc_name, u) > 0.8 for u in ubo_names):
                                    is_ubo_doc = True
                                    break
                    
                    if not is_ubo_doc:
                        discrepancies.append(
                            Discrepancy(
                                field="name_mismatch",
                                expected=primary_name,
                                found=doc_name,
                                severity=DiscrepancySeverity.HIGH if score < 0.5 else DiscrepancySeverity.MEDIUM,
                                description=f"Name on document '{doc.filename}' ('{doc_name}') diverges significantly from declared subject name ('{primary_name}', similarity: {int(score*100)}%).",
                                source_documents=[doc.filename],
                            )
                        )

        # 3. Cross-Document Pairwise Consistency (e.g. ID vs Utility Bill address/name)
        id_docs = [d for d in documents if d.doc_type in ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"]]
        address_docs = [d for d in documents if d.doc_type in ["UTILITY_BILL", "BANK_STATEMENT"]]

        if id_docs and address_docs:
            for id_doc in id_docs:
                for addr_doc in address_docs:
                    if id_doc.extracted_data and addr_doc.extracted_data:
                        name_id = id_doc.extracted_data.full_name.value if id_doc.extracted_data.full_name else ""
                        name_addr = addr_doc.extracted_data.full_name.value if addr_doc.extracted_data.full_name else ""
                        
                        if name_id and name_addr:
                            matched, score = names_match(name_id, name_addr)
                            if not matched:
                                discrepancies.append(
                                    Discrepancy(
                                        field="proof_of_address_name",
                                        expected=name_id,
                                        found=name_addr,
                                        severity=DiscrepancySeverity.MEDIUM,
                                        description=f"Name mismatch between ID document ({name_id}) and Proof of Address ({name_addr}).",
                                        source_documents=[id_doc.filename, addr_doc.filename],
                                    )
                                )

        # 4. Corporate Structure Check (for KYB)
        if entity_type == EntityType.CORPORATE:
            corp_docs = [d for d in documents if d.doc_type in ["CERT_OF_INCORPORATION", "ARTICLES_OF_ASSOCIATION"]]
            if corp_docs:
                for c_doc in corp_docs:
                    if c_doc.extracted_data and c_doc.extracted_data.ubos:
                        for ubo in c_doc.extracted_data.ubos:
                            ubo_name = ubo.get("name", "")
                            ubo_pct = ubo.get("percentage", 0)
                            if ubo_pct >= 25:
                                # Look for corresponding ID document
                                has_id = any(
                                    d.extracted_data and d.extracted_data.full_name and names_match(d.extracted_data.full_name.value, ubo_name)[0]
                                    for d in id_docs
                                )
                                if not has_id:
                                    discrepancies.append(
                                        Discrepancy(
                                            field="missing_ubo_verification",
                                            expected=f"Identity verification document for UBO '{ubo_name}' (holding {ubo_pct}% shares)",
                                            found="No matching identity document found in case dossier",
                                            severity=DiscrepancySeverity.MEDIUM,
                                            description=f"Significant Beneficial Owner ({ubo_name}, {ubo_pct}%) lacks required identity verification documents.",
                                            source_documents=[c_doc.filename],
                                        )
                                    )

        return discrepancies
