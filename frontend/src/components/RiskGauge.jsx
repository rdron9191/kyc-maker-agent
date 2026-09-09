import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon, TrendingUp } from 'lucide-react';

export default function RiskGauge({ riskAssessment }) {
  if (!riskAssessment) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No risk calculation generated yet.
      </div>
    );
  }

  const score = riskAssessment.overall_score;
  const tier = riskAssessment.risk_tier;

  // Determine color and icon by tier
  let tierColor = 'var(--color-success)';
  let tierBg = 'var(--color-success-bg)';
  let TierIcon = ShieldCheck;
  let badgeClass = 'badge-low';

  if (tier === 'MEDIUM') {
    tierColor = 'var(--color-warning)';
    tierBg = 'var(--color-warning-bg)';
    TierIcon = AlertTriangle;
    badgeClass = 'badge-medium';
  } else if (tier === 'HIGH') {
    tierColor = 'var(--color-danger)';
    tierBg = 'var(--color-danger-bg)';
    TierIcon = ShieldAlert;
    badgeClass = 'badge-high';
  } else if (tier === 'CRITICAL') {
    tierColor = 'var(--color-critical)';
    tierBg = 'var(--color-critical-bg)';
    TierIcon = AlertOctagon;
    badgeClass = 'badge-critical';
  }

  // Calculate SVG gauge stroke
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Customer Risk Rating (CRR)</h3>
        </div>
        <span className={`badge ${badgeClass}`}>
          <TierIcon size={12} />
          {tier} RISK
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
        {/* SVG Circular Gauge */}
        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Value circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={tierColor}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', lineHeight: '1', color: tierColor, fontFamily: 'var(--font-mono)' }}>
              {Math.round(score)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>
              Out of 100
            </div>
          </div>
        </div>

        {/* Due Diligence Guideline */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Compliance Recommendation
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {riskAssessment.recommended_due_diligence}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {riskAssessment.summary}
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
          Risk Factor Weights & Drivers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {riskAssessment.factors.map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{f.factor_name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '600', color: f.score > 50 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                  {f.score}/100 <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({Math.round(f.weight * 100)}% weight)</span>
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.35rem' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, f.score)}%`,
                    background: f.score > 70 ? 'var(--color-danger)' : f.score > 30 ? 'var(--color-warning)' : 'var(--color-success)',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.reasoning}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
