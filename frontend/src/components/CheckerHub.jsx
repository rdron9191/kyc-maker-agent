import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  RotateCcw,
  Shield,
  CheckCircle2,
  Send,
  AlertOctagon,
  Layers,
  ArrowRight,
  UserCheck2,
  Users,
  Award
} from 'lucide-react';

export default function CheckerHub({ caseData, onDecisionSubmit, onMLROSubmit, isSubmitting }) {
  const [activeRole, setActiveRole] = useState('L1'); // 'L1' | 'L2' | 'MLRO'
  const [checkerName, setCheckerName] = useState('Sarah Jenkins (L1 Checker)');
  const [comments, setComments] = useState('');
  const [rfiNotes, setRfiNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  
  // Review Cycle
  const defaultMonths = caseData?.risk_assessment?.recommended_review_cycle_months || 12;
  const [reviewCycleMonths, setReviewCycleMonths] = useState(defaultMonths);

  // MLRO Review Form state
  const [mlroDecision, setMlroDecision] = useState('APPROVED');
  const [mlroNotes, setMlroNotes] = useState('');
  const [mlroReviewer, setMlroReviewer] = useState('Head of Financial Crime Compliance (MLRO)');

  useEffect(() => {
    if (caseData?.risk_assessment?.recommended_review_cycle_months) {
      setReviewCycleMonths(caseData.risk_assessment.recommended_review_cycle_months);
    }

    // Auto-select role tab based on case's current queue or status
    if (caseData?.current_queue === 'MLRO_QUEUE' || caseData?.status === 'ESCALATED_MLRO') {
      setActiveRole('MLRO');
    } else if (caseData?.current_queue === 'L2_CHECKER_QUEUE' || caseData?.status === 'PENDING_L2_CHECKER') {
      setActiveRole('L2');
      setCheckerName('David Vance (L2 Senior VP)');
    } else {
      setActiveRole('L1');
      setCheckerName('Sarah Jenkins (L1 Checker)');
    }
  }, [caseData]);

  const l1Review = caseData?.l1_review || (caseData?.checker_review?.checker_level === 'L1' ? caseData?.checker_review : null);
  const l2Review = caseData?.l2_review || (caseData?.checker_review?.checker_level === 'L2' ? caseData?.checker_review : null);
  const mlroEscalation = caseData?.mlro_escalation;

  const handleCheckerDecision = (decision, targetLevel = activeRole) => {
    if (!comments.trim() && decision !== 'RETURNED_TO_MAKER' && decision !== 'ESCALATED_MLRO') {
      alert('Please add compliance review comments before submitting.');
      return;
    }
    if (decision === 'RETURNED_TO_MAKER' && !rfiNotes.trim() && !comments.trim()) {
      alert('Please specify the required amendments or clarifications for the Maker.');
      return;
    }
    if (decision === 'ESCALATED_MLRO' && !escalationReason.trim() && !comments.trim()) {
      alert('Please provide a specific escalation justification for the MLRO.');
      return;
    }

    onDecisionSubmit({
      decision,
      checker_level: targetLevel,
      checker_name: checkerName,
      comments: comments || (decision === 'RETURNED_TO_MAKER' ? 'Returned to Maker for amendment' : 'Escalated to MLRO'),
      rfi_notes: decision === 'RETURNED_TO_MAKER' ? (rfiNotes || comments) : null,
      escalation_reason: decision === 'ESCALATED_MLRO' ? (escalationReason || comments) : (decision === 'PENDING_L2_CHECKER' ? (escalationReason || comments) : null),
      review_cycle_months: parseInt(reviewCycleMonths, 10),
    });
  };

  const handleMLROSubmitForm = (e) => {
    e.preventDefault();
    if (!mlroNotes.trim()) {
      alert('Please provide MLRO compliance notes.');
      return;
    }
    onMLROSubmit({
      decision: mlroDecision,
      notes: mlroNotes,
      reviewer: mlroReviewer,
    });
  };

  const getQueueBadge = (q) => {
    switch (q) {
      case 'MAKER_QUEUE':
        return { label: 'Maker Queue', bg: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' };
      case 'L1_CHECKER_QUEUE':
        return { label: 'L1 Checker Queue (4-Eyes)', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
      case 'L2_CHECKER_QUEUE':
        return { label: 'L2 Senior Checker Queue (6-Eyes)', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
      case 'MLRO_QUEUE':
        return { label: 'MLRO Escalation Queue', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'PERIODIC_MONITORING_QUEUE':
        return { label: 'Periodic Monitoring Queue', bg: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' };
      case 'COMPLETED_ARCHIVE':
        return { label: 'Completed Archive', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
      default:
        return { label: q || 'Active Queue', bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' };
    }
  };

  const currentQueueBadge = getQueueBadge(caseData?.current_queue);

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hub Header & Queue Location */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
              Multi-Level Compliance Checker & Escalation Hub
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Independent 4-Eyes (L1), 6-Eyes (L2 Senior), and MLRO governance workflow
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Location:</span>
          <span className="tag" style={{ background: currentQueueBadge.bg, color: currentQueueBadge.color, borderColor: currentQueueBadge.color, fontWeight: '700' }}>
            📍 {currentQueueBadge.label}
          </span>
        </div>
      </div>

      {/* Role Navigation Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => {
            setActiveRole('L1');
            setCheckerName('Sarah Jenkins (L1 Checker)');
          }}
          className="btn btn-sm"
          style={{
            flex: 1,
            background: activeRole === 'L1' ? 'var(--accent-primary)' : 'transparent',
            color: activeRole === 'L1' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <UserCheck size={15} />
          <span>L1 Checker (4-Eyes)</span>
          {l1Review && <CheckCircle2 size={12} color="#10b981" />}
        </button>

        <button
          onClick={() => {
            setActiveRole('L2');
            setCheckerName('David Vance (L2 Senior VP)');
          }}
          className="btn btn-sm"
          style={{
            flex: 1,
            background: activeRole === 'L2' ? 'var(--accent-primary)' : 'transparent',
            color: activeRole === 'L2' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <Users size={15} />
          <span>L2 Senior Checker (6-Eyes)</span>
          {l2Review && <CheckCircle2 size={12} color="#10b981" />}
        </button>

        <button
          onClick={() => setActiveRole('MLRO')}
          className="btn btn-sm"
          style={{
            flex: 1,
            background: activeRole === 'MLRO' ? '#dc2626' : 'transparent',
            color: activeRole === 'MLRO' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <Shield size={15} />
          <span>MLRO / Escalation</span>
          {caseData?.status === 'ESCALATED_MLRO' && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Active</span>
          )}
        </button>
      </div>

      {/* Prior Review History Cards (L1 / L2) */}
      {(l1Review || l2Review) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {l1Review && (
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#60a5fa' }}>L1 4-Eyes Review Summary</span>
                <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>{l1Review.decision}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                <strong>Checker:</strong> {l1Review.checker_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                "{l1Review.comments}"
              </div>
            </div>
          )}

          {l2Review && (
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c084fc' }}>L2 6-Eyes Review Summary</span>
                <span className="tag" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>{l2Review.decision}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                <strong>Senior Reviewer:</strong> {l2Review.checker_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                "{l2Review.comments}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role-Specific Review Panels */}
      {activeRole === 'L1' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>L1 Checker Scope (4-Eyes):</strong> Verify Maker KYC quality checklist, validate identity documents, confirm screening dispositions, and decide whether to approve SDD or route high-risk/complex entities to L2 Senior Checker.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">L1 Checker Name</label>
              <input
                type="text"
                className="form-control"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Re-KYC Monitoring Cycle</label>
              <select
                className="form-control"
                value={reviewCycleMonths}
                onChange={(e) => setReviewCycleMonths(e.target.value)}
              >
                <option value="6">6 Months (Continuous / Heightened Risk)</option>
                <option value="12">12 Months (High Risk EDD / Annual)</option>
                <option value="24">24 Months (Medium Risk / Biennial)</option>
                <option value="36">36 Months (Low Risk / Triennial)</option>
                <option value="60">60 Months (Simplified SDD)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">L1 Compliance Findings & Rationale *</label>
            <textarea
              className="form-control"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Document 4-eyes verification of document completeness, UBO verification, and risk rating..."
            />
          </div>

          {/* L1 Decision Branching Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              onClick={() => handleCheckerDecision('APPROVED_SDD', 'L1')}
              disabled={isSubmitting}
              className="btn btn-success"
              style={{ padding: '0.85rem 1rem' }}
            >
              <ShieldCheck size={18} />
              Approve SDD (Archive)
            </button>

            <button
              onClick={() => {
                const esc = prompt('Specify reason for 6-Eyes L2 Senior Escalation:', 'High-velocity transaction activity or complex multi-tier UBO structure');
                if (esc) {
                  setEscalationReason(esc);
                  handleCheckerDecision('PENDING_L2_CHECKER', 'L1');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-warning"
              style={{ padding: '0.85rem 1rem', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderColor: '#8b5cf6' }}
            >
              <Users size={18} />
              Escalate to L2 (6-Eyes)
            </button>

            <button
              onClick={() => {
                const reason = prompt('Specify amendments needed for Maker (RFI):', rfiNotes || comments);
                if (reason) {
                  setRfiNotes(reason);
                  handleCheckerDecision('RETURNED_TO_MAKER', 'L1');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1rem' }}
            >
              <RotateCcw size={18} />
              Return to Maker (RFI)
            </button>

            <button
              onClick={() => {
                const esc = prompt('Specify escalation justification for MLRO:', escalationReason || comments);
                if (esc) {
                  setEscalationReason(esc);
                  handleCheckerDecision('ESCALATED_MLRO', 'L1');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-danger"
              style={{ padding: '0.85rem 1rem' }}
            >
              <Shield size={18} />
              Escalate to MLRO
            </button>
          </div>
        </div>
      )}

      {activeRole === 'L2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>L2 Senior Checker Scope (6-Eyes Senior Sign-Off):</strong> Perform senior adjudication on escalated high-risk cases, PEP relationships, or complex corporate ownership structures. Authorize Enhanced Due Diligence (EDD) or remand to prior queues.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">L2 Senior Checker Name</label>
              <input
                type="text"
                className="form-control"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Approved Monitoring Cadence</label>
              <select
                className="form-control"
                value={reviewCycleMonths}
                onChange={(e) => setReviewCycleMonths(e.target.value)}
              >
                <option value="6">6 Months (Continuous / Heightened Risk)</option>
                <option value="12">12 Months (High Risk EDD / Annual)</option>
                <option value="24">24 Months (Medium Risk / Biennial)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">L2 Senior Adjudication Notes & Conditions *</label>
            <textarea
              className="form-control"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Document senior compliance rationale, enhanced transactional conditions, or remand directions..."
            />
          </div>

          {/* L2 Decision Branching Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              onClick={() => handleCheckerDecision('APPROVED_EDD', 'L2')}
              disabled={isSubmitting}
              className="btn btn-success"
              style={{ padding: '0.85rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Award size={18} />
              Approve EDD (6-Eyes Sign-Off)
            </button>

            <button
              onClick={() => {
                const rem = prompt('Specify reasons for remanding back to L1 Checker:', comments);
                if (rem) {
                  setComments(rem);
                  handleCheckerDecision('RETURNED_TO_L1', 'L2');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1rem', borderColor: '#818cf8', color: '#818cf8' }}
            >
              <RotateCcw size={18} />
              Remand to L1 Checker
            </button>

            <button
              onClick={() => {
                const rfi = prompt('Specify amendments required for Maker:', comments);
                if (rfi) {
                  setRfiNotes(rfi);
                  handleCheckerDecision('RETURNED_TO_MAKER', 'L2');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1rem' }}
            >
              <RotateCcw size={18} />
              Return to Maker
            </button>

            <button
              onClick={() => {
                const esc = prompt('Specify MLRO Escalation reason:', escalationReason || comments);
                if (esc) {
                  setEscalationReason(esc);
                  handleCheckerDecision('ESCALATED_MLRO', 'L2');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-danger"
              style={{ padding: '0.85rem 1rem' }}
            >
              <Shield size={18} />
              Escalate to MLRO
            </button>
          </div>
        </div>
      )}

      {activeRole === 'MLRO' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--color-critical)" />
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-critical)' }}>
              Senior MLRO / Head of Financial Crime Escalation Authorization
            </h4>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Escalation Context:</strong> {mlroEscalation?.escalation_reason || 'Under MLRO review for regulatory, sanctions, or PEP exception clearance.'}
          </div>

          <form onSubmit={handleMLROSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">MLRO Executive Decision</label>
                <select
                  className="form-control"
                  value={mlroDecision}
                  onChange={(e) => setMlroDecision(e.target.value)}
                >
                  <option value="APPROVED">Authorize (Proceed with EDD & Enhanced Controls)</option>
                  <option value="RETURNED">Return to Maker / Front Office for Additional Info</option>
                  <option value="REJECTED">Decline / Prohibit Onboarding (Exit Relationship)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Authorized Signatory</label>
                <input
                  type="text"
                  className="form-control"
                  value={mlroReviewer}
                  onChange={(e) => setMlroReviewer(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">MLRO Regulatory Findings & Safeguards *</label>
              <textarea
                className="form-control"
                rows={2}
                value={mlroNotes}
                onChange={(e) => setMlroNotes(e.target.value)}
                placeholder="Document executive compliance rationale, senior management approval, or rejection rationale..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm" style={{ background: '#dc2626', borderColor: '#b91c1c' }}>
                <Shield size={14} /> Submit MLRO Determination
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
