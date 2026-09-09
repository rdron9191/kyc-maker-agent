import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Layers, Activity, Plus } from 'lucide-react';
import CaseList from './components/CaseList';
import CaseDetail from './components/CaseDetail';
import NewCaseModal from './components/NewCaseModal';

export default function App() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedCase, setSelectedCase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Cases and Stats
  const fetchData = async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/stats'),
      ]);
      if (casesRes.ok && statsRes.ok) {
        const casesData = await casesRes.json();
        const statsData = await statsRes.json();
        setCases(casesData);
        setStats(statsData);

        // If a case is selected, keep its reference updated
        if (selectedCase) {
          const updatedSelected = casesData.find((c) => c.id === selectedCase.id);
          if (updatedSelected) {
            setSelectedCase(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
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

  const handleBackToList = () => {
    setSelectedCase(null);
    fetchData();
  };

  const handleCaseUpdated = (updatedCase) => {
    setSelectedCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    fetchData();
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
            <Shield size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>KYC Maker</span>
              <span className="brand-badge">AI Agent</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              Automated KYC / AML Due Diligence Assistant
            </span>
          </div>
        </div>

        <div className="nav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }} />
            <span>Agent Online</span>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} /> New Case
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {selectedCase ? (
          <CaseDetail
            caseData={selectedCase}
            onBack={handleBackToList}
            onCaseUpdated={handleCaseUpdated}
            onDeleteCase={handleDeleteCase}
          />
        ) : (
          <CaseList
            cases={cases}
            stats={stats}
            onSelectCase={handleSelectCase}
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
