import React from 'react';
import { Bot, CheckCircle, ShieldAlert, AlertCircle, FileCheck, Award, ListChecks, Calendar, RefreshCw, TrendingUp } from 'lucide-react';

export default function MakerMemo({ memo }) {
  if (!memo) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No Maker Memo generated yet.
      </div>
    );
  }

  const rec = memo.recommended_action;
  let recBadge = 'badge-approved';
  let recText = 'APPROVE (SDD)';

  if (rec === 'APPROVE_EDD') {
    recBadge = 'badge-medium';
    recText = 'APPROVE WITH EDD (ENHANCED DUE DILIGENCE)';
  } else if (rec === 'REQUEST_RFI') {
    recBadge = 'badge-rfi';
    recText = 'REQUEST ADDITIONAL INFO (RFI)';
  } else if (rec === 'REJECT_PROHIBITED') {
    recBadge = 'badge-critical';
    recText = 'REJECT & PROHIBIT ONBOARDING';
  }

  const isPeriodic = memo.review_type === 'PERIODIC_REVIEW';

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: isPeriodic ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            {isPeriodic ? <RefreshCw size={22} /> : <Bot size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                {isPeriodic ? 'Periodic KYC Review Dossier' : 'AI KYC Maker Compliance Dossier'}
              </h3>
              <span className="brand-badge">{memo.maker_agent_version}</span>
              {isPeriodic && (
                <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                  <RefreshCw size={10} /> REFRESH CYCLE
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Synthesized on {new Date(memo.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem', textAlign: 'right' }}>
            Preliminary Maker Recommendation
          </div>
          <span className={`badge ${recBadge}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
            {recText}
          </span>
        </div>
      </div>

      {/* Periodic Review Schedule Banner */}
      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-accent)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={20} color="var(--accent-secondary)" />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Periodic Review Schedule
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Required Ongoing Due Diligence Cadence: <strong>Every {memo.recommended_review_cycle_months || 12} Months</strong>
            </div>
          </div>
        </div>

        {memo.suggested_next_review_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suggested Next Review:</span>
            <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'var(--border-accent)', color: 'var(--accent-secondary)', fontWeight: '700' }}>
              {memo.suggested_next_review_date}
            </span>
          </div>
        )}
      </div>

      {/* Periodic Review Delta Callout if available */}
      {memo.periodic_delta_summary && (
        <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <TrendingUp size={16} color="var(--color-info)" />
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-info)' }}>
              Periodic Review Delta Analysis
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            {memo.periodic_delta_summary}
          </p>
        </div>
      )}

      {/* 1. Executive Summary */}
      <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
          Executive Summary
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {memo.case_summary}
        </p>
      </div>

      {/* 2-Column Audit Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Identity & Verification Audit */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FileCheck size={18} color="var(--color-success)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Identity & Credential Audit</h4>
          </div>
          <pre style={{
            fontSize: '0.825rem',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}>
            {memo.identity_audit}
          </pre>
        </div>

        {/* Screening & Watchlist Audit */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldAlert size={18} color="var(--color-warning)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Screening & Negative News Audit</h4>
          </div>
          <pre style={{
            fontSize: '0.825rem',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}>
            {memo.screening_audit}
          </pre>
        </div>
      </div>

      {/* 3. Risk Assessment & Justification */}
      <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Award size={18} color="var(--accent-secondary)" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Risk Justification & Regulatory Rationale</h4>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {memo.risk_justification}
        </p>
      </div>

      {/* 4. Action Items & Mitigating Factors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Mitigating Factors */}
        {memo.mitigating_factors && memo.mitigating_factors.length > 0 && (
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-success)', marginBottom: '0.6rem' }}>
              Identified Mitigating Factors
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {memo.mitigating_factors.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Required RFI Items */}
        {memo.rfi_items_required && memo.rfi_items_required.length > 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-warning)', marginBottom: '0.6rem' }}>
              Actionable RFI / Follow-up Requirements
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {memo.rfi_items_required.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
