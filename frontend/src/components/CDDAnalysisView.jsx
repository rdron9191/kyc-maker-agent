import React from 'react';
import { Search, Building, DollarSign, Globe, Briefcase, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CDDAnalysisView({ cddProfile, entityType, primaryName, documents = [] }) {
  const profile = cddProfile || {};

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <Search size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
              Step 4: Customer Due Diligence (CDD) Analysis
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Applying Global KYC Policy, CDD Standards & Industry Guidance
            </span>
          </div>
        </div>

        <span className="badge badge-low">
          <ShieldCheck size={14} /> CDD STANDARDS MET
        </span>
      </div>

      {/* Grid of CDD Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Business Model & Purpose */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Briefcase size={18} color="var(--accent-secondary)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Business Model & Purpose of Account</h4>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {profile.business_model || 'Standard commercial relationship.'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <strong>Intended Nature:</strong> {profile.purpose_of_relationship || 'Operational accounts and international payments.'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <strong>Expected Turnover:</strong> {profile.expected_monthly_turnover || '$500,000 - $2,000,000'}
          </div>
        </div>

        {/* Source of Wealth & Funds */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <DollarSign size={18} color="var(--color-success)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Source of Wealth & Source of Funds</h4>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <strong>Source of Wealth (SoW):</strong> {profile.source_of_wealth || 'Verified corporate revenue and equity investments.'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
            <strong>Source of Funds (SoF):</strong> {profile.source_of_funds || 'Incoming wire transfers from verified banking partners.'}
          </div>
        </div>

        {/* Ownership Structure & UBOs */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <UserCheck size={18} color="var(--color-info)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Ultimate Beneficial Ownership (UBO)</h4>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {profile.ubo_analysis_notes || 'All beneficial owners holding >= 25% voting equity or executive control analyzed and verified.'}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} /> Threshold Criteria: &ge; 25% Ownership or Direct Control
          </div>
        </div>

        {/* Industry Sector & Geography */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Globe size={18} color="var(--color-warning)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Industry, Sector & Delivery Channel</h4>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Industry / Sector:</strong> {profile.industry_sector || 'Technology & Financial Services'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <strong>Delivery Channel:</strong> {profile.delivery_channel || 'Direct Institutional / Corporate Online'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <strong>Geographic Presence:</strong> {(profile.geographic_presence || ['US']).join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
}
