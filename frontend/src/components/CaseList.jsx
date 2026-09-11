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
  RefreshCw,
  Layers,
  Users,
  Shield,
  Archive,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';

export default function CaseList({
  cases = [],
  stats = {},
  selectedQueue: propSelectedQueue,
  onSelectQueue,
  highlightedCaseId,
  onSelectCase,
  onNewCase,
  onResetPresets,
  isLoading
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalQueue, setInternalQueue] = useState('ALL');
  const selectedQueue = propSelectedQueue !== undefined ? propSelectedQueue : internalQueue;
  const setSelectedQueue = onSelectQueue || setInternalQueue;
  const [filterSize, setFilterSize] = useState('ALL');
  const [showFlowGuide, setShowFlowGuide] = useState(false);
  const [isTriggeringAutoPR, setIsTriggeringAutoPR] = useState(false);
  const [autoPRFeedback, setAutoPRFeedback] = useState('');

  const handleRunAutoPR = async (force = true) => {
    setIsTriggeringAutoPR(true);
    try {
      const res = await fetch(`/api/periodic-review/auto-trigger?force_all=${force}`, { method: 'POST' });
      if (!res.ok) throw new Error('Auto PR/CR trigger failed');
      const data = await res.json();
      setAutoPRFeedback(`Surveillance complete: ${data.triggered_count} case(s) refreshed into Maker Queue based on 1/2-3/5-yr risk cadence!`);
      setTimeout(() => setAutoPRFeedback(''), 5000);
      if (data.triggered_count > 0) {
        setTimeout(() => setSelectedQueue('MAKER_QUEUE'), 1200);
      }
    } catch (err) {
      alert(`PR/CR Trigger Error: ${err.message}`);
    } finally {
      setIsTriggeringAutoPR(false);
    }
  };

  const nowStr = new Date().toISOString().split('T')[0];

  const getBusinessSizeBadge = (size) => {
    if (!size) return null;
    switch (size) {
      case 'MICRO_SMB':
        return { label: 'Micro SMB', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
      case 'SMALL':
        return { label: 'Small Business', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
      case 'MEDIUM':
        return { label: 'Medium Corp', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
      case 'LARGE':
        return { label: 'Large Enterprise', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
      case 'XL_ENTERPRISE':
        return { label: 'XL Conglomerate', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
      default:
        return { label: size, bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' };
    }
  };

  const getQueueInfo = (queueKey) => {
    switch (queueKey) {
      case 'MAKER_QUEUE':
        return { label: 'Maker Queue', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Layers };
      case 'L1_CHECKER_QUEUE':
        return { label: 'L1 Checker (4-Eyes)', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Clock };
      case 'L2_CHECKER_QUEUE':
        return { label: 'L2 Senior (6-Eyes)', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Users };
      case 'MLRO_QUEUE':
        return { label: 'MLRO Escalation', badgeBg: 'rgba(239, 68, 68, 0.08)', color: '#f87171', icon: ShieldAlert };
      case 'PERIODIC_MONITORING_QUEUE':
        return { label: 'Periodic Monitoring', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Calendar };
      case 'COMPLETED_ARCHIVE':
        return { label: 'Completed Archive', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Archive };
      default:
        return { label: 'Active Queue', badgeBg: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8', icon: Layers };
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

    if (selectedQueue === 'ALL') return true;

    // Queue matching
    if (c.current_queue === selectedQueue) return true;

    // Fallback matching for cases where current_queue might align by status
    if (selectedQueue === 'MAKER_QUEUE') {
      return c.status === 'DRAFT' || c.status === 'MAKER_IN_PROGRESS' || c.status === 'RETURNED_TO_MAKER' || c.status === 'ISSUES_IDENTIFIED';
    }
    if (selectedQueue === 'L1_CHECKER_QUEUE') {
      return c.status === 'PENDING_CHECKER' || c.status === 'PENDING_L1_CHECKER' || c.status === 'RETURNED_TO_L1';
    }
    if (selectedQueue === 'L2_CHECKER_QUEUE') {
      return c.status === 'PENDING_L2_CHECKER';
    }
    if (selectedQueue === 'MLRO_QUEUE') {
      return c.status === 'ESCALATED_MLRO';
    }
    if (selectedQueue === 'PERIODIC_MONITORING_QUEUE') {
      return c.next_review_date && c.next_review_date <= nowStr;
    }
    if (selectedQueue === 'COMPLETED_ARCHIVE') {
      return c.status === 'APPROVED_SDD' || c.status === 'APPROVED_EDD' || c.status === 'CLOSED' || c.status === 'REJECTED';
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Lifecycle Flow Explainer Card (Collapsible) */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowFlowGuide(!showFlowGuide)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                Operational Compliance Queues & Record Movement Flow
                <span className="tag" style={{ fontSize: '0.65rem' }}>4-Eyes & 6-Eyes Governance</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Visual mapping of how KYC records transition between Maker, L1 Checker, L2 Senior Checker, MLRO, and Periodic Review.
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
            {showFlowGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showFlowGuide && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
            {/* Step 1: Maker Queue */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700' }}>1</span>
                Maker Queue
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                AI Maker extracts documents, calculates risk rating, investigates alerts, and validates 6-point quality self-check. Submits to L1.
              </div>
            </div>

            {/* Step 2: L1 Checker */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700' }}>2</span>
                L1 Checker (4-Eyes)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Independent 1st-line review. Approves low/medium risk (SDD) → Archive, returns RFI to Maker, or escalates high risk to L2.
              </div>
            </div>

            {/* Step 3: L2 Senior Checker */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700' }}>3</span>
                L2 Senior (6-Eyes)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Senior compliance sign-off for complex corporate structures, PEPs, & high wire volumes. Approves EDD or remands to L1.
              </div>
            </div>

            {/* Step 4: MLRO Queue */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700' }}>4</span>
                MLRO Escalations
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Direct oversight on sanctions hits, severe adverse media, and regulatory disclosures. Authorizes EDD or prohibits relationship.
              </div>
            </div>

            {/* Step 5: Periodic Monitoring */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700' }}>5</span>
                Periodic Monitoring
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Continuous transaction surveillance. Upon scheduled review cadence (1/2-3/5-yr risk matrix), triggers re-KYC into Maker Queue.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Queue Switcher Navigation Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {/* All Cases */}
        <div
          onClick={() => setSelectedQueue('ALL')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'ALL' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>ALL CASES</span>
            <Layers size={16} color={selectedQueue === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {cases.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Complete Portfolio</div>
        </div>

        {/* Maker Queue */}
        <div
          onClick={() => setSelectedQueue('MAKER_QUEUE')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'MAKER_QUEUE' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'MAKER_QUEUE' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'MAKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>MAKER QUEUE</span>
            <Sparkles size={16} color={selectedQueue === 'MAKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {stats.maker_queue_count ?? 1}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>In-Flight / Drafting</div>
        </div>

        {/* L1 Checker Queue */}
        <div
          onClick={() => setSelectedQueue('L1_CHECKER_QUEUE')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'L1_CHECKER_QUEUE' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'L1_CHECKER_QUEUE' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'L1_CHECKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>L1 CHECKER</span>
            <Clock size={16} color={selectedQueue === 'L1_CHECKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {stats.l1_checker_queue_count ?? 2}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>4-Eyes Verification</div>
        </div>

        {/* L2 Senior Checker Queue */}
        <div
          onClick={() => setSelectedQueue('L2_CHECKER_QUEUE')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'L2_CHECKER_QUEUE' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'L2_CHECKER_QUEUE' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'L2_CHECKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>L2 SENIOR</span>
            <Users size={16} color={selectedQueue === 'L2_CHECKER_QUEUE' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {stats.l2_checker_queue_count ?? 2}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>6-Eyes EDD Sign-Off</div>
        </div>

        {/* MLRO Queue */}
        <div
          onClick={() => setSelectedQueue('MLRO_QUEUE')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'MLRO_QUEUE' ? '1px solid var(--color-danger)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'MLRO_QUEUE' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'MLRO_QUEUE' ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: '600' }}>MLRO QUEUE</span>
            <ShieldAlert size={16} color={selectedQueue === 'MLRO_QUEUE' ? 'var(--color-danger)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: selectedQueue === 'MLRO_QUEUE' ? 'var(--color-danger)' : '#f8fafc' }}>
            {stats.mlro_queue_count ?? 3}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Escalations & Sanctions</div>
        </div>

        {/* Completed Archive */}
        <div
          onClick={() => setSelectedQueue('COMPLETED_ARCHIVE')}
          className="glass-panel"
          style={{
            padding: '1rem',
            cursor: 'pointer',
            border: selectedQueue === 'COMPLETED_ARCHIVE' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: selectedQueue === 'COMPLETED_ARCHIVE' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: selectedQueue === 'COMPLETED_ARCHIVE' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>ARCHIVE</span>
            <ShieldCheck size={16} color={selectedQueue === 'COMPLETED_ARCHIVE' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {stats.completed_archive_count ?? 1}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Approved / Closed</div>
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
          {/* Business Scale Pills */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Scales' },
              { id: 'MICRO_SMB', label: 'SMBs' },
              { id: 'SMALL', label: 'Small' },
              { id: 'MEDIUM', label: 'Medium' },
              { id: 'LARGE', label: 'Large' },
              { id: 'XL_ENTERPRISE', label: 'XL Enterprise' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterSize(s.id)}
                className="btn btn-sm"
                style={{
                  background: filterSize === s.id ? 'var(--bg-tertiary)' : 'transparent',
                  border: 'none',
                  color: filterSize === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: filterSize === s.id ? '600' : '500',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={onResetPresets} className="btn btn-secondary" title="Reset to standard demonstration cases">
            <RotateCcw size={15} /> Reset Demos
          </button>

          <button onClick={onNewCase} className="btn btn-primary">
            <UserPlus size={15} /> New Onboarding Case
          </button>
        </div>
      </div>

      {/* Automated PR/CR Cadence Policy Banner */}
      {selectedQueue === 'PERIODIC_MONITORING_QUEUE' && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.12))',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(14, 165, 233, 0.2)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#38bdf8' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  Automated Risk-Based PR/CR Continuous Surveillance Matrix
                  <span className="tag" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', borderColor: '#38bdf8' }}>
                    Policy Active
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Continuous surveillance engine evaluates customer risk ratings and automatically triggers periodic re-KYC refresh cycles.
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRunAutoPR(true)}
              disabled={isTriggeringAutoPR}
              className="btn btn-primary btn-sm"
              style={{ background: '#0ea5e9', borderColor: '#0284c7', fontWeight: '700' }}
            >
              <RefreshCw size={14} className={isTriggeringAutoPR ? 'animate-spin' : ''} />
              {isTriggeringAutoPR ? 'Scanning & Refreshing...' : '⚡ Trigger Auto PR/CR Surveillance'}
            </button>
          </div>

          {autoPRFeedback && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '0.8rem', fontWeight: '600' }}>
              ✓ {autoPRFeedback}
            </div>
          )}

          {/* Matrix Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '800', textTransform: 'uppercase' }}>High Risks (High-High, High-Med, High-Low)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f87171', marginTop: '0.2rem' }}>1 Year (12 Months)</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Mandatory annual Enhanced Due Diligence (EDD) refresh</div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase' }}>Medium Risk (Medium-High / Low)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem' }}>2 to 3 Years (24–36 mo)</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Standard SDD with active monitoring</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800', textTransform: 'uppercase' }}>Low Risk (Standard Retail)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399', marginTop: '0.2rem' }}>5 Years (60 Months)</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Simplified Due Diligence maintenance cycle</div>
            </div>
          </div>
        </div>
      )}

      {/* Cases List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredCases.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No matching KYC cases found in this queue.</p>
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
            if (c.status === 'RFI_REQUESTED' || c.status === 'RETURNED_TO_MAKER') statusClass = 'badge-rfi';
            if (c.status === 'ESCALATED_MLRO') statusClass = 'badge-critical';

            const sanctionsHits = (c.screening_matches || []).filter((m) => m.type === 'SANCTIONS');
            const pepHits = (c.screening_matches || []).filter((m) => m.type === 'PEP');
            const isPeriodic = c.current_review_type === 'PERIODIC_REVIEW' || c.trigger_type === 'PERIODIC_RE_KYC';
            const sizeBadge = getBusinessSizeBadge(c.business_size);
            const queueInfo = getQueueInfo(c.current_queue);
            const isHighlighted = highlightedCaseId === c.id;

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
                  border: isHighlighted ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: isHighlighted ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-card)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left Identity Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {c.entity_type === 'CORPORATE' ? <Building size={20} /> : <User size={20} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{c.primary_name}</span>
                      <span className="tag">{c.case_number}</span>
                      {sizeBadge && (
                        <span className="tag" style={{ background: sizeBadge.bg, borderColor: sizeBadge.border, color: sizeBadge.color }}>
                          {sizeBadge.label}
                        </span>
                      )}
                      {/* Queue Location Pill */}
                      <span className="tag" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        Queue: {queueInfo.label}
                      </span>
                      {isHighlighted && (
                        <span className="tag" style={{ background: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.35)', color: '#60a5fa', fontWeight: '600', fontSize: '0.72rem' }}>
                          Active Selection
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span>Jurisdiction: <strong>{c.country_of_operation}</strong></span>
                      <span>Docs: <strong>{c.documents?.length || 0}</strong></span>
                      {isPeriodic && (
                        <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Periodic Re-KYC</span>
                      )}
                      {c.next_review_date && (
                        <span>Next Review: <strong>{c.next_review_date}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screening Badges & Status */}
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
                    {c.status.replace(/_/g, ' ')}
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
