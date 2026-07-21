const test = require('node:test'); const assert = require('node:assert/strict'); const p = require('../domain/evidenceWorkflow');
test('retention and authority are mandatory', () => assert.throws(() => p.validateEvidence({ sourceUri: 'x' }), /retention/));
test('evidence provenance is accepted', () => assert.equal(p.validateEvidence({ sourceUri: 'x', capturedAt: '2026-01-01', retentionClass: '30d', consentOrAuthority: 'owner' }), true));
test('analysis pins a model version', () => assert.throws(() => p.transition({ status: 'sources_ready', version: 1 }, 'analysis_queued'), /model/));
test('analyst cannot self approve', () => assert.throws(() => p.transition({ status: 'review', version: 1, analystId: 'u' }, 'approved', { reviewerId: 'u',moderationStatus:'passed',disclosureConfirmed:true }), /independent/));
test('evaluation includes latency and bias', () => assert.equal(p.validateEvaluation({ precision: 1, recall: 1, latencyMs: 10, failureMode: 'none', biasSlice: 'lighting', expectedOutcome: 'detect' }), true));
test('analytics connector can dead-letter', () => assert.equal(p.acceptReceipt({ provider: 'analytics', idempotencyKey: 'k', status: 'dead_letter' }), true));
test('evidence subject scope matches',()=>assert.equal(p.assertScope({tenantId:'t',subjectId:'s'},{tenantId:'t',subjectId:'s',role:'analyst'},['admin']),true));
test('other subject is hidden',()=>assert.throws(()=>p.assertScope({tenantId:'t',subjectId:'s'},{tenantId:'t',subjectId:'x',role:'viewer'},['admin']),/subject/));
