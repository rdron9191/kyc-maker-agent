import React, { useState } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Newspaper,
  Globe,
  AlertOctagon,
  CheckCircle2,
  Database,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';

export default function ScreeningHits({ screeningMatches = [] }) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const sanctions = screeningMatches.filter(m => m.type === 'SANCTIONS');
  const peps = screeningMatches.filter(m => m.type === 'PEP');
  const media = screeningMatches.filter(m => m.type === 'ADVERSE_MEDIA');
  const geo = screeningMatches.filter(m => m.type === 'JURISDICTION');

  const filteredMatches = activeFilter === 'ALL'
    ? screeningMatches
    : screeningMatches.filter(m => m.type === activeFilter);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Provider Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.45rem', borderRadius: 'var(--radius-md)', color: '#f87171' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>
              LexisNexis Bridger Insight & Watchlist Screening
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live OFAC SDN, EU, UN, PEP Directories & Adverse Media Surveillance
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveFilter('ALL')}
            className="btn btn-sm btn-secondary"
            style={{
              background: activeFilter === 'ALL' ? 'var(--accent-primary)' : 'transparent',
              borderColor: activeFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: 'white',
            }}
          >
            All ({screeningMatches.length})
          </button>
          <button
            onClick={() => setActiveFilter('SANCTIONS')}
            className="btn btn-sm btn-secondary"
            style={{
              background: activeFilter === 'SANCTIONS' ? 'var(--color-critical)' : 'transparent',
              borderColor: activeFilter === 'SANCTIONS' ? 'var(--color-critical)' : 'var(--border-subtle)',
              color: 'white',
            }}
          >
            Sanctions ({sanctions.length})
          </button>
          <button
            onClick={() => setActiveFilter('PEP')}
            className="btn btn-sm btn-secondary"
            style={{
              background: activeFilter === 'PEP' ? 'var(--color-warning)' : 'transparent',
              borderColor: activeFilter === 'PEP' ? 'var(--color-warning)' : 'var(--border-subtle)',
              color: 'white',
            }}
          >
            PEP ({peps.length})
          </button>
          <button
            onClick={() => setActiveFilter('ADVERSE_MEDIA')}
            className="btn btn-sm btn-secondary"
            style={{
              background: activeFilter === 'ADVERSE_MEDIA' ? 'var(--color-info)' : 'transparent',
              borderColor: activeFilter === 'ADVERSE_MEDIA' ? 'var(--color-info)' : 'var(--border-subtle)',
              color: 'white',
            }}
          >
            Media ({media.length})
          </button>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={24} color="var(--color-success)" />
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Zero screening hits detected</strong> for this category across LexisNexis WorldCompliance registries and global feeds.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredMatches.map((m, idx) => {
            let badgeClass = 'badge-pending';
            let Icon = ShieldAlert;
            let borderColor = 'var(--border-subtle)';

            if (m.type === 'SANCTIONS') {
              badgeClass = 'badge-critical';
              Icon = AlertOctagon;
              borderColor = 'rgba(225, 29, 72, 0.35)';
            } else if (m.type === 'PEP') {
              badgeClass = 'badge-medium';
              Icon = UserCheck;
              borderColor = 'rgba(245, 158, 11, 0.35)';
            } else if (m.type === 'ADVERSE_MEDIA') {
              badgeClass = 'badge-high';
              Icon = Newspaper;
              borderColor = 'rgba(14, 165, 233, 0.35)';
            } else if (m.type === 'JURISDICTION') {
              badgeClass = 'badge-medium';
              Icon = Globe;
              borderColor = 'rgba(168, 85, 247, 0.35)';
            }

            return (
              <div
                key={m.id || idx}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Icon size={18} color="var(--accent-secondary)" />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{m.matched_entity}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({m.list_name})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.7rem' }}>
                      {m.source_provider || 'LexisNexis Bridger Insight'}
                    </span>
                    <span className={`badge ${badgeClass}`}>{m.type}</span>
                    <span className="tag" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      Match: {m.match_score}%
                    </span>
                  </div>
                </div>

                {m.adverse_media_headline && (
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#38bdf8' }}>
                    "{m.adverse_media_headline}"
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {m.risk_summary}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {m.program_or_category && (
                    <span><strong>Category / Regime:</strong> {m.program_or_category}</span>
                  )}
                  {m.adverse_media_source && (
                    <span><strong>Source:</strong> {m.adverse_media_source} ({m.adverse_media_date || 'Recent'})</span>
                  )}
                  {m.provider_hit_id && (
                    <span className="tag" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                      ID: {m.provider_hit_id}
                    </span>
                  )}
                </div>

                {m.analyst_note && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', background: 'rgba(99, 102, 241, 0.08)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>Maker Insight:</strong> {m.analyst_note}
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
