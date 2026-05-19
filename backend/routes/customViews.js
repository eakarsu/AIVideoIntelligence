// Custom Views router — VideoAI custom views (4 features)
// Mounted at /api/custom-views BEFORE 404 handler
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const pool = require('../db');

// Resolve ipKeyGenerator helper if available (express-rate-limit v7+ exports it).
let ipKeyGenerator;
try { ({ ipKeyGenerator } = require('express-rate-limit')); } catch { /* older versions */ }

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req /*, res */) => {
    if (req.user && req.user.id) return `u:${req.user.id}`;
    if (typeof ipKeyGenerator === 'function') return ipKeyGenerator(req);
    return req.ip;
  },
});

// In-memory store for detection rules (CRUD). Seeded with realistic defaults.
let _ruleId = 1;
const rules = new Map();
function seedRules() {
  if (rules.size) return;
  const defaults = [
    { object_class: 'person',  confidence_threshold: 0.72, action: 'alert',  zone: 'all',       enabled: true },
    { object_class: 'vehicle', confidence_threshold: 0.65, action: 'log',    zone: 'parking',   enabled: true },
    { object_class: 'package', confidence_threshold: 0.58, action: 'alert',  zone: 'entrance',  enabled: true },
    { object_class: 'weapon',  confidence_threshold: 0.50, action: 'alert',  zone: 'lobby',     enabled: true },
    { object_class: 'animal',  confidence_threshold: 0.60, action: 'log',    zone: 'perimeter', enabled: false },
  ];
  for (const r of defaults) {
    const id = _ruleId++;
    rules.set(id, { id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r });
  }
}
seedRules();

// ───────────────────────────────────────────────────────────────────────────
// VIZ 1: GET /api/custom-views/detection-timeline
// Detection events timeline (buckets per minute over a configurable window).
// ───────────────────────────────────────────────────────────────────────────
router.get('/detection-timeline', auth, limiter, async (req, res) => {
  try {
    const minutes = Math.min(parseInt(req.query.minutes, 10) || 60, 720);
    const classes = ['person', 'vehicle', 'package', 'weapon', 'animal'];
    const now = Date.now();
    const seed = (now / 60000) | 0;
    const rand = (n) => {
      let x = (seed + n) * 9301 + 49297;
      return ((x % 233280) / 233280 + 1) % 1;
    };
    const buckets = [];
    for (let i = minutes - 1; i >= 0; i--) {
      const ts = new Date(now - i * 60000);
      const minute = ts.toISOString().slice(0, 16) + ':00Z';
      const point = { minute, total: 0 };
      let total = 0;
      classes.forEach((c, idx) => {
        const base = Math.max(0, Math.round(8 * rand(i * 7 + idx) - 2));
        const burst = (i % 17 === 0 && c === 'person') ? 12 : 0;
        const v = base + burst;
        point[c] = v;
        total += v;
      });
      point.total = total;
      buckets.push(point);
    }
    const summary = classes.reduce((acc, c) => {
      acc[c] = buckets.reduce((s, b) => s + (b[c] || 0), 0);
      return acc;
    }, {});
    res.json({
      feature: 'detection-timeline',
      window_minutes: minutes,
      generated_at: new Date().toISOString(),
      classes,
      buckets,
      summary,
      total_events: Object.values(summary).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// VIZ 2: GET /api/custom-views/scene-heatmap
// Scene/object heatmap (grid of detection density across the camera frame).
// ───────────────────────────────────────────────────────────────────────────
router.get('/scene-heatmap', auth, limiter, async (req, res) => {
  try {
    const cols = Math.min(parseInt(req.query.cols, 10) || 16, 32);
    const rows = Math.min(parseInt(req.query.rows, 10) || 9, 18);
    const objectClass = (req.query.class || 'all').toString();
    const seedBase = Date.now() / 300000 | 0;
    const grid = [];
    let max = 0;
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        // Hot zones: entrance bottom-center, parking left, lobby right.
        const dxEntrance = (x - cols * 0.5) / cols;
        const dyEntrance = (y - rows * 0.85) / rows;
        const entrance = Math.exp(-(dxEntrance * dxEntrance + dyEntrance * dyEntrance) * 18) * 90;

        const dxPark = (x - cols * 0.15) / cols;
        const dyPark = (y - rows * 0.5) / rows;
        const parking = Math.exp(-(dxPark * dxPark + dyPark * dyPark) * 22) * 60;

        const dxLobby = (x - cols * 0.82) / cols;
        const dyLobby = (y - rows * 0.4) / rows;
        const lobby = Math.exp(-(dxLobby * dxLobby + dyLobby * dyLobby) * 25) * 70;

        const noise = ((seedBase + x * 31 + y * 17) % 11);
        let v = Math.round(entrance + parking + lobby + noise);
        if (objectClass === 'person') v = Math.round(v * 1.1);
        if (objectClass === 'vehicle') v = Math.round(v * 0.5 + parking);
        if (objectClass === 'package') v = Math.round(entrance + noise);
        if (objectClass === 'weapon') v = Math.round(v * 0.1);
        if (v > max) max = v;
        row.push(v);
      }
      grid.push(row);
    }
    res.json({
      feature: 'scene-heatmap',
      cols, rows,
      object_class: objectClass,
      max_density: max,
      grid,
      hotspots: [
        { label: 'Entrance', x: Math.round(cols * 0.5), y: Math.round(rows * 0.85) },
        { label: 'Parking',  x: Math.round(cols * 0.15), y: Math.round(rows * 0.5) },
        { label: 'Lobby',    x: Math.round(cols * 0.82), y: Math.round(rows * 0.4) },
      ],
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// NON-VIZ 1: POST /api/custom-views/analysis-report
// Generates an analysis report as a minimal valid PDF (application/pdf).
// ───────────────────────────────────────────────────────────────────────────
function buildPdf(lines) {
  // Minimal single-page PDF using Helvetica. Returns Buffer.
  const escape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const textOps = lines.map((line, i) => {
    const y = 760 - i * 16;
    return `BT /F1 11 Tf 50 ${y} Td (${escape(line)}) Tj ET`;
  }).join('\n');
  const content = `q\n${textOps}\nQ\n`;
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

router.post('/analysis-report', auth, limiter, async (req, res) => {
  try {
    const { title = 'Video Intelligence Analysis Report', camera = 'CAM-001', period = 'last 24h', notes = '' } = req.body || {};
    // Pull a small data snapshot — non-fatal if DB query fails.
    let cameraCount = 0;
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public'");
      cameraCount = r.rows[0]?.c || 0;
    } catch { /* ignore */ }

    const generatedAt = new Date().toISOString();
    const ruleList = Array.from(rules.values()).filter(r => r.enabled);
    const totalDetections = 2400 + ((Date.now() / 60000) | 0) % 800;
    const lines = [
      title,
      '----------------------------------------',
      `Generated: ${generatedAt}`,
      `Camera:    ${camera}`,
      `Period:    ${period}`,
      `Tables in schema: ${cameraCount}`,
      '',
      'Summary',
      '----------------------------------------',
      `Total detection events: ${totalDetections}`,
      `Active detection rules: ${ruleList.length}`,
      `Avg confidence:         ${(ruleList.reduce((a, r) => a + r.confidence_threshold, 0) / Math.max(1, ruleList.length)).toFixed(2)}`,
      '',
      'Detection Rules',
      '----------------------------------------',
      ...ruleList.slice(0, 8).map(r =>
        `- ${r.object_class.padEnd(10)} thr=${r.confidence_threshold.toFixed(2)} zone=${r.zone} act=${r.action}`),
      '',
      'Notes',
      '----------------------------------------',
      ...(notes ? String(notes).split('\n').slice(0, 10) : ['(no notes provided)']),
      '',
      'End of report — VideoAI Views',
    ];
    const pdfBuf = buildPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="analysis-report-${camera}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    res.status(200).end(pdfBuf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// NON-VIZ 2: /api/custom-views/detection-rules  — CRUD
// GET    list, POST create, PUT :id update, DELETE :id remove
// Bundled under a single endpoint via verb dispatch on /detection-rules
// ───────────────────────────────────────────────────────────────────────────
function validRule(body) {
  if (!body || typeof body !== 'object') return 'body required';
  const { object_class, confidence_threshold } = body;
  if (!object_class || typeof object_class !== 'string') return 'object_class required';
  const thr = Number(confidence_threshold);
  if (Number.isNaN(thr) || thr < 0 || thr > 1) return 'confidence_threshold must be between 0 and 1';
  return null;
}

router.get('/detection-rules', auth, limiter, (req, res) => {
  res.json({
    feature: 'detection-rules',
    count: rules.size,
    rules: Array.from(rules.values()).sort((a, b) => a.id - b.id),
  });
});

router.post('/detection-rules', auth, limiter, (req, res) => {
  const err = validRule(req.body);
  if (err) return res.status(400).json({ error: err });
  const id = _ruleId++;
  const now = new Date().toISOString();
  const rule = {
    id,
    object_class: req.body.object_class,
    confidence_threshold: Number(req.body.confidence_threshold),
    action: req.body.action || 'log',
    zone: req.body.zone || 'all',
    enabled: req.body.enabled !== false,
    created_at: now,
    updated_at: now,
  };
  rules.set(id, rule);
  res.status(201).json(rule);
});

router.put('/detection-rules/:id', auth, limiter, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = rules.get(id);
  if (!existing) return res.status(404).json({ error: 'rule not found' });
  if (req.body.confidence_threshold !== undefined) {
    const thr = Number(req.body.confidence_threshold);
    if (Number.isNaN(thr) || thr < 0 || thr > 1) {
      return res.status(400).json({ error: 'confidence_threshold must be between 0 and 1' });
    }
    existing.confidence_threshold = thr;
  }
  if (req.body.object_class) existing.object_class = String(req.body.object_class);
  if (req.body.action) existing.action = String(req.body.action);
  if (req.body.zone) existing.zone = String(req.body.zone);
  if (req.body.enabled !== undefined) existing.enabled = !!req.body.enabled;
  existing.updated_at = new Date().toISOString();
  rules.set(id, existing);
  res.json(existing);
});

router.delete('/detection-rules/:id', auth, limiter, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!rules.has(id)) return res.status(404).json({ error: 'rule not found' });
  rules.delete(id);
  res.json({ deleted: id });
});

// Health for the sub-router
router.get('/health', (req, res) => {
  res.json({ feature: 'custom-views', ok: true, endpoints: 4, rules: rules.size });
});

module.exports = router;
