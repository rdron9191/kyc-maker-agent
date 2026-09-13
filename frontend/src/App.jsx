import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Layers, Activity, Plus } from 'lucide-react';
import CaseList from './components/CaseList';
import CaseDetail from './components/CaseDetail';
import NewCaseModal from './components/NewCaseModal';

export default function App() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState('ALL');
  const [activeOfficer, setActiveOfficer] = useState({
    name: 'Sarah Jenkins (L1 Checker)',
    tier: 'L1_CHECKER',
    role: 'L1 Compliance Checker (4-Eyes)',
  });
  const [highlightedCaseId, setHighlightedCaseId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Fetch Cases and Stats
  const fetchData = async () => {
    setLoadError('');
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/stats'),
      ]);
      if (!casesRes.ok || !statsRes.ok) {
        throw new Error(`API returned ${casesRes.status}/${statsRes.status}`);
      }

      const casesData = await casesRes.json();
      const statsData = await statsRes.json();
      setCases(casesData);
      setStats(statsData);

      // If a case is selected, keep its reference updated without reviving a closed case
      setSelectedCase((prevSelected) => {
        if (!prevSelected) return null;
        const updatedSelected = casesData.find((c) => c.id === prevSelected.id);
        return updatedSelected || null;
      });
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setLoadError('Unable to reach the compliance API. Check that the backend is running, then retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectCase = (caseItem) => {
    setSelectedCase(caseItem);
  };

  const handleBackToList = (targetQueue = null) => {
    const queueToSet = targetQueue || selectedCase?.current_queue || 'ALL';
    setSelectedQueue(queueToSet);

    if (selectedCase?.id) {
      setHighlightedCaseId(selectedCase.id);
      setTimeout(() => setHighlightedCaseId(null), 4500);
    }

    // Explicitly unmount case detail and return to list
    setSelectedCase(null);
    fetchData();
  };

  const handleCaseUpdated = (updatedCase) => {
    setSelectedCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    fetchData();
  };

  const handleClaimCase = async (caseItem, customTier = null) => {
    try {
      const res = await fetch(`/api/cases/${caseItem.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: customTier || undefined,
          claimant_name: activeOfficer.name,
          claimant_role: activeOfficer.role,
        }),
      });
      if (!res.ok) throw new Error('Claim failed');
      const updated = await res.json();
      handleCaseUpdated(updated);
      return updated;
    } catch (err) {
      alert(`Claim Error: ${err.message}`);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (!confirm('Are you sure you want to delete this case?')) return;
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCase(null);
        fetchData();
      }
    } catch (err) {
      alert(`Failed to delete case: ${err.message}`);
    }
  };

  const handleResetPresets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cases/reset', { method: 'POST' });
      if (res.ok) {
        setSelectedCase(null);
        await fetchData();
      }
    } catch (err) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseCreated = (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    setSelectedCase(newCase);
    fetchData();
  };

  return (
    <div className="app-container">
      {/* Navigation Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Shield size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>KYC Maker</span>
              <span className="brand-badge">AI Agent</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              Institutional Compliance & Multi-Tier Queue Governance
            </span>
          </div>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Active Officer Persona Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Acting as:</span>
            <select
              value={activeOfficer.name}
              onChange={(e) => {
                const name = e.target.value;
                if (name.includes('L1')) setActiveOfficer({ name, tier: 'L1_CHECKER', role: 'L1 Compliance Checker (4-Eyes)' });
                else if (name.includes('L2')) setActiveOfficer({ name, tier: 'L2_CHECKER', role: 'L2 Senior Compliance Lead (6-Eyes)' });
                else if (name.includes('MLRO')) setActiveOfficer({ name, tier: 'MLRO', role: 'Global MLRO / Head of FCC' });
                else setActiveOfficer({ name, tier: 'MAKER', role: 'KYC Maker Analyst' });
              }}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Sarah Jenkins (L1 Checker)" style={{ background: '#121826' }}>Sarah Jenkins (L1 Checker)</option>
              <option value="Alex Rivera (Senior Maker Analyst)" style={{ background: '#121826' }}>Alex Rivera (Maker Analyst)</option>
              <option value="Marcus Vance (L2 Senior VP)" style={{ background: '#121826' }}>Marcus Vance (L2 Senior VP)</option>
              <option value="Arthur Pendelton (Global MLRO)" style={{ background: '#121826' }}>Arthur Pendelton (Global MLRO)</option>
              <option value="KYC Maker AI Agent (Core)" style={{ background: '#121826' }}>KYC Maker AI Agent (Core)</option>
            </select>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={15} /> New Case
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {loadError && (
          <div className="error-banner" role="alert">
            <span>{loadError}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => { setIsLoading(true); fetchData(); }}>
              Retry
            </button>
          </div>
        )}
        {selectedCase ? (
          <CaseDetail
            caseData={selectedCase}
            activeQueue={selectedQueue}
            activeOfficer={activeOfficer}
            onBack={handleBackToList}
            onCaseUpdated={handleCaseUpdated}
            onDeleteCase={handleDeleteCase}
          />
        ) : (
          <CaseList
            cases={cases}
            stats={stats}
            selectedQueue={selectedQueue}
            activeOfficer={activeOfficer}
            onSelectQueue={setSelectedQueue}
            highlightedCaseId={highlightedCaseId}
            onSelectCase={handleSelectCase}
            onClaimCase={handleClaimCase}
            onNewCase={() => setIsModalOpen(true)}
            onResetPresets={handleResetPresets}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* New Case Creation Modal */}
      <NewCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCaseCreated={handleCaseCreated}
      />
    </div>
  );
}
