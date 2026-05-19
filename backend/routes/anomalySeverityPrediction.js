const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// Anomaly severity prediction with risk scoring
// Feature: anomaly-severity-prediction

async function callOpenRouter(systemPrompt, userPrompt, opts = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing. TODO: configure credentials');
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const httpResp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.5,
    }),
  });
  if (!httpResp.ok) throw new Error(`OpenRouter HTTP ${httpResp.status}`);
  const data = await httpResp.json();
  let txt = data.choices[0].message.content.trim();
  txt = txt.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

router.post('/analyze', auth, async (req, res) => {
  const payload = req.body || {};
  try {
    const result = await callOpenRouter(
      'You are an expert assistant for the "AIVideoIntelligence" platform. Always return strict JSON only.',
      `Feature: Anomaly severity prediction with risk scoring.\nInput: ${JSON.stringify(payload).slice(0, 3500)}\nReturn JSON: { summary, findings:[], recommendations:[], score:0.0, details:{} }`
    );
    res.json({ success: true, feature: 'anomaly-severity-prediction', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', auth, async (req, res) => {
  const { items = [] } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
  try {
    const result = await callOpenRouter(
      'You analyze batches for "AIVideoIntelligence". JSON only.',
      `Feature: Anomaly severity prediction with risk scoring. Batch of ${items.length} items: ${JSON.stringify(items).slice(0, 3500)}.\nReturn JSON: { results:[], aggregate:{} }`,
      { maxTokens: 3072 }
    );
    res.json({ success: true, count: items.length, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/info', auth, (req, res) => {
  res.json({ feature: 'anomaly-severity-prediction', title: 'Anomaly severity prediction with risk scoring', project: 'AIVideoIntelligence' });
});

module.exports = router;
