import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, ShieldAlert, AlertCircle, RotateCcw, Shield, CheckCircle2, Send, AlertOctagon } from 'lucide-react';

export default function CitiCheckerHub({ caseData, onDecisionSubmit, onMLROSubmit, isSubmitting }) {
  const [checkerName, setCheckerName] = useState('Senior Compliance Officer');
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
  }, [caseData]);

  const existingReview = caseData?.checker_review;
  const mlroEscalation = caseData?.mlro_escalation;

  const handleCheckerDecision = (decision) => {
    if (!comments.trim() && decision !== 'RETURNED_TO_MAKER' && decision !== 'ESCALATED_MLRO') {
      alert('Please add compliance review comments before submitting.');
      return;
    }
    if (decision === 'RETURNED_TO_MAKER' && !rfiNotes.trim() && !comments.trim()) {
      alert('Please specify the required amendments or clarifications for the Maker.');
      return;
    }
    if (decision === 'ESCALATED_MLRO' && !escalationReason.trim()) {
      alert('Please provide a specific escalation justification for the MLRO.');
      return;
    }

    onDecisionSubmit({
      decision,
      checker_name: checkerName,
      comments: comments || (decision === 'RETURNED_TO_MAKER' ? 'Returned to Maker for amendment' : 'Escalated to MLRO'),
      rfi_notes: decision === 'RETURNED_TO_MAKER' ? (rfiNotes || comments) : null,
      escalation_reason: decision === 'ESCALATED_MLRO' ? escalationReason : null,
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

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hub Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
              Step 8 & 9: Independent Checker Review & Adjudication
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Independent verification of completeness, accuracy, risk rating, and rationale
            </span>
          </div>
        </div>

        {existingReview && (
          <span className="badge badge-approved">
            <CheckCircle2 size={14} /> Adjudicated by {existingReview.checker_name}
          </span>
        )}
      </div>

      {/* Step 11: MLRO Escalation Panel if Case is Escalated */}
      {caseData.status === 'ESCALATED_MLRO' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--color-critical)" />
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-critical)' }}>
              Step 11: Senior MLRO / FCC Escalation Authorization
            </h4>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Escalation Reason:</strong> {mlroEscalation?.escalation_reason || 'Requires senior financial crime compliance approval.'}
          </div>

          <form onSubmit={handleMLROSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">MLRO Decision</label>
                <select
                  className="form-control"
                  value={mlroDecision}
                  onChange={(e) => setMlroDecision(e.target.value)}
                >
                  <option value="APPROVED">Approve (Authorize with EDD & Conditions)</option>
                  <option value="RETURNED">Return to Maker / Front Office for Additional Info</option>
                  <option value="REJECTED">Decline / Exit Relationship (Prohibited)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Authorized Reviewer</label>
                <input
                  type="text"
                  className="form-control"
                  value={mlroReviewer}
                  onChange={(e) => setMlroReviewer(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">MLRO Regulatory Findings & Conditions *</label>
              <textarea
                className="form-control"
                rows={2}
                value={mlroNotes}
                onChange={(e) => setMlroNotes(e.target.value)}
                placeholder="Document senior compliance rationale, enhanced transaction thresholds, or rejection directive..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                <Shield size={14} /> Submit MLRO Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Standard Checker Decision Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Reviewing Checker Name</label>
            <input
              type="text"
              className="form-control"
              value={checkerName}
              onChange={(e) => setCheckerName(e.target.value)}
              placeholder="e.g., Sarah Jenkins, Senior Compliance Checker"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Ongoing Review Cycle (Step 12)</label>
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
          <label className="form-label">Checker Review Comments / Justification *</label>
          <textarea
            className="form-control"
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Document independent verification of CDD completeness, accuracy, risk rating, and rationale..."
          />
        </div>

        {/* 4 Citi Decision Branching Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={() => handleCheckerDecision('APPROVED_SDD')}
            disabled={isSubmitting}
            className="btn btn-success"
            style={{ padding: '0.85rem 1rem' }}
          >
            <ShieldCheck size={18} />
            Approve (Proceed to Step 10)
          </button>

          <button
            onClick={() => handleCheckerDecision('APPROVED_EDD')}
            disabled={isSubmitting}
            className="btn btn-warning"
            style={{ padding: '0.85rem 1rem' }}
          >
            <ShieldAlert size={18} />
            Conditional Approval (EDD)
          </button>

          <button
            onClick={() => {
              const reason = prompt('Specify amendments needed for Maker (Step C):', rfiNotes || comments);
              if (reason) {
                setRfiNotes(reason);
                handleCheckerDecision('RETURNED_TO_MAKER');
              }
            }}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{ padding: '0.85rem 1rem' }}
          >
            <RotateCcw size={18} />
            Return to Maker (Step C)
          </button>

          <button
            onClick={() => {
              const esc = prompt('Specify escalation justification for MLRO (Step 11):', escalationReason || comments);
              if (esc) {
                setEscalationReason(esc);
                handleCheckerDecision('ESCALATED_MLRO');
              }
            }}
            disabled={isSubmitting}
            className="btn btn-danger"
            style={{ padding: '0.85rem 1rem' }}
          >
            <Shield size={18} />
            Escalate to MLRO (Step 11)
          </button>
        </div>
      </div>
    </div>
  );
}
