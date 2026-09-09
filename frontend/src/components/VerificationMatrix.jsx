import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, FileSearch } from 'lucide-react';

export default function VerificationMatrix({ discrepancies = [], documents = [] }) {
  const hasDiscrepancies = discrepancies && discrepancies.length > 0;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSearch size={18} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Cross-Document Verification Matrix</h3>
        </div>
        {hasDiscrepancies ? (
          <span className="badge badge-high">
            <AlertTriangle size={12} />
            {discrepancies.length} Discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} Flagged
          </span>
        ) : (
          <span className="badge badge-low">
            <CheckCircle2 size={12} />
            All Cross-Checks Verified
          </span>
        )}
      </div>

      {/* Standard Verification Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Document Validity</span>
          {discrepancies.some(d => d.field === 'document_validity') ? (
            <span className="badge badge-high" style={{ fontSize: '0.7rem' }}>EXPIRED DETECTED</span>
          ) : (
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>ALL ACTIVE</span>
          )}
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Name Consistency</span>
          {discrepancies.some(d => d.field.includes('name')) ? (
            <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>MISMATCH</span>
          ) : (
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>MATCH CONFIRMED</span>
          )}
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Proof of Address</span>
          {discrepancies.some(d => d.field.includes('address')) ? (
            <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>REQUIRES REVIEW</span>
          ) : (
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>VALIDATED</span>
          )}
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Beneficial Ownership</span>
          {discrepancies.some(d => d.field.includes('ubo')) ? (
            <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>MISSING ID</span>
          ) : (
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>VERIFIED / N/A</span>
          )}
        </div>
      </div>

      {/* Discrepancy Detail List */}
      {hasDiscrepancies ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            Flagged Discrepancies & Anomalies
          </div>
          {discrepancies.map((d, i) => {
            let badgeStyle = 'badge-medium';
            let Icon = AlertTriangle;
            if (d.severity === 'HIGH') {
              badgeStyle = 'badge-high';
              Icon = AlertTriangle;
            } else if (d.severity === 'CRITICAL') {
              badgeStyle = 'badge-critical';
              Icon = AlertOctagon;
            }

            return (
              <div
                key={d.id || i}
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={16} color="var(--color-danger)" />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {d.field.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`badge ${badgeStyle}`}>{d.severity}</span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {d.description}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-primary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expected: </span>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-success)' }}>{d.expected}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Found: </span>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-danger)' }}>{d.found}</div>
                  </div>
                </div>

                {d.source_documents && d.source_documents.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>Source Files:</span>
                    {d.source_documents.map((f, idx) => (
                      <span key={idx} className="tag">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={24} color="var(--color-success)" />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <strong>All cross-document consistency criteria met.</strong> Names, birthdates, validity periods, and addresses align seamlessly across submitted credential packages.
          </div>
        </div>
      )}
    </div>
  );
}
