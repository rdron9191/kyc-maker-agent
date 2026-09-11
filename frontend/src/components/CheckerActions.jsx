import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, ShieldAlert, AlertCircle, Send, CheckCircle2, RotateCcw, Calendar } from 'lucide-react';

export default function CheckerActions({ caseData, onDecisionSubmit, isSubmitting }) {
  const [checkerName, setCheckerName] = useState('Compliance Officer');
  const [comments, setComments] = useState('');
  const [rfiNotes, setRfiNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(null);
  
  // Periodic Review cycle selection
  const defaultMonths = caseData?.risk_assessment?.recommended_review_cycle_months || 12;
  const [reviewCycleMonths, setReviewCycleMonths] = useState(defaultMonths);

  useEffect(() => {
    if (caseData?.risk_assessment?.recommended_review_cycle_months) {
      setReviewCycleMonths(caseData.risk_assessment.recommended_review_cycle_months);
    }
  }, [caseData]);

  const existingReview = caseData?.checker_review;

  const handleSubmit = (decision) => {
    if (!comments.trim()) {
      alert('Please add a compliance review comment/justification before submitting.');
      return;
    }
    onDecisionSubmit({
      decision,
      checker_name: checkerName,
      comments: comments,
      rfi_notes: decision === 'RFI_REQUESTED' ? rfiNotes : null,
      review_cycle_months: parseInt(reviewCycleMonths, 10),
    });
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={20} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Compliance Checker Sign-Off & Adjudication</h3>
        </div>
        {existingReview && (
          <span className="badge badge-approved" style={{ padding: '0.35rem 0.75rem' }}>
            <CheckCircle2 size={14} /> Adjudicated by {existingReview.checker_name}
          </span>
        )}
      </div>

      {existingReview ? (
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Decision</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {existingReview.decision.replace('_', ' ')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Periodic Review</span>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-secondary)' }}>
                {caseData.next_review_date || 'Not Scheduled'} ({caseData.review_cycle_months || 12} mo)
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Officer Remarks</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              "{existingReview.comments}"
            </div>
          </div>
          {existingReview.rfi_notes && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RFI Follow-up List</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)', marginTop: '0.2rem' }}>
                {existingReview.rfi_notes}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Reviewing Officer Name</label>
              <input
                type="text"
                className="form-control"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
                placeholder="e.g., Sarah Jenkins, VP Compliance"
              />
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Periodic Review Cycle</label>
              <select
                className="form-control"
                value={reviewCycleMonths}
                onChange={(e) => setReviewCycleMonths(e.target.value)}
              >
                <option value="12">12 Months (1 Year - High Risk: High-High, High-Med, High-Low)</option>
                <option value="24">24 Months (2 Years - Medium-High Risk)</option>
                <option value="36">36 Months (3 Years - Medium-Low Risk)</option>
                <option value="60">60 Months (5 Years - Low Risk SDD)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Checker Compliance Remarks / Justification *</label>
            <textarea
              className="form-control"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide compliance reasoning for final approval, escalation to EDD, or rejection..."
            />
          </div>

          {selectedDecision === 'RFI_REQUESTED' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Specific Request for Information (RFI) Requirements</label>
              <textarea
                className="form-control"
                rows={2}
                value={rfiNotes}
                onChange={(e) => setRfiNotes(e.target.value)}
                placeholder="List required documents or clarifications from customer..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => handleSubmit('APPROVED_SDD')}
              disabled={isSubmitting}
              className="btn btn-success"
              style={{ padding: '0.85rem 1rem' }}
            >
              <ShieldCheck size={18} />
              Approve (Standard SDD)
            </button>

            <button
              onClick={() => handleSubmit('APPROVED_EDD')}
              disabled={isSubmitting}
              className="btn btn-warning"
              style={{ padding: '0.85rem 1rem' }}
            >
              <ShieldAlert size={18} />
              Approve with EDD
            </button>

            <button
              onClick={() => {
                setSelectedDecision('RFI_REQUESTED');
                if (selectedDecision === 'RFI_REQUESTED') {
                  handleSubmit('RFI_REQUESTED');
                }
              }}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1rem' }}
            >
              <AlertCircle size={18} />
              Request Info (RFI)
            </button>

            <button
              onClick={() => handleSubmit('REJECTED')}
              disabled={isSubmitting}
              className="btn btn-danger"
              style={{ padding: '0.85rem 1rem' }}
            >
              <ShieldAlert size={18} />
              Reject / Prohibit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
