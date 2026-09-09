import React, { useState } from 'react';
import { X, UserPlus, Upload, Shield, Building, User, Sparkles, Bell } from 'lucide-react';

export default function NewCaseModal({ isOpen, onClose, onCaseCreated }) {
  const [entityType, setEntityType] = useState('INDIVIDUAL');
  const [primaryName, setPrimaryName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [triggerType, setTriggerType] = useState('NEW_ONBOARDING');
  const [triggerSource, setTriggerSource] = useState('CLIENT_FRONT_OFFICE');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  
  // Document upload state
  const [docType, setDocType] = useState('PASSPORT');
  const [docText, setDocText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!primaryName.trim()) {
      alert('Please provide a Primary Name / Entity Name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Case
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          primary_name: primaryName,
          email: email || undefined,
          phone: phone || undefined,
          country_of_operation: country,
          trigger_type: triggerType,
          trigger_source: triggerSource,
          priority: priority,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create case');
      const newCase = await res.json();

      // 2. If document text provided, attach and run maker
      if (docText.trim()) {
        const formData = new FormData();
        formData.append('doc_type', docType);
        formData.append('raw_text', docText);

        const docRes = await fetch(`/api/cases/${newCase.id}/documents`, {
          method: 'POST',
          body: formData,
        });
        if (docRes.ok) {
          const updatedCase = await docRes.json();
          onCaseCreated(updatedCase);
          onClose();
          return;
        }
      }

      onCaseCreated(newCase);
      onClose();
    } catch (err) {
      alert(`Error creating case: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserPlus size={20} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>New KYC Case Intake (Step 1 & 2)</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Entity Type Toggle */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Entity Classification</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEntityType('INDIVIDUAL')}
                  className="btn"
                  style={{
                    background: entityType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: '1px solid',
                    borderColor: entityType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'var(--border-medium)',
                    color: 'white',
                  }}
                >
                  <User size={16} /> Individual KYC
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType('CORPORATE')}
                  className="btn"
                  style={{
                    background: entityType === 'CORPORATE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: '1px solid',
                    borderColor: entityType === 'CORPORATE' ? 'var(--accent-primary)' : 'var(--border-medium)',
                    color: 'white',
                  }}
                >
                  <Building size={16} /> Corporate KYB
                </button>
              </div>
            </div>

            {/* Step 1: Trigger Details */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Step 1: Trigger Type</label>
                <select
                  className="form-control"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                >
                  <option value="NEW_ONBOARDING">New Customer Onboarding</option>
                  <option value="PERIODIC_RE_KYC">Periodic Review (re-KYC)</option>
                  <option value="EVENT_DRIVEN_REVIEW">Event-Driven (Ownership / Activity)</option>
                  <option value="REGULATORY_TRIGGER">Regulatory Trigger (Sanctions / Policy)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Triggered By</label>
                <select
                  className="form-control"
                  value={triggerSource}
                  onChange={(e) => setTriggerSource(e.target.value)}
                >
                  <option value="CLIENT_FRONT_OFFICE">Client / Front Office (RM)</option>
                  <option value="SYSTEM_ALERT">System Alert / Surveillance</option>
                  <option value="REGULATORY_CHANGE">Regulatory Change</option>
                  <option value="COMPLIANCE_RISK">Compliance / Risk Oversight</option>
                </select>
              </div>
            </div>

            {/* Subject Name */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                {entityType === 'INDIVIDUAL' ? 'Full Legal Name *' : 'Registered Entity Name *'}
              </label>
              <input
                type="text"
                className="form-control"
                required
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
                placeholder={entityType === 'INDIVIDUAL' ? 'e.g., Alexander James Wright' : 'e.g., Quantum Dynamics Technologies Ltd'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@domain.com"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Jurisdiction</label>
                <select
                  className="form-control"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="CY">Cyprus (CY)</option>
                  <option value="AE">UAE (AE)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="PA">Panama (PA)</option>
                  <option value="RU">Russian Federation (RU)</option>
                  <option value="SY">Syria (SY)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (24h)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Document Ingestion */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={16} color="var(--accent-secondary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Step 3: Information & Document Ingestion (Optional)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.75rem' }}>
                <select
                  className="form-control"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="NATIONAL_ID">National ID</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="UTILITY_BILL">Utility Bill</option>
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="CERT_OF_INCORPORATION">Cert of Incorporation</option>
                  <option value="SOURCE_OF_WEALTH">Source of Wealth Doc</option>
                </select>

                <textarea
                  className="form-control"
                  rows={2}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Paste OCR text, MRZ string, or document metadata for instant analysis..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Sparkles size={16} />
              {isSubmitting ? 'Creating Case...' : 'Create & Assign to Maker (Step 2)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
