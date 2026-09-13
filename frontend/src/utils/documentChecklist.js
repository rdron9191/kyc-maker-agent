// Product baseline only; country policy must be supplied by compliance.
export function documentChecklist(caseData) {
  const corporate = caseData.entity_type === 'CORPORATE';
  const items = corporate ? [
    ['Certificate of incorporation / company registration', ['CERT_OF_INCORPORATION']],
    ['Current constitutional documents / articles of association', ['ARTICLES_OF_ASSOCIATION']],
    ['Current register of directors and authorised signatories', []],
    ['Complete ownership chart and shareholder register with ownership percentages', []],
    ['Identification and address evidence for beneficial owners and authorised signatories', []],
    ['Evidence of registered and operating business address', []],
    ['Business activity, account purpose and expected transaction profile', []],
  ] : [
    ['Current government-issued photo ID (passport or national ID)', ['PASSPORT', 'NATIONAL_ID']],
    ['Proof of residential address', ['UTILITY_BILL']],
    ['Occupation, account purpose and expected transaction profile', []],
  ];
  items.push(['Source of funds explanation and supporting evidence', []]);
  const accepted = new Set((caseData.documents || []).filter(doc => doc.validation_status === 'VALID' && !doc.extracted_data?.is_expired).map(doc => doc.doc_type));
  return items.filter(([, types]) => !types.some(type => accepted.has(type))).map(([label], index) => `${index + 1}. ${label}`).join('\n');
}
