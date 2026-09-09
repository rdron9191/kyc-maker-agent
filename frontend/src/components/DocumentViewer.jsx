import React, { useState } from 'react';
import { FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, Eye, Hash, Building, User } from 'lucide-react';

export default function DocumentViewer({ documents = [] }) {
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);

  if (!documents || documents.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
        <p>No documents uploaded for this case yet.</p>
      </div>
    );
  }

  const currentDoc = documents[selectedDocIndex] || documents[0];
  const ext = currentDoc.extracted_data || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem' }}>
      {/* Left List of Documents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          Submitted Files ({documents.length})
        </div>
        {documents.map((doc, idx) => {
          const isSelected = idx === selectedDocIndex;
          const isExpired = doc.extracted_data?.is_expired;

          return (
            <div
              key={doc.id || idx}
              onClick={() => setSelectedDocIndex(idx)}
              className="glass-panel"
              style={{
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                <FileText size={18} color={isSelected ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.filename}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {doc.doc_type}
                  </div>
                </div>
              </div>
              {isExpired ? (
                <span className="badge badge-high" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                  EXPIRED
                </span>
              ) : (
                <span className="badge badge-low" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                  VALID
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Extracted Metadata & OCR View */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', pb: '1rem', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{currentDoc.filename}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type: {currentDoc.doc_type}</span>
          </div>
          {currentDoc.extracted_data?.mrz_valid && (
            <span className="badge badge-low">
              <ShieldCheck size={14} /> ICAO 9303 MRZ VERIFIED
            </span>
          )}
        </div>

        {/* Extracted Identity Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Full Name */}
          {ext.full_name && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Extracted Name</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{ext.full_name.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                Confidence: {Math.round((ext.full_name.confidence || 1) * 100)}%
              </div>
            </div>
          )}

          {/* DOB */}
          {ext.date_of_birth && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date of Birth</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{ext.date_of_birth.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                Confidence: {Math.round((ext.date_of_birth.confidence || 1) * 100)}%
              </div>
            </div>
          )}

          {/* ID / Passport Number */}
          {ext.id_number && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Document ID Number</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{ext.id_number.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                Confidence: {Math.round((ext.id_number.confidence || 1) * 100)}%
              </div>
            </div>
          )}

          {/* Expiry Date */}
          {ext.expiry_date && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Expiry Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', fontFamily: 'var(--font-mono)', color: ext.is_expired ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                {ext.expiry_date.value} {ext.is_expired && '(EXPIRED)'}
              </div>
            </div>
          )}

          {/* Nationality / Authority */}
          {ext.nationality && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nationality</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{ext.nationality.value}</div>
            </div>
          )}

          {/* Address */}
          {ext.street_address && (
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Extracted Address / Residence</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                {ext.street_address.value} {ext.city?.value ? `, ${ext.city.value}` : ''} {ext.postal_code?.value ? ` ${ext.postal_code.value}` : ''} {ext.country?.value ? `, ${ext.country.value}` : ''}
              </div>
            </div>
          )}

          {/* Corporate fields if present */}
          {ext.company_name && (
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Registered Entity</div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>{ext.company_name.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Registration No: {ext.registration_number?.value || 'N/A'} | Jurisdiction: {ext.jurisdiction_of_incorporation?.value || 'N/A'}
              </div>
              {ext.ubos && ext.ubos.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Ultimate Beneficial Owners (UBO):
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {ext.ubos.map((u, i) => (
                      <span key={i} className="tag" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'var(--border-accent)', color: 'var(--accent-secondary)' }}>
                        <User size={12} style={{ marginRight: '4px' }} />
                        {u.name} ({u.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Raw OCR / Text Preview */}
        {currentDoc.raw_text && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Extracted OCR / Raw Text Content
            </div>
            <pre style={{
              background: 'var(--bg-primary)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)'
            }}>
              {currentDoc.raw_text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
