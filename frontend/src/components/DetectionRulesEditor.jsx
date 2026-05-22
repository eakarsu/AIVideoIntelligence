// NON-VIZ 2 — Detection rules CRUD editor (object classes + confidence thresholds)
import React, { useEffect, useState } from 'react';

function getToken() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('vigilance_token')) || '';
}

const ACTIONS = ['alert', 'log', 'silent', 'escalate'];
const CLASSES_HINT = ['person', 'vehicle', 'package', 'weapon', 'animal', 'bicycle', 'face', 'license_plate'];

export default function DetectionRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ object_class: '', confidence_threshold: 0.7, action: 'alert', zone: 'all' });

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/custom-views/detection-rules', { headers: headers() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'fetch failed');
      setRules(j.rules || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!draft.object_class.trim()) { setError('object_class required'); return; }
    setError(null);
    const res = await fetch('/api/custom-views/detection-rules', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...draft, confidence_threshold: Number(draft.confidence_threshold) }),
    });
    const j = await res.json();
    if (!res.ok) { setError(j.error || 'create failed'); return; }
    setDraft({ object_class: '', confidence_threshold: 0.7, action: 'alert', zone: 'all' });
    reload();
  };

  const update = async (id, patch) => {
    const res = await fetch(`/api/custom-views/detection-rules/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'update failed');
    }
    reload();
  };

  const remove = async (id) => {
    const res = await fetch(`/api/custom-views/detection-rules/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'delete failed');
    }
    reload();
  };

  return (
    <div data-testid="nonviz-detection-rules" style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
      padding: 16, marginBottom: 18,
    }}>
      <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, marginBottom: 12 }}>
        NON-VIZ · Detection Rules Editor
      </h3>

      {error && <div style={{ color: '#fecaca', fontSize: 13, marginBottom: 8 }}>Error: {error}</div>}

      <div style={{
        display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: 8,
        background: '#0f172a', padding: 10, borderRadius: 6, marginBottom: 12, alignItems: 'end',
      }}>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Object class</label>
          <input list="cv-classes" value={draft.object_class}
            onChange={(e) => setDraft({ ...draft, object_class: e.target.value })}
            placeholder="person" />
          <datalist id="cv-classes">
            {CLASSES_HINT.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Threshold (0–1)</label>
          <input type="number" step="0.05" min="0" max="1"
            value={draft.confidence_threshold}
            onChange={(e) => setDraft({ ...draft, confidence_threshold: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Action</label>
          <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Zone</label>
          <input value={draft.zone} onChange={(e) => setDraft({ ...draft, zone: e.target.value })} />
        </div>
        <button onClick={create}
          style={{
            background: '#22c55e', color: '#0f172a', border: 'none',
            padding: '8px 14px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', height: 36,
          }}>
          + Add
        </button>
      </div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#e2e8f0' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
            <th style={{ padding: '6px 4px' }}>ID</th>
            <th style={{ padding: '6px 4px' }}>Class</th>
            <th style={{ padding: '6px 4px' }}>Threshold</th>
            <th style={{ padding: '6px 4px' }}>Action</th>
            <th style={{ padding: '6px 4px' }}>Zone</th>
            <th style={{ padding: '6px 4px' }}>On</th>
            <th style={{ padding: '6px 4px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
              <td style={{ padding: '6px 4px', color: '#64748b' }}>#{r.id}</td>
              <td style={{ padding: '6px 4px' }}>{r.object_class}</td>
              <td style={{ padding: '6px 4px' }}>
                <input type="number" step="0.05" min="0" max="1"
                  defaultValue={r.confidence_threshold}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v !== r.confidence_threshold) update(r.id, { confidence_threshold: v });
                  }}
                  style={{ width: 80 }} />
              </td>
              <td style={{ padding: '6px 4px' }}>
                <select defaultValue={r.action}
                  onChange={(e) => update(r.id, { action: e.target.value })}
                  style={{ width: 100 }}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </td>
              <td style={{ padding: '6px 4px' }}>{r.zone}</td>
              <td style={{ padding: '6px 4px' }}>
                <input type="checkbox" defaultChecked={r.enabled}
                  onChange={(e) => update(r.id, { enabled: e.target.checked })} />
              </td>
              <td style={{ padding: '6px 4px' }}>
                <button onClick={() => remove(r.id)}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none',
                    padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                  }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!rules.length && !loading && (
            <tr><td colSpan={7} style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>No rules. Add one above.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
