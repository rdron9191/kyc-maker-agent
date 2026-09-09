import React from 'react';
import {
  Bell,
  UserCheck,
  FolderOpen,
  Search,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  Eye,
  CheckCircle2,
  Shield,
  RotateCcw,
  Activity
} from 'lucide-react';

export const WORKFLOW_STEPS = [
  { id: 'STAGE_1_TRIGGER', step: '1', title: 'Trigger', icon: Bell, performer: 'Client / System' },
  { id: 'STAGE_2_ASSIGNMENT', step: '2', title: 'Assignment', icon: UserCheck, performer: 'Maker Queue' },
  { id: 'STAGE_3_COLLECTION', step: '3', title: 'Collection', icon: FolderOpen, performer: 'Maker (You)' },
  { id: 'STAGE_4_CDD', step: '4', title: 'CDD Analysis', icon: Search, performer: 'Maker (You)' },
  { id: 'STAGE_5_SCREENING_RISK', step: '5A/5B', title: 'Screening & Risk', icon: ShieldAlert, performer: 'Maker (You)' },
  { id: 'STAGE_6_ALERT_INVESTIGATION', step: '6', title: 'Alerts / Red Flags', icon: AlertTriangle, performer: 'Maker (You)' },
  { id: 'STAGE_7_MAKER_COMPLETION', step: '7A/7B', title: 'Complete Record', icon: FileCheck2, performer: 'Maker (You)' },
  { id: 'STAGE_8_CHECKER_REVIEW', step: '8/9', title: 'Checker Review', icon: Eye, performer: 'KYC Checker' },
  { id: 'STAGE_10_CASE_CLOSURE', step: '10', title: 'System Update', icon: CheckCircle2, performer: 'System / Archive' },
  { id: 'STAGE_11_ESCALATION', step: '11', title: 'MLRO Escalation', icon: Shield, performer: 'MLRO / Lead' },
  { id: 'STAGE_12_ONGOING_MONITORING', step: '12', title: 'Ongoing Monitoring', icon: Activity, performer: 'Automated' },
];

export default function WorkflowStepper({ currentStage, onSelectStage }) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStage);
  const activeIdx = currentIndex !== -1 ? currentIndex : 5;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-secondary)', letterSpacing: '0.05em' }}>
            KYC Process Flow
          </span>
          <span className="tag" style={{ fontSize: '0.7rem' }}>
            From Case Assignment to Checker Submission & Ongoing Monitoring
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} /> Performed by Maker (You)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} /> Independent Checker / System
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '980px' }}>
        {WORKFLOW_STEPS.map((step, idx) => {
          const isPassed = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const isMakerStep = ['STAGE_2_ASSIGNMENT', 'STAGE_3_COLLECTION', 'STAGE_4_CDD', 'STAGE_5_SCREENING_RISK', 'STAGE_6_ALERT_INVESTIGATION', 'STAGE_7_MAKER_COMPLETION'].includes(step.id);
          const Icon = step.icon;

          let badgeColor = 'var(--bg-tertiary)';
          let borderColor = 'var(--border-subtle)';
          let textColor = 'var(--text-muted)';
          let iconColor = 'var(--text-muted)';

          if (isCurrent) {
            badgeColor = isMakerStep ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)';
            borderColor = isMakerStep ? 'var(--color-success)' : 'var(--accent-primary)';
            textColor = 'var(--text-primary)';
            iconColor = isMakerStep ? 'var(--color-success)' : 'var(--accent-secondary)';
          } else if (isPassed) {
            badgeColor = 'rgba(16, 185, 129, 0.08)';
            borderColor = 'rgba(16, 185, 129, 0.4)';
            textColor = 'var(--text-secondary)';
            iconColor = 'var(--color-success)';
          }

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => onSelectStage && onSelectStage(step.id)}
                style={{
                  flex: 1,
                  background: badgeColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: isCurrent ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: iconColor }}>
                    {step.step}
                  </span>
                  <Icon size={14} color={iconColor} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: isCurrent ? '800' : '600', color: textColor, whiteSpace: 'nowrap' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {step.performer}
                </div>
              </div>

              {idx < WORKFLOW_STEPS.length - 1 && (
                <div style={{ width: '12px', height: '2px', background: isPassed ? 'var(--color-success)' : 'var(--border-subtle)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
