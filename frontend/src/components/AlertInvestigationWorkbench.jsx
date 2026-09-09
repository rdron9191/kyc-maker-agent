import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle2, UserCheck, MessageSquare, Send, Bot } from 'lucide-react';

export default function AlertInvestigationWorkbench({ caseId, screeningMatches = [], onDispositionSubmit }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [disposition, setDisposition] = useState('FALSE_POSITIVE');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (alertId) => {
    if (!rationale.trim()) {
      alert('Please provide a documented disposition rationale as required by KYC policy.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onDispositionSubmit({
        alert_id: alertId,
        disposition: disposition,
        rationale: rationale,
        investigator_name: 'KYC Maker Specialist (AI Assisted)',
      });
      setSelectedAlert(null);
      setRationale('');
    } catch (err) {
      alert(`Disposition failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
              Step 6: Investigate Alerts & Exceptions
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Review potential matches, document false positive rationales, or escalate red flags to MLRO
            </span>
          </div>
        </div>

        <span className="tag" style={{ color: 'var(--accent-secondary)' }}>
          {screeningMatches.length} Alert(s) Under Surveillance
        </span>
      </div>

      {screeningMatches.length === 0 ? (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={24} color="var(--color-success)" />
          <div style={{ fontSize: '0.875rem' }}>
            <strong>No active alerts or red flags.</strong> Customer screening across all sanctions, PEP, and adverse media watchlists returned clean.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {screeningMatches.map((m) => {
            const isEditing = selectedAlert === m.id;
            let dispClass = 'badge-pending';
            if (m.disposition === 'FALSE_POSITIVE') dispClass = 'badge-approved';
            if (m.disposition === 'TRUE_POSITIVE') dispClass = 'badge-critical';
            if (m.disposition === 'ESCALATED') dispClass = 'badge-high';

            return (
              <div
                key={m.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag" style={{ fontWeight: '700' }}>{m.type}</span>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{m.matched_entity}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({m.list_name})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag">Match: {m.match_score}%</span>
                    <span className={`badge ${dispClass}`}>
                      {m.disposition.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {m.risk_summary}
                </div>

                {/* Documented Disposition Rationale */}
                {m.disposition_rationale && (
                  <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.825rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      Documented Investigation Rationale ({m.investigated_by || 'Maker'}):
                    </div>
                    <div style={{ color: 'var(--text-primary)' }}>{m.disposition_rationale}</div>
                  </div>
                )}

                {/* Edit Disposition Form */}
                {isEditing ? (
                  <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--border-accent)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                      <div>
                        <label className="form-label">Disposition Decision</label>
                        <select
                          className="form-control"
                          value={disposition}
                          onChange={(e) => setDisposition(e.target.value)}
                        >
                          <option value="FALSE_POSITIVE">False Positive (Dismiss)</option>
                          <option value="TRUE_POSITIVE">True Positive (Confirmed Match)</option>
                          <option value="ESCALATED">Escalate to MLRO / Compliance</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Investigation Rationale & Justification *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={rationale}
                          onChange={(e) => setRationale(e.target.value)}
                          placeholder="e.g., Verified distinct date of birth and passport issuing authority; no match..."
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => setSelectedAlert(null)} className="btn btn-secondary btn-sm">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmit(m.id)}
                        disabled={isSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        <Send size={14} /> Save Disposition
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setSelectedAlert(m.id);
                        setDisposition(m.disposition || 'FALSE_POSITIVE');
                        setRationale(m.disposition_rationale || '');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Update Disposition & Rationale
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
