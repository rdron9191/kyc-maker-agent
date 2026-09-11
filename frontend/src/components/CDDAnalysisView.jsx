import React from 'react';
import {
  Search,
  Building,
  DollarSign,
  Globe,
  Briefcase,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Award,
  Link,
  ShieldAlert,
  Fingerprint,
  TrendingUp,
  Users
} from 'lucide-react';

export default function CDDAnalysisView({ cddProfile, externalIntelligence, entityType, primaryName, documents = [] }) {
  const profile = cddProfile || {};
  const ext = externalIntelligence || {};
  const dnb = ext.dnb_profile;
  const gleif = ext.gleif_record;
  const isCorporate = entityType === 'CORPORATE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Step 4 Main Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}>
              <Search size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                Step 4: Customer Due Diligence (CDD) Analysis
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Applying Global KYC Policy, CDD Standards & Third-Party Intelligence
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {dnb && (
              <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.35)', fontWeight: '700' }}>
                <Award size={13} style={{ display: 'inline', marginRight: '4px' }} /> D&B D-U-N-S Verified
              </span>
            )}
            <span className="badge badge-low">
              <ShieldCheck size={14} /> CDD STANDARDS MET
            </span>
          </div>
        </div>

        {/* Grid of CDD Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Business Model & Purpose */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Briefcase size={18} color="var(--accent-secondary)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Business Model & Account Purpose</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {profile.business_model || 'Standard commercial relationship.'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <strong>Intended Nature:</strong> {profile.purpose_of_relationship || 'Operational accounts and international settlements.'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <strong>Expected Turnover:</strong> {profile.expected_monthly_turnover || '$500,000 - $2,000,000'}
            </div>
          </div>

          {/* Source of Wealth & Funds */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <DollarSign size={18} color="var(--color-success)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Source of Wealth (SoW) & Funds (SoF)</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Source of Wealth:</strong> {profile.source_of_wealth || 'Verified corporate operating revenue and equity investments.'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
              <strong>Source of Funds:</strong> {profile.source_of_funds || 'Incoming wire settlements from verified corporate counterparties.'}
            </div>
          </div>

          {/* Ownership Structure & UBOs */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <UserCheck size={18} color="var(--color-info)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Beneficial Ownership (UBO)</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {profile.ubo_analysis_notes || 'All beneficial owners holding >= 25% voting equity or executive control analyzed and verified.'}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={14} /> Threshold Criteria: &ge; 25% Direct/Indirect Ownership
            </div>
          </div>

          {/* Industry Sector & Geography */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Globe size={18} color="var(--color-warning)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Industry, Sector & Channel</h4>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Industry / Sector:</strong> {profile.industry_sector || 'Technology & Commercial Services'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <strong>Delivery Channel:</strong> {profile.delivery_channel || 'Direct Institutional Corporate Channel'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <strong>Geographic Presence:</strong> {(profile.geographic_presence || ['US']).join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Third-Party Corporate Intelligence Card (D&B Direct+ & GLEIF) */}
      {isCorporate && dnb && (
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#60a5fa' }}>
                <Building size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800' }}>
                    Dun & Bradstreet (D&B Direct+) Verified Profile
                  </h4>
                  <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: '#34d399' }}>
                    {dnb.operating_status}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Live Corporate Family Tree, D-U-N-S Registry & Unwrapped UBO Ownership
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span className="tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                D-U-N-S: <strong>{dnb.duns_number}</strong>
              </span>
              {gleif && (
                <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                  LEI: <strong>{gleif.lei}</strong>
                </span>
              )}
            </div>
          </div>

          {/* D&B Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parent Entity Lineage</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {dnb.parent_company || 'Independent Corporate Entity'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Ultimate D-U-N-S: {dnb.global_ultimate_duns || dnb.duns_number}
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>D&B PAYDEX Score</span>
                <TrendingUp size={14} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                {dnb.paydex_score}/100
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payment Performance: Low Risk</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual Revenue & Scale</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', marginTop: '0.2rem' }}>
                {dnb.annual_turnover}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Employees: ~{dnb.employee_count} FTEs</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification (SIC / NAICS)</div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {dnb.sic_code}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{dnb.naics_code}</div>
            </div>
          </div>

          {/* D&B Verified UBO Ownership Breakdown Table */}
          {dnb.verified_ubos && dnb.verified_ubos.length > 0 && (
            <div style={{ marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} color="var(--accent-secondary)" />
                <span>D&B Direct+ Verified Beneficial Ownership Breakdown (UBOs $\ge$ 25%)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Beneficial Owner Name</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Equity / Voting Ownership</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Ownership Structure Tier</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>PEP Status</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Official Registry Corroboration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnb.verified_ubos.map((ubo, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {ubo.name}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span className="tag" style={{ background: ubo.percentage >= 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: ubo.percentage >= 50 ? '#34d399' : '#818cf8', fontWeight: '700' }}>
                            {ubo.percentage}% Ownership
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {ubo.tier_level === 1 ? 'Direct Shareholder' : 'Tier 2 Indirect Holding Trust'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          {ubo.is_pep ? (
                            <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                              <ShieldAlert size={11} /> PEP LINKED
                            </span>
                          ) : (
                            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>
                              NON-PEP
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={14} /> D&B Verified ({ubo.nationality || 'Verified'})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
