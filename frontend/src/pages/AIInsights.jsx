import React, { useState, useRef, useEffect } from 'react';
import { callAI } from '../api';
import { aiFeatures } from '../modules';
import AIReport from '../components/AIReport';

function ChatInterface({ feature }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;
    setInput('');
    const newMsgs = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const data = await callAI(feature.key, { messages: newMsgs });
      setMessages([...newMsgs, { role: 'assistant', content: data.response ?? data.result ?? data }]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{feature.icon}</div>
            <p>{feature.description}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 16 }}>
              {feature.samples.map(s => (
                <button key={s} className="chip" type="button" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === 'assistant' ? <AIReport response={m.content} title={feature.name} /> : m.content}
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="spinner" style={{ width: 18, height: 18 }} /></div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Ask the ${feature.name}...`}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

function NLInput({ feature, onResult, setActiveLoading }) {
  const [input, setInput] = useState('');

  const ask = async (text) => {
    const q = text || input;
    if (!q.trim()) return;
    setInput('');
    setActiveLoading(true);
    try {
      const body = feature.key === 'emergency-response' ? { scenario: q } : { prompt: q };
      const data = await callAI(feature.key, body);
      onResult(data.response ?? data.result ?? data);
    } catch (err) {
      onResult(`Error: ${err.message}`);
    } finally {
      setActiveLoading(false);
    }
  };

  const placeholder = feature.key === 'emergency-response'
    ? 'Describe an emergency scenario...'
    : 'Ask anything about your security data...';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="search-input"
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder={placeholder}
        />
        <button className="btn btn-primary" onClick={() => ask()}>{feature.key === 'emergency-response' ? 'Plan' : 'Ask'}</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {feature.samples.map(s => (
          <button key={s} className="chip" type="button" onClick={() => setInput(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}

export default function AIInsights() {
  const [activeFeature, setActiveFeature] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');

  const openFeature = (feature) => {
    setActiveFeature(feature);
    setResult(null);
    setAnalysisPrompt('');
    setLoading(false);
  };

  const runAnalysis = async (prompt) => {
    if (!activeFeature) return;
    setLoading(true);
    setResult(null);
    try {
      const body = { prompt };
      if (activeFeature.key === 'emergency-response') body.scenario = prompt;
      const data = await callAI(activeFeature.key, body);
      setResult(data.response ?? data.result ?? data);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setActiveFeature(null);
    setResult(null);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>AI-Powered Intelligence</h2>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>{aiFeatures.length} Gen AI features powered by real security data</p>
      </div>

      <div className="ai-grid">
        {aiFeatures.map(f => (
          <div className="ai-card" key={f.key} onClick={() => openFeature(f)}>
            <div className="ai-icon">{f.icon}</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{f.name}</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 8 }}>{f.description}</p>
            <div className="sample-chips">
              {f.samples.map(s => (
                <span key={s} className="chip">
                  {s.length > 35 ? s.substring(0, 35) + '...' : s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeFeature && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: activeFeature.type === 'chat' ? 800 : 700 }}>
            <div className="modal-header">
              <h3>{activeFeature.icon} {activeFeature.name}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{activeFeature.description}</p>

              {activeFeature.type === 'chat' ? (
                <ChatInterface feature={activeFeature} />
              ) : activeFeature.type === 'input' ? (
                <>
                  <NLInput feature={activeFeature} onResult={setResult} setActiveLoading={setLoading} />
                  {loading && <div className="loading" style={{ marginTop: 20 }}><div className="spinner" />Analyzing...</div>}
                  {result !== null && <div style={{ marginTop: 20 }}><AIReport response={result} title={activeFeature.name} /></div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Choose a sample prompt, review it, then run the analysis:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {activeFeature.samples.map(s => (
                      <button
                        key={s}
                        className="chip"
                        style={{ fontSize: 13, padding: '6px 14px' }}
                        onClick={() => setAnalysisPrompt(s)}
                        disabled={loading}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <textarea aria-label="Analysis prompt" className="search-input" style={{ flex: 1 }} value={analysisPrompt} onChange={e => setAnalysisPrompt(e.target.value)} rows={3} />
                    <button type="button" className="btn btn-primary" onClick={() => runAnalysis(analysisPrompt)} disabled={loading || !analysisPrompt.trim()}>Run analysis</button>
                  </div>
                  {!loading && result === null && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: 14 }}>
                      Select a prompt above, then run the analysis
                    </div>
                  )}
                  {loading && <div className="loading"><div className="spinner" />Analyzing data with AI...</div>}
                  {result !== null && <AIReport response={result} title={activeFeature.name} />}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
