import React from 'react';
import { CheckSquare, CheckCircle2, XCircle, ShieldCheck, FileCheck2, ArrowRight, Send, AlertCircle, Layers } from 'lucide-react';

export default function MakerSelfCheckView({ selfCheck, onRunSelfCheck, onSubmitToChecker, isSubmitting, currentQueue }) {
  const check = selfCheck || {};

  const items = [
    { label: 'Document Completeness & Credential Validity', status: check.documents_complete, desc: 'All required IDs, proof of address, and corporate filings collected without expiration.' },
    { label: 'UBO Structure Analysis (>= 25% Ownership)', status: check.ubos_identified_and_verified, desc: 'Ultimate Beneficial Owners identified and corroborated with government records.' },
    { label: 'Source of Wealth (SoW) & Funds (SoF)', status: check.sow_sof_documented, desc: 'Plausible wealth origin and expected transactional activity fully articulated.' },
    { label: 'Screening Alerts Dispositioned', status: check.screenings_dispositioned, desc: 'All sanctions, PEP, and adverse media matches investigated with written rationales.' },
    { label: 'Risk Rating & Justification Rationale', status: check.risk_rationale_concise, desc: '5-factor risk matrix calculated and regulatory justification synthesized.' },
    { label: 'Global KYC Policy & CDD Standards Compliance', status: check.policies_and_cdd_standards_met, desc: 'Dossier adheres strictly to global financial crime prevention rules.' },
  ];

  const allPassed = items.every(i => i.status);
  const isInCheckerQueue = currentQueue === 'L1_CHECKER_QUEUE' || currentQueue === 'L2_CHECKER_QUEUE' || currentQueue === 'MLRO_QUEUE' || currentQueue === 'COMPLETED_ARCHIVE';

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <FileCheck2 size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
              Step 7A: Maker Quality Self-Check
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Perform final self-check on completeness and accuracy before submitting to Checker queue
            </span>
          </div>
        </div>

        <span className={`badge ${allPassed ? 'badge-low' : 'badge-medium'}`}>
          {allPassed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {allPassed ? 'SELF-CHECK READY' : 'ITEMS REQUIRE ATTENTION'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-tertiary)',
              border: `1px solid ${item.status ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            {item.status ? (
              <CheckCircle2 size={18} color="var(--color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <XCircle size={18} color="var(--color-warning)" style={{ marginTop: '2px', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue Hand-off Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(14, 165, 233, 0.08))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.18)', padding: '0.6rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-secondary)' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Queue Routing: Move Record from Maker Queue to L1 Checker Queue
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Submitting transitions case status to <strong>Pending L1 Checker</strong> for independent 4-eyes compliance validation.
            </div>
          </div>
        </div>

        <button
          onClick={onSubmitToChecker}
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.35rem', fontWeight: '700' }}
        >
          <Send size={16} />
          {isInCheckerQueue ? 'View L1/L2 Checker Hub' : 'Submit to L1 Checker Queue (4-Eyes)'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
