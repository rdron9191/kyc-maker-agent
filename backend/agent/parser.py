"""Document Parsing & Multimodal Extraction Module for KYC Maker AI Agent."""

import re
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any
from backend.app.models import DocumentType, ExtractedIdentity, ExtractedField


def parse_mrz(mrz_text: str) -> Dict[str, Any]:
    """Parse standard ICAO 9303 2-line Passport MRZ (Type 3)."""
    lines = [line.strip().replace(" ", "") for line in mrz_text.splitlines() if line.strip()]
    mrz_lines = [l for l in lines if ("<" in l or len(l) >= 30)]
    
    if len(mrz_lines) < 2:
        return {"valid": False, "raw": mrz_text}

    line1, line2 = mrz_lines[0], mrz_lines[1]
    
    try:
        # Line 1: P<USAWRIGHT<<ALEXANDER<JAMES<<<<<<<<<<<<<<<
        doc_type = line1[0:2].replace("<", "")
        country = line1[2:5].replace("<", "")
        names_part = line1[5:].split("<<")
        last_name = names_part[0].replace("<", " ").strip() if len(names_part) > 0 else ""
        first_names = names_part[1].replace("<", " ").strip() if len(names_part) > 1 else ""
        
        # Line 2: 5489021348USA8806144M3104097<<<<<<<<<<<<<<06
        doc_number = line2[0:9].replace("<", "")
        nationality = line2[10:13].replace("<", "")
        dob_raw = line2[13:19]  # YYMMDD
        gender = line2[20:21].replace("<", "")
        expiry_raw = line2[21:27]  # YYMMDD
        
        # Format dates
        yy = int(dob_raw[:2])
        century = 1900 if yy > 30 else 2000
        dob_formatted = f"{century + yy}-{dob_raw[2:4]}-{dob_raw[4:6]}"
        
        exp_yy = int(expiry_raw[:2])
        exp_century = 2000
        exp_formatted = f"{exp_century + exp_yy}-{expiry_raw[2:4]}-{expiry_raw[4:6]}"
        
        is_expired = datetime.strptime(exp_formatted, "%Y-%m-%d") < datetime.utcnow()

        return {
            "valid": True,
            "document_type": doc_type,
            "issuing_country": country,
            "last_name": last_name,
            "first_name": first_names,
            "full_name": f"{first_names} {last_name}".strip(),
            "document_number": doc_number,
            "nationality": nationality,
            "dob": dob_formatted,
            "gender": gender,
            "expiry_date": exp_formatted,
            "is_expired": is_expired,
        }
    except Exception:
        return {"valid": False, "raw": mrz_text}


class DocumentParser:
    """Extracts structured identity, address, and corporate data from documents."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def parse_document_content(self, text_content: str, doc_type: DocumentType) -> ExtractedIdentity:
        """Parse structured fields from extracted document text or OCR."""
        # 1. Check for MRZ in Passports/National IDs
        mrz_match = re.search(r"([A-Z0-9<]{30,44}\n[A-Z0-9<]{30,44})", text_content)
        mrz_data = parse_mrz(mrz_match.group(1)) if mrz_match else {"valid": False}
        
        # 2. Heuristic rule-based field extraction
        extracted = ExtractedIdentity()

        if mrz_data.get("valid"):
            extracted.full_name = ExtractedField(value=mrz_data["full_name"], confidence=0.99)
            extracted.first_name = ExtractedField(value=mrz_data["first_name"], confidence=0.99)
            extracted.last_name = ExtractedField(value=mrz_data["last_name"], confidence=0.99)
            extracted.date_of_birth = ExtractedField(value=mrz_data["dob"], confidence=0.98)
            extracted.gender = ExtractedField(value=mrz_data["gender"], confidence=0.99)
            extracted.nationality = ExtractedField(value=mrz_data["nationality"], confidence=0.99)
            extracted.id_number = ExtractedField(value=mrz_data["document_number"], confidence=0.99)
            extracted.expiry_date = ExtractedField(value=mrz_data["expiry_date"], confidence=0.98)
            extracted.issuing_authority = ExtractedField(value=mrz_data["issuing_country"], confidence=0.95)
            extracted.mrz_code = ExtractedField(value=mrz_match.group(1), confidence=0.99)
            extracted.mrz_valid = True
            extracted.is_expired = mrz_data["is_expired"]
            return extracted

        # Heuristic Regex Fallback
        lines = [l.strip() for l in text_content.splitlines() if l.strip()]
        
        # Full Name / Surname
        name_match = re.search(r"(?:Name|Surname|Customer Name|Account Holder):\s*([A-Za-z\s\.\,\-]+)", text_content, re.IGNORECASE)
        if name_match:
            raw_name = name_match.group(1).strip().replace("\n", " ")
            extracted.full_name = ExtractedField(value=raw_name, confidence=0.92)

        # Date of Birth
        dob_match = re.search(r"(?:DOB|Date of Birth|Birth Date):\s*([0-9A-Za-z\s\-\/]+)", text_content, re.IGNORECASE)
        if dob_match:
            extracted.date_of_birth = ExtractedField(value=dob_match.group(1).strip(), confidence=0.91)

        # ID / Passport Number
        id_match = re.search(r"(?:Passport No|ID No|ID|Account|Company No|Registration No):\s*([A-Za-z0-9\-\_]+)", text_content, re.IGNORECASE)
        if id_match:
            extracted.id_number = ExtractedField(value=id_match.group(1).strip(), confidence=0.93)

        # Expiration Date
        exp_match = re.search(r"(?:Date of Expiry|Date of Expiration|Expiry|Valid Until):\s*([0-9A-Za-z\s\-\/]+)", text_content, re.IGNORECASE)
        if exp_match:
            exp_val = exp_match.group(1).strip()
            extracted.expiry_date = ExtractedField(value=exp_val, confidence=0.90)
            if "EXPIRED" in text_content.upper():
                extracted.is_expired = True

        # Address extraction for Utility Bills / Bank Statements
        addr_match = re.search(r"(?:Address|Service Address|Registered Office):\s*([^\n]+(?:\n[^\n]+)?)", text_content, re.IGNORECASE)
        if addr_match:
            full_addr = addr_match.group(1).replace("\n", ", ").strip()
            extracted.street_address = ExtractedField(value=full_addr, confidence=0.88)
            
            # Country hint in address
            for c_code, c_name in [("US", "United States"), ("GB", "United Kingdom"), ("CY", "Cyprus"), ("DE", "Germany")]:
                if c_name.lower() in full_addr.lower() or f" {c_code}" in full_addr:
                    extracted.country = ExtractedField(value=c_code, confidence=0.92)
                    break

        # Corporate / KYB fields
        comp_match = re.search(r"(?:Company Name|Entity Name):\s*([A-Za-z0-9\s\,\.\&]+)", text_content, re.IGNORECASE)
        if comp_match:
            extracted.company_name = ExtractedField(value=comp_match.group(1).strip(), confidence=0.95)

        return extracted
