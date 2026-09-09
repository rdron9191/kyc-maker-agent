import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Download,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  History,
  Bot,
  UserCheck,
  CheckCircle2,
  Trash2,
  Calendar,
  RefreshCw,
  Search,
  Shield
} from 'lucide-react';

import CitiWorkflowStepper from './CitiWorkflowStepper';
import CDDAnalysisView from './CDDAnalysisView';
import AlertInvestigationWorkbench from './AlertInvestigationWorkbench';
import MakerSelfCheckView from './MakerSelfCheckView';
import CitiCheckerHub from './CitiCheckerHub';
import RiskGauge from './RiskGauge';
import DocumentViewer from './DocumentViewer';
import VerificationMatrix from './VerificationMatrix';
import ScreeningHits from './ScreeningHits';
import MakerMemo from './MakerMemo';

export default function CaseDetail({ caseData, onBack, onCaseUpdated, onDeleteCase }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPeriodicRunning, setIsPeriodicRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!caseData) return null;

  // Re-run Maker AI Agent
  const handleRunMaker = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Analysis failed');
      const updated = await res.json();
      onCaseUpdated(updated);
    } catch (err) {
      alert(`Maker Agent Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger Periodic Review (re-KYC)
  const handleTriggerPeriodicReview = async () => {
    setIsPeriodicRunning(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/periodic-review`, { method: 'POST' });
      if (!res.ok) throw new Error('Periodic Review failed');
      const updated = await res.json();
      onCaseUpdated(updated);
      setActiveTab('OVERVIEW');
    } catch (err) {
      alert(`Periodic Review Error: ${err.message}`);
    } finally {
      setIsPeriodicRunning(false);
    }
  };

  // Submit Alert Disposition (Step 6)
  const handleDispositionSubmit = async (payload) => {
    try {
      const res = await fetch(`/api/cases/${caseData.id}/alerts/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record alert disposition');
      const updated = await res.json();
      onCaseUpdated(updated);
    } catch (err) {
      alert(`Disposition Error: ${err.message}`);
    }
  };

  // Submit Checker Decision (Step 8 & 9)
  const handleDecisionSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record decision');
      const updated = await res.json();
      onCaseUpdated(updated);
    } catch (err) {
      alert(`Decision Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit MLRO Escalation Decision (Step 11)
  const handleMLROSubmit = async ({ decision, notes, reviewer }) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('decision', decision);
      formData.append('notes', notes);
      formData.append('reviewer', reviewer);

      const res = await fetch(`/api/cases/${caseData.id}/mlro-decision`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to submit MLRO decision');
      const updated = await res.json();
      onCaseUpdated(updated);
    } catch (err) {
      alert(`MLRO Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Audit Dossier
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `CITI_KYC_DOSSIER_${caseData.case_number}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const status = caseData.status;
  let statusBadge = 'badge-pending';
  if (status === 'APPROVED_SDD' || status === 'APPROVED_EDD' || status === 'CLOSED') statusBadge = 'badge-approved';
  if (status === 'REJECTED') statusBadge = 'badge-rejected';
  if (status === 'RETURNED_TO_MAKER' || status === 'ISSUES_IDENTIFIED') statusBadge = 'badge-medium';
  if (status === 'ESCALATED_MLRO') statusBadge = 'badge-critical';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Case Queue
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleTriggerPeriodicReview}
            disabled={isPeriodicRunning}
            className="btn btn-secondary"
            style={{ background: 'rgba(14, 165, 233, 0.15)', borderColor: 'rgba(14, 165, 233, 0.4)', color: '#38bdf8' }}
          >
            <RefreshCw size={16} className={isPeriodicRunning ? 'animate-spin' : ''} />
            {isPeriodicRunning ? 'Refreshing...' : 'Trigger Periodic Re-KYC'}
          </button>

          <button
            onClick={handleRunMaker}
            disabled={isAnalyzing}
            className="btn btn-primary"
          >
            <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Maker Analyzing...' : 'Re-Run Maker Agent'}
          </button>

          <button onClick={handleExportJSON} className="btn btn-secondary">
            <Download size={16} /> Export Dossier
          </button>

          <button
            onClick={() => onDeleteCase(caseData.id)}
            className="btn btn-danger btn-sm"
            title="Delete Case"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Citi 12-Step Process Flow Stepper */}
      <CitiWorkflowStepper
        currentStage={caseData.current_stage}
        onSelectStage={(stageId) => {
          if (stageId === 'STAGE_3_COLLECTION' || stageId === 'STAGE_4_CDD') setActiveTab('CDD');
          else if (stageId === 'STAGE_5_SCREENING_RISK') setActiveTab('SCREENING');
          else if (stageId === 'STAGE_6_ALERT_INVESTIGATION') setActiveTab('ALERTS');
          else if (stageId === 'STAGE_7_MAKER_COMPLETION') setActiveTab('SELF_CHECK');
          else if (stageId === 'STAGE_8_CHECKER_REVIEW' || stageId === 'STAGE_11_ESCALATION') setActiveTab('CHECKER');
          else if (stageId === 'STAGE_12_ONGOING_MONITORING') setActiveTab('MONITORING');
          else setActiveTab('OVERVIEW');
        }}
      />

      {/* Case Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #002D72, #00A3E0)', width: '54px', height: '54px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.25rem', boxShadow: '0 0 15px rgba(0, 163, 224, 0.4)' }}>
            {caseData.primary_name ? caseData.primary_name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                {caseData.primary_name}
              </h2>
              <span className="tag" style={{ color: 'var(--text-primary)' }}>{caseData.case_number}</span>
              <span className="tag">{caseData.entity_type}</span>
              <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'var(--border-accent)', color: 'var(--accent-secondary)' }}>
                Trigger: {caseData.trigger_type}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span>Jurisdiction: <strong>{caseData.country_of_operation}</strong></span>
              <span>Priority: <strong>{caseData.priority}</strong></span>
              <span>Maker: <strong>{caseData.assigned_maker}</strong></span>
              <span>Deadline: <strong>{caseData.deadline_date || 'Standard'}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Workflow Status
            </div>
            <span className={`badge ${statusBadge}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              {status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
        >
          <Bot size={16} /> 7A. Maker Memo & Record
        </button>
        <button
          onClick={() => setActiveTab('CDD')}
          className={`tab-btn ${activeTab === 'CDD' ? 'active' : ''}`}
        >
          <Search size={16} /> 3-4. CDD & Documents ({caseData.documents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`tab-btn ${activeTab === 'ALERTS' ? 'active' : ''}`}
        >
          <AlertTriangle size={16} /> 6. Alert Investigation ({caseData.screening_matches?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('SCREENING')}
          className={`tab-btn ${activeTab === 'SCREENING' ? 'active' : ''}`}
        >
          <ShieldAlert size={16} /> 5A/5B. Screening & Risk
        </button>
        <button
          onClick={() => setActiveTab('SELF_CHECK')}
          className={`tab-btn ${activeTab === 'SELF_CHECK' ? 'active' : ''}`}
        >
          <ShieldCheck size={16} /> 7A. Maker Self-Check
        </button>
        <button
          onClick={() => setActiveTab('CHECKER')}
          className={`tab-btn ${activeTab === 'CHECKER' ? 'active' : ''}`}
        >
          <UserCheck size={16} /> 8-11. Checker & MLRO
        </button>
        <button
          onClick={() => setActiveTab('MONITORING')}
          className={`tab-btn ${activeTab === 'MONITORING' ? 'active' : ''}`}
        >
          <Calendar size={16} /> 12. Ongoing Monitoring
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <MakerMemo memo={caseData.maker_memo} />
            <CitiCheckerHub
              caseData={caseData}
              onDecisionSubmit={handleDecisionSubmit}
              onMLROSubmit={handleMLROSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <RiskGauge riskAssessment={caseData.risk_assessment} />
          </div>
        </div>
      )}

      {activeTab === 'CDD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <CDDAnalysisView
            cddProfile={caseData.cdd_profile}
            entityType={caseData.entity_type}
            primaryName={caseData.primary_name}
            documents={caseData.documents}
          />
          <DocumentViewer documents={caseData.documents} />
          <VerificationMatrix
            discrepancies={caseData.discrepancies}
            documents={caseData.documents}
          />
        </div>
      )}

      {activeTab === 'ALERTS' && (
        <AlertInvestigationWorkbench
          caseId={caseData.id}
          screeningMatches={caseData.screening_matches}
          onDispositionSubmit={handleDispositionSubmit}
        />
      )}

      {activeTab === 'SCREENING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ScreeningHits screeningMatches={caseData.screening_matches} />
          <RiskGauge riskAssessment={caseData.risk_assessment} />
        </div>
      )}

      {activeTab === 'SELF_CHECK' && (
        <MakerSelfCheckView
          selfCheck={caseData.self_check}
          onSubmitToChecker={() => setActiveTab('CHECKER')}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'CHECKER' && (
        <CitiCheckerHub
          caseData={caseData}
          onDecisionSubmit={handleDecisionSubmit}
          onMLROSubmit={handleMLROSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'MONITORING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                  Step 12: Ongoing Monitoring & Periodic Review (re-KYC)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Continuous surveillance feeds back into Step 1 upon trigger events
                </span>
              </div>
              <button
                onClick={handleTriggerPeriodicReview}
                disabled={isPeriodicRunning}
                className="btn btn-primary btn-sm"
              >
                <RefreshCw size={14} className={isPeriodicRunning ? 'animate-spin' : ''} />
                Run Re-KYC Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Scheduled Review</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-secondary)', marginTop: '0.25rem' }}>
                  {caseData.next_review_date || 'Scheduled'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Cadence: Every {caseData.review_cycle_months || 12} Months
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction Monitoring</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                  Active & Normal
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Threshold: {caseData.cdd_profile?.expected_monthly_turnover || 'Standard'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>
              Immutable Compliance Audit Trail (All 12 Stages)
            </h3>
            <div className="timeline">
              {(caseData.audit_trail || []).map((event, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {event.stage && <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-secondary)' }}>{event.stage}</span>}
                      <span className="tag" style={{ fontWeight: '700' }}>{event.action}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>{event.actor}:</strong> {event.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
