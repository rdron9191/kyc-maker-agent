import React, { useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Building,
  User,
  RotateCcw,
  Calendar,
  RefreshCw
} from 'lucide-react';

export default function CaseList({
  cases = [],
  stats = {},
  onSelectCase,
  onNewCase,
  onResetPresets,
  isLoading
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');

  const nowStr = new Date().toISOString().split('T')[0];

  const getBusinessSizeBadge = (size) => {
    if (!size) return null;
    switch (size) {
      case 'MICRO_SMB':
        return { label: 'Micro SMB', bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.35)', color: '#2dd4bf' };
      case 'SMALL':
        return { label: 'Small Business', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#60a5fa' };
      case 'MEDIUM':
        return { label: 'Medium Corp', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', color: '#818cf8' };
      case 'LARGE':
        return { label: 'Large Enterprise', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' };
      case 'XL_ENTERPRISE':
        return { label: 'XL Conglomerate', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', color: '#c084fc' };
      default:
        return { label: size, bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.35)', color: '#94a3b8' };
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.primary_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country_of_operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.business_size && c.business_size.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterSize !== 'ALL' && c.business_size !== filterSize) return false;

    if (filterTier === 'ALL') return true;
    if (filterTier === 'PENDING') return c.status === 'PENDING_REVIEW';
    if (filterTier === 'HIGH_RISK') {
      return c.risk_assessment?.risk_tier === 'HIGH' || c.risk_assessment?.risk_tier === 'CRITICAL';
    }
    if (filterTier === 'APPROVED') {
      return c.status === 'APPROVED_SDD' || c.status === 'APPROVED_EDD';
    }
    if (filterTier === 'RFI') return c.status === 'RFI_REQUESTED';
    if (filterTier === 'REVIEW_DUE') {
      return c.next_review_date && c.next_review_date <= nowStr;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Metrics Ribbon */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-secondary)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="metric-value">{stats.pending_review || 0}</div>
            <div className="metric-label">Pending Checker Review</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="metric-value">{stats.high_or_critical_risk || 0}</div>
            <div className="metric-label">High / Critical Risk</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="metric-value">{stats.approved || 0}</div>
            <div className="metric-label">Approved (SDD/EDD)</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--color-info)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="metric-value">{stats.periodic_reviews_due || 0}</div>
            <div className="metric-label">Periodic Reviews Due</div>
          </div>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search case name, ID number, jurisdiction..."
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setFilterTier('ALL'); setFilterSize('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterTier === 'ALL' && filterSize === 'ALL' ? 'var(--bg-tertiary)' : 'transparent', border: 'none' }}
            >
              All ({cases.length})
            </button>
            <button
              onClick={() => { setFilterSize('MICRO_SMB'); setFilterTier('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterSize === 'MICRO_SMB' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: '#2dd4bf' }}
            >
              SMBs
            </button>
            <button
              onClick={() => { setFilterSize('SMALL'); setFilterTier('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterSize === 'SMALL' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: '#60a5fa' }}
            >
              Small
            </button>
            <button
              onClick={() => { setFilterSize('MEDIUM'); setFilterTier('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterSize === 'MEDIUM' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: '#818cf8' }}
            >
              Medium
            </button>
            <button
              onClick={() => { setFilterSize('LARGE'); setFilterTier('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterSize === 'LARGE' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: '#fbbf24' }}
            >
              Large
            </button>
            <button
              onClick={() => { setFilterSize('XL_ENTERPRISE'); setFilterTier('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterSize === 'XL_ENTERPRISE' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: '#c084fc' }}
            >
              XL Enterprise
            </button>
            <button
              onClick={() => { setFilterTier('HIGH_RISK'); setFilterSize('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterTier === 'HIGH_RISK' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: 'var(--color-danger)' }}
            >
              High Risk
            </button>
            <button
              onClick={() => { setFilterTier('APPROVED'); setFilterSize('ALL'); }}
              className="btn btn-sm btn-secondary"
              style={{ background: filterTier === 'APPROVED' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', color: 'var(--color-success)' }}
            >
              Approved
            </button>
          </div>

          <button onClick={onResetPresets} className="btn btn-secondary" title="Reset to standard demonstration cases">
            <RotateCcw size={16} /> Reset Demos
          </button>

          <button onClick={onNewCase} className="btn btn-primary">
            <UserPlus size={16} /> New Onboarding Case
          </button>
        </div>
      </div>

      {/* Cases Grid / Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredCases.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No matching KYC onboarding cases found.</p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const risk = c.risk_assessment;
            const score = risk ? Math.round(risk.overall_score) : 0;
            const tier = risk?.risk_tier || 'LOW';

            let tierClass = 'badge-low';
            if (tier === 'MEDIUM') tierClass = 'badge-medium';
            if (tier === 'HIGH') tierClass = 'badge-high';
            if (tier === 'CRITICAL') tierClass = 'badge-critical';

            let statusClass = 'badge-pending';
            if (c.status.startsWith('APPROVED')) statusClass = 'badge-approved';
            if (c.status === 'REJECTED') statusClass = 'badge-rejected';
            if (c.status === 'RFI_REQUESTED') statusClass = 'badge-rfi';

            const sanctionsHits = (c.screening_matches || []).filter((m) => m.type === 'SANCTIONS');
            const pepHits = (c.screening_matches || []).filter((m) => m.type === 'PEP');
            const isPeriodic = c.current_review_type === 'PERIODIC_REVIEW';
            const sizeBadge = getBusinessSizeBadge(c.business_size);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className="glass-panel"
                style={{
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Left Identity Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      background: c.entity_type === 'CORPORATE' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: c.entity_type === 'CORPORATE' ? 'var(--color-info)' : 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {c.entity_type === 'CORPORATE' ? <Building size={22} /> : <User size={22} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: '700' }}>{c.primary_name}</span>
                      <span className="tag">{c.case_number}</span>
                      {sizeBadge && (
                        <span className="tag" style={{ background: sizeBadge.bg, borderColor: sizeBadge.border, color: sizeBadge.color }}>
                          {sizeBadge.label}
                        </span>
                      )}
                      {isPeriodic && (
                        <span className="tag" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', borderColor: 'rgba(14, 165, 233, 0.3)' }}>
                          Periodic Refresh
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span>Jurisdiction: <strong>{c.country_of_operation}</strong></span>
                      <span>Docs: <strong>{c.documents?.length || 0}</strong></span>
                      {c.next_review_date && (
                        <span>Next Review: <strong>{c.next_review_date}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screening Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {sanctionsHits.length > 0 && (
                    <span className="badge badge-critical">
                      <ShieldAlert size={12} /> SANCTIONS HIT
                    </span>
                  )}
                  {pepHits.length > 0 && (
                    <span className="badge badge-medium">
                      <User size={12} /> PEP MATCH
                    </span>
                  )}
                  <span className={`badge ${statusClass}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Risk Gauge Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      CRR Score
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                        {score}
                      </span>
                      <span className={`badge ${tierClass}`} style={{ fontSize: '0.7rem' }}>
                        {tier}
                      </span>
                    </div>
                  </div>

                  <button className="btn btn-secondary btn-sm" style={{ padding: '0.5rem 0.85rem' }}>
                    Review <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
