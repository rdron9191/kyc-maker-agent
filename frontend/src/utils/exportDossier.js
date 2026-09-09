import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Format date string to readable format
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  } catch {
    return dateStr;
  }
};

/**
 * EXCEL (.XLSX) DOSSIER EXPORTER
 */
export const exportToExcel = (caseData) => {
  const wb = XLSX.utils.book_new();

  // 1. Overview Sheet
  const risk = caseData.risk_assessment || {};
  const memo = caseData.maker_memo || {};
  const cdd = caseData.cdd_profile || {};

  const overviewData = [
    ['KYC COMPLIANCE DOSSIER - CASE SUMMARY'],
    ['Generated At', new Date().toISOString()],
    [''],
    ['Case Metadata', ''],
    ['Case Number', caseData.case_number || 'N/A'],
    ['Primary Entity Name', caseData.primary_name || 'N/A'],
    ['Entity Type', caseData.entity_type || 'N/A'],
    ['Business Scale', caseData.business_size || 'N/A'],
    ['Country of Operation', caseData.country_of_operation || 'N/A'],
    ['Email', caseData.email || 'N/A'],
    ['Phone', caseData.phone || 'N/A'],
    ['Current Stage', caseData.current_stage || 'N/A'],
    ['Case Status', caseData.status || 'N/A'],
    ['Trigger Type', caseData.trigger_type || 'N/A'],
    ['Trigger Source', caseData.trigger_source || 'N/A'],
    ['Priority', caseData.priority || 'N/A'],
    ['Assigned Maker', caseData.assigned_maker || 'N/A'],
    ['Assigned Checker', caseData.assigned_checker || 'N/A'],
    ['Deadline Date', caseData.deadline_date || 'N/A'],
    ['Created Date', formatDate(caseData.created_at)],
    ['Updated Date', formatDate(caseData.updated_at)],
    [''],
    ['Risk Evaluation & Rating', ''],
    ['Overall Risk Score', `${risk.overall_score || 0} / 100`],
    ['Risk Tier', risk.risk_tier || 'N/A'],
    ['Customer Inherent Risk', `${risk.customer_risk || 0} / 100`],
    ['Product & Services Risk', `${risk.product_risk || 0} / 100`],
    ['Geographic Risk', `${risk.geo_risk || 0} / 100`],
    ['Industry / Sector Risk', `${risk.industry_risk || 0} / 100`],
    ['Delivery Channel Risk', `${risk.channel_risk || 0} / 100`],
    ['Recommended Review Cadence', `${risk.recommended_review_cycle_months || 12} Months`],
    ['Risk Justification', risk.justification_narrative || 'N/A'],
    [''],
    ['Maker Recommendation & Summary', ''],
    ['Recommended Action', memo.recommended_action || 'N/A'],
    ['Executive Summary', memo.case_summary || 'N/A'],
    ['CDD Narrative', memo.cdd_narrative || 'N/A'],
    ['Periodic Review Delta', memo.periodic_delta_summary || 'N/A'],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Case Overview');

  // 2. Documents & Verifications Sheet
  const docsData = [
    ['SUBMITTED IDENTITY & CORPORATE DOCUMENTS'],
    ['Document Type', 'File Name', 'Status', 'Confidence %', 'Expiration Date', 'Extracted Fields Count'],
  ];
  (caseData.documents || []).forEach((doc) => {
    docsData.push([
      doc.document_type || 'N/A',
      doc.file_name || 'N/A',
      doc.status || 'N/A',
      `${Math.round((doc.confidence || 0) * 100)}%`,
      doc.expiration_date || 'N/A',
      Object.keys(doc.extracted_fields || {}).length,
    ]);
  });

  docsData.push(['']);
  docsData.push(['CROSS-DOCUMENT VERIFICATION MATRIX']);
  docsData.push(['Field Name', 'Primary Source Value', 'Corroborating Source Value', 'Match Status', 'Confidence %', 'Discrepancy Notes']);

  (caseData.verification_results || []).forEach((v) => {
    docsData.push([
      v.field_name || 'N/A',
      v.primary_source_value || 'N/A',
      v.secondary_source_value || 'N/A',
      v.match_status || 'N/A',
      `${Math.round((v.confidence || 0) * 100)}%`,
      v.discrepancy_note || 'N/A',
    ]);
  });
  const wsDocs = XLSX.utils.aoa_to_sheet(docsData);
  wsDocs['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsDocs, 'Verification Matrix');

  // 3. Screening & Watchlists Sheet
  const screeningData = [
    ['WATCHLIST, SANCTIONS, PEP & ADVERSE MEDIA SCREENING RESULTS'],
    ['Alert ID', 'Alert Type', 'Target / Match Name', 'Match Score %', 'List / Program Name', 'Category / Source', 'Disposition', 'Disposition Rationale', 'Investigated By'],
  ];
  (caseData.screening_matches || []).forEach((s) => {
    screeningData.push([
      s.id || 'N/A',
      s.type || 'N/A',
      s.match_name || 'N/A',
      `${s.match_score || 0}%`,
      s.list_name || 'N/A',
      s.program_or_category || s.adverse_media_source || 'N/A',
      s.disposition || 'UNRESOLVED',
      s.disposition_rationale || 'Pending investigation',
      s.investigated_by || 'N/A',
    ]);
  });
  const wsScreening = XLSX.utils.aoa_to_sheet(screeningData);
  wsScreening['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 45 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsScreening, 'Screening Alerts');

  // 4. CDD & Beneficial Ownership Sheet
  const cddData = [
    ['CUSTOMER DUE DILIGENCE (CDD) PROFILE'],
    ['Industry Sector', cdd.industry_sector || 'N/A'],
    ['Business Description', cdd.business_description || 'N/A'],
    ['Source of Wealth (SoW)', cdd.source_of_wealth || 'N/A'],
    ['Source of Funds (SoF)', cdd.source_of_funds || 'N/A'],
    ['Expected Monthly Volume (USD)', cdd.expected_monthly_volume_usd ? `$${cdd.expected_monthly_volume_usd.toLocaleString()}` : 'N/A'],
    ['Expected Monthly Transactions', cdd.expected_tx_count_monthly || 'N/A'],
    ['High Risk Jurisdictions', (cdd.high_risk_jurisdictions || []).join(', ') || 'None'],
    [''],
    ['ULTIMATE BENEFICIAL OWNERS (UBOS) & KEY CONTROLLERS'],
    ['Full Name', 'Ownership %', 'Nationality', 'Role / Position', 'PEP Status', 'Identity Verified'],
  ];
  (cdd.beneficial_owners || []).forEach((ubo) => {
    cddData.push([
      ubo.name || 'N/A',
      `${ubo.ownership_percentage || 0}%`,
      ubo.nationality || 'N/A',
      ubo.role || 'Beneficial Owner',
      ubo.is_pep ? 'YES' : 'NO',
      ubo.identity_verified ? 'VERIFIED' : 'PENDING',
    ]);
  });
  const wsCDD = XLSX.utils.aoa_to_sheet(cddData);
  wsCDD['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCDD, 'CDD & UBOs');

  // 5. Audit Trail Sheet
  const auditData = [
    ['COMPLETE AUDIT TRAIL LOG'],
    ['Timestamp', 'Workflow Stage', 'Actor', 'Action', 'Event Details'],
  ];
  (caseData.audit_trail || []).forEach((a) => {
    auditData.push([
      formatDate(a.timestamp),
      a.stage || 'N/A',
      a.actor || 'N/A',
      a.action || 'N/A',
      a.details || 'N/A',
    ]);
  });
  const wsAudit = XLSX.utils.aoa_to_sheet(auditData);
  wsAudit['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Trail');

  // Save Workbook
  const filename = `KYC_DOSSIER_${caseData.case_number || 'CASE'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * CSV DOSSIER EXPORTER
 */
export const exportToCSV = (caseData) => {
  const risk = caseData.risk_assessment || {};
  const memo = caseData.maker_memo || {};
  const cdd = caseData.cdd_profile || {};

  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [];
  const addRow = (...items) => rows.push(items.map(escapeCSV).join(','));

  // Header
  addRow('================================================================');
  addRow('KYC COMPLIANCE AUDIT DOSSIER (CSV EXPORT)');
  addRow('Generated On', new Date().toISOString());
  addRow('================================================================');
  addRow('');

  // 1. Case Metadata
  addRow('--- CASE METADATA ---');
  addRow('Case Number', caseData.case_number);
  addRow('Primary Name', caseData.primary_name);
  addRow('Entity Type', caseData.entity_type);
  addRow('Business Scale', caseData.business_size || 'N/A');
  addRow('Country of Operation', caseData.country_of_operation);
  addRow('Case Status', caseData.status);
  addRow('Current Stage', caseData.current_stage);
  addRow('Trigger Type', caseData.trigger_type);
  addRow('Priority', caseData.priority);
  addRow('Assigned Maker', caseData.assigned_maker);
  addRow('Assigned Checker', caseData.assigned_checker);
  addRow('Created Date', caseData.created_at);
  addRow('Updated Date', caseData.updated_at);
  addRow('');

  // 2. Risk Evaluation
  addRow('--- RISK ASSESSMENT MATRIX ---');
  addRow('Overall Risk Score', `${risk.overall_score || 0} / 100`);
  addRow('Risk Tier', risk.risk_tier);
  addRow('Customer Risk', risk.customer_risk);
  addRow('Product Risk', risk.product_risk);
  addRow('Geographic Risk', risk.geo_risk);
  addRow('Industry Risk', risk.industry_risk);
  addRow('Channel Risk', risk.channel_risk);
  addRow('Review Cadence', `${risk.recommended_review_cycle_months || 12} Months`);
  addRow('Risk Justification', risk.justification_narrative);
  addRow('');

  // 3. Maker Recommendation
  addRow('--- MAKER MEMO & RECOMMENDATION ---');
  addRow('Recommended Action', memo.recommended_action);
  addRow('Executive Summary', memo.case_summary);
  addRow('CDD Narrative', memo.cdd_narrative);
  addRow('Identity Audit', memo.identity_audit);
  addRow('Screening Audit', memo.screening_audit);
  addRow('Periodic Review Delta', memo.periodic_delta_summary || 'N/A');
  addRow('');

  // 4. CDD & UBOs
  addRow('--- CUSTOMER DUE DILIGENCE & UBOS ---');
  addRow('Industry Sector', cdd.industry_sector);
  addRow('Source of Wealth', cdd.source_of_wealth);
  addRow('Source of Funds', cdd.source_of_funds);
  addRow('Expected Monthly Volume USD', cdd.expected_monthly_volume_usd);
  addRow('');
  addRow('UBO Name', 'Ownership %', 'Nationality', 'Role', 'PEP Status', 'Identity Verified');
  (cdd.beneficial_owners || []).forEach((u) => {
    addRow(u.name, `${u.ownership_percentage}%`, u.nationality, u.role, u.is_pep ? 'YES' : 'NO', u.identity_verified ? 'YES' : 'NO');
  });
  addRow('');

  // 5. Screening Matches
  addRow('--- SCREENING & ADVERSE MEDIA ALERTS ---');
  addRow('Alert ID', 'Type', 'Target Name', 'Score %', 'List / Program', 'Disposition', 'Rationale', 'Investigator');
  (caseData.screening_matches || []).forEach((s) => {
    addRow(
      s.id,
      s.type,
      s.match_name,
      `${s.match_score}%`,
      s.list_name || s.adverse_media_source,
      s.disposition,
      s.disposition_rationale,
      s.investigated_by
    );
  });
  addRow('');

  // 6. Cross-Doc Verifications
  addRow('--- CROSS-DOCUMENT VERIFICATION MATRIX ---');
  addRow('Field Name', 'Primary Value', 'Secondary Value', 'Match Status', 'Confidence %', 'Discrepancy Note');
  (caseData.verification_results || []).forEach((v) => {
    addRow(v.field_name, v.primary_source_value, v.secondary_source_value, v.match_status, `${Math.round((v.confidence || 0) * 100)}%`, v.discrepancy_note);
  });
  addRow('');

  // 7. Audit Trail
  addRow('--- AUDIT TRAIL LOG ---');
  addRow('Timestamp', 'Stage', 'Actor', 'Action', 'Details');
  (caseData.audit_trail || []).forEach((a) => {
    addRow(a.timestamp, a.stage, a.actor, a.action, a.details);
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', csvContent);
  downloadAnchor.setAttribute('download', `KYC_DOSSIER_${caseData.case_number || 'CASE'}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

/**
 * PDF DOSSIER EXPORTER
 */
export const exportToPDF = (caseData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const risk = caseData.risk_assessment || {};
  const memo = caseData.maker_memo || {};
  const cdd = caseData.cdd_profile || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const primaryColor = [30, 41, 59];     // Slate 800
  const accentColor = [99, 102, 241];    // Indigo 500
  const darkTextColor = [15, 23, 42];   // Slate 900
  const mutedTextColor = [100, 116, 139];// Slate 500
  const lightBg = [248, 250, 252];       // Slate 50

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('KYC COMPLIANCE AUDIT DOSSIER', 36, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Autonomous KYC Maker-Checker System • Regulatory Audit Trail & Evidence', 36, 50);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 36, 50, { align: 'right' });

  let yPos = 95;

  // Case Metadata Card
  doc.setFillColor(...lightBg);
  doc.roundedRect(36, yPos, pageWidth - 72, 80, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, yPos, pageWidth - 72, 80, 4, 4, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...darkTextColor);
  doc.text(caseData.primary_name || 'N/A', 50, yPos + 22);

  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text(`Case ID: ${caseData.case_number || 'N/A'}`, pageWidth - 50, yPos + 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedTextColor);

  const col1X = 50;
  const col2X = 210;
  const col3X = 370;

  doc.text(`Entity Type: `, col1X, yPos + 42);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${caseData.entity_type || 'N/A'} ${caseData.business_size ? '(' + caseData.business_size.replace('_', ' ') + ')' : ''}`, col1X + 55, yPos + 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);
  doc.text(`Status: `, col1X, yPos + 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${caseData.status || 'N/A'}`, col1X + 38, yPos + 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);
  doc.text(`Trigger: `, col2X, yPos + 42);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${caseData.trigger_type || 'N/A'}`, col2X + 40, yPos + 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);
  doc.text(`Stage: `, col2X, yPos + 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${caseData.current_stage || 'N/A'}`, col2X + 35, yPos + 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);
  doc.text(`Risk Tier: `, col3X, yPos + 42);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${risk.risk_tier || 'N/A'} (${risk.overall_score || 0}/100)`, col3X + 45, yPos + 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);
  doc.text(`Review Cadence: `, col3X, yPos + 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`${risk.recommended_review_cycle_months || 12} Months`, col3X + 75, yPos + 58);

  yPos += 95;

  // 1. Executive Summary & Maker Memo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('1. Maker Memo & Executive Recommendation', 36, yPos);
  yPos += 6;

  const memoBody = [
    ['Recommended Action', memo.recommended_action || 'N/A'],
    ['Executive Summary', memo.case_summary || 'N/A'],
    ['CDD Narrative', memo.cdd_narrative || 'N/A'],
    ['Risk Justification', risk.justification_narrative || 'N/A'],
  ];

  if (memo.periodic_delta_summary) {
    memoBody.push(['Periodic Delta', memo.periodic_delta_summary]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Section', 'Compliance Audit Assessment']],
    body: memoBody,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: pageWidth - 72 - 120 },
    },
    margin: { left: 36, right: 36 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // 2. 5-Pillar Risk Scoring Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('2. 5-Pillar Risk Assessment Matrix', 36, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['Risk Factor', 'Inherent Score', 'Risk Level', 'Key Rationale / Contributing Drivers']],
    body: [
      ['Customer / Entity Type', `${risk.customer_risk || 0}/100`, risk.customer_risk > 60 ? 'HIGH' : risk.customer_risk > 30 ? 'MEDIUM' : 'LOW', `${caseData.entity_type} structure and complexity`],
      ['Product & Services', `${risk.product_risk || 0}/100`, risk.product_risk > 60 ? 'HIGH' : risk.product_risk > 30 ? 'MEDIUM' : 'LOW', 'International wire volume & high transactional velocity'],
      ['Geographic Jurisdiction', `${risk.geo_risk || 0}/100`, risk.geo_risk > 60 ? 'HIGH' : risk.geo_risk > 30 ? 'MEDIUM' : 'LOW', `Country of operation: ${caseData.country_of_operation}`],
      ['Industry / Sector', `${risk.industry_risk || 0}/100`, risk.industry_risk > 60 ? 'HIGH' : risk.industry_risk > 30 ? 'MEDIUM' : 'LOW', cdd.industry_sector || 'Standard Commercial'],
      ['Delivery / Channel', `${risk.channel_risk || 0}/100`, risk.channel_risk > 60 ? 'HIGH' : risk.channel_risk > 30 ? 'MEDIUM' : 'LOW', 'Direct digital API & corporate online onboarding'],
      ['OVERALL RATING', `${risk.overall_score || 0}/100`, `${risk.risk_tier || 'MEDIUM'}`, `Review cycle: ${risk.recommended_review_cycle_months || 12} mo. Next: ${memo.suggested_next_review_date || 'Annual'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
    margin: { left: 36, right: 36 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // Check page overflow
  if (yPos > pageHeight - 160) {
    doc.addPage();
    yPos = 40;
  }

  // 3. Screening Hits & Watchlist Dispositions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('3. Watchlist Screening & Adverse Media Dispositions', 36, yPos);
  yPos += 6;

  const screeningRows = (caseData.screening_matches || []).map((s) => [
    s.type || 'N/A',
    s.match_name || 'N/A',
    `${s.match_score || 0}%`,
    s.list_name || s.adverse_media_source || 'Watchlist Database',
    s.disposition || 'UNRESOLVED',
    s.disposition_rationale || 'Pending investigator review',
  ]);

  if (screeningRows.length === 0) {
    screeningRows.push(['CLEAN', 'No screening alerts identified', '0%', 'OFAC/UN/PEP Global Lists', 'CLEAN', 'All names cleared without watchlist hits']);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Subject / Target', 'Score', 'List / Source', 'Disposition', 'Disposition Rationale']],
    body: screeningRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 85 },
      2: { cellWidth: 40 },
      3: { cellWidth: 90 },
      4: { cellWidth: 65, fontStyle: 'bold' },
      5: { cellWidth: pageWidth - 72 - 335 },
    },
    margin: { left: 36, right: 36 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  if (yPos > pageHeight - 160) {
    doc.addPage();
    yPos = 40;
  }

  // 4. Cross-Document Verifications
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('4. Cross-Document Identity & Attribute Verification', 36, yPos);
  yPos += 6;

  const verifRows = (caseData.verification_results || []).map((v) => [
    v.field_name || 'N/A',
    v.primary_source_value || 'N/A',
    v.secondary_source_value || 'N/A',
    v.match_status || 'N/A',
    `${Math.round((v.confidence || 0) * 100)}%`,
    v.discrepancy_note || 'Verified against government registry',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Attribute Field', 'Primary Source', 'Secondary Source', 'Match Status', 'Confidence', 'Audit Remarks']],
    body: verifRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 95 },
      2: { cellWidth: 95 },
      3: { cellWidth: 60 },
      4: { cellWidth: 50 },
      5: { cellWidth: pageWidth - 72 - 380 },
    },
    margin: { left: 36, right: 36 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  if (yPos > pageHeight - 160) {
    doc.addPage();
    yPos = 40;
  }

  // 5. Audit Trail Timeline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('5. Immutable Audit Trail & Compliance Events', 36, yPos);
  yPos += 6;

  const auditRows = (caseData.audit_trail || []).map((a) => [
    formatDate(a.timestamp),
    a.stage || 'N/A',
    a.actor || 'N/A',
    a.action || 'N/A',
    a.details || 'N/A',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Timestamp', 'Stage', 'Actor', 'Action', 'Event Details']],
    body: auditRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 85 },
      2: { cellWidth: 70 },
      3: { cellWidth: 85 },
      4: { cellWidth: pageWidth - 72 - 325 },
    },
    margin: { left: 36, right: 36 },
  });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(
      `Confidential & Proprietary Compliance Record • Case: ${caseData.case_number || 'N/A'} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  // Save PDF
  const filename = `KYC_DOSSIER_${caseData.case_number || 'CASE'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

/**
 * JSON DOSSIER EXPORTER
 */
export const exportToJSON = (caseData) => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `KYC_DOSSIER_${caseData.case_number || 'CASE'}_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
