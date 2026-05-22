// NON-VIZ 1 — Analysis report PDF generator
import React, { useState } from 'react';

function getToken() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('vigilance_token')) || '';
}

export default function AnalysisReportPDF() {
  const [camera, setCamera] = useState('CAM-001');
  const [period, setPeriod] = useState('last 24h');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [lastUrl, setLastUrl] = useState(null);

  const generate = async () => {
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/custom-views/analysis-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ camera, period, notes }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      setLastUrl(url);
      setStatus(`PDF generated (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="nonviz-analysis-report" style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
      padding: 16, marginBottom: 18,
    }}>
      <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, marginBottom: 12 }}>
        NON-VIZ · Analysis Report (PDF)
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Camera</label>
          <input value={camera} onChange={(e) => setCamera(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Period</label>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 12, color: '#94a3b8' }}>Notes (optional)</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Any observations or context…" style={{ marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={generate} disabled={loading}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 6, fontSize: 13,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
          {loading ? 'Generating…' : 'Generate PDF'}
        </button>
        {lastUrl && (
          <>
            <a href={lastUrl} download={`analysis-report-${camera}.pdf`}
              style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'underline' }}>
              Download
            </a>
            <a href={lastUrl} target="_blank" rel="noreferrer"
              style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'underline' }}>
              Open in tab
            </a>
          </>
        )}
        {status && <span style={{ fontSize: 12, color: status.startsWith('Error') ? '#fecaca' : '#86efac' }}>{status}</span>}
      </div>
    </div>
  );
}
