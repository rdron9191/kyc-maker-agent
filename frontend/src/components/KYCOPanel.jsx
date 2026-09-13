import React, { useState } from 'react';
import { documentChecklist } from '../utils/documentChecklist';

export default function KYCOPanel({ caseData, onCaseUpdated }) {
  const [form, setForm] = useState(() => ({ kyco_email: '', pam_email: '', rm_email: '', premium_client: false, executive_email: '', ...caseData.kyco_contacts, requested_documents: caseData.kyco_contacts?.requested_documents?.trim() ? caseData.kyco_contacts.requested_documents : documentChecklist(caseData) }));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/cases/${caseData.id}/kyco-contacts`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Could not save. Both KYCO and PAM need valid email assignments.');
      onCaseUpdated(await response.json());
      setMessage('Contacts and draft saved.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };
  const subject = `Document request — ${caseData.case_number}`;
  const body = `Dear KYCO,\n\nPlease coordinate the following document request for ${caseData.primary_name} (${caseData.country_of_operation}).\n\n${form.requested_documents}\n\nThe RM is the direct client contact.${form.premium_client ? ' Please coordinate with the client executive for this premium client.' : ''}`;
  const emailValid = value => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
  const canDraft = emailValid(form.kyco_email) && form.requested_documents.trim() && (!form.rm_email || emailValid(form.rm_email)) && (!form.premium_client || !form.executive_email || emailValid(form.executive_email));
  const cc = [form.rm_email, form.premium_client ? form.executive_email : ''].filter(Boolean).join(',');
  return <section className="glass-panel" style={{ padding: '1.5rem' }}>
    <h3>KYCO, PAM & Document Requests</h3>
    <p style={{ color: 'var(--text-secondary)' }}>Demo owners: Nina Shah (KYCO) and Oliver Reed (PAM). Their example.com addresses are fictional; replace them with real contacts before emailing.</p>
    {(!caseData.kyco_contacts?.kyco_email || !caseData.kyco_contacts?.pam_email) && <p role="status" style={{ color: 'var(--color-warning)' }}>Assignment required: this record must have both a KYCO and a PAM owner.</p>}
    <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0' }}>Manage the KYCO recipient, the RM who contacts the client, and the executive supporting premium clients.</p>
    <form onSubmit={save}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        { [['kyco_email', 'Assigned KYCO email (required)'], ['pam_email', 'Assigned PAM email — Periodic Account Management (required)'], ['rm_email', 'Relationship Manager email (CC)'], ...(form.premium_client ? [['executive_email', 'Client Executive email (CC)']] : [])].map(([key, label]) => <label key={key} className="form-label">{label}<input type="email" required={key === 'kyco_email' || key === 'pam_email'} className="form-control" value={form[key]} onChange={e => update(key, e.target.value)} /></label>) }
      </div>
      <label style={{ display: 'block', margin: '1rem 0' }}><input type="checkbox" checked={form.premium_client} onChange={e => update('premium_client', e.target.checked)} /> Premium client</label>
      <p>Jurisdiction: {caseData.country_of_operation}. Prefilled baseline checklist, not an approved country-specific policy. Review and adjust before sending. Document types marked valid and not expired are omitted where matched.</p>
      <label className="form-label" style={{ marginTop: '1rem' }}>Required documents<textarea className="form-control" rows={6} value={form.requested_documents} onChange={e => update('requested_documents', e.target.value)} placeholder="Enter one required document per line" /></label>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save contacts & draft'}</button>
    </form>
    <h4 style={{ marginTop: '1.5rem' }}>Email preview</h4>
    <strong>{subject}</strong>
    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '1rem 0' }}>{body}</pre>
    {canDraft ? <a className="btn btn-secondary" href={`mailto:${encodeURIComponent(form.kyco_email)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Open draft in email app</a> : <p>Enter a valid KYCO email and the required documents to open an email draft.</p>}
    <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>Opening a draft does not send it. Review recipients and send from your email app. Automated sending is not configured.</p>
    <p role="status">{message}</p>
  </section>;
}
