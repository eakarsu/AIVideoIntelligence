BEGIN;

CREATE TABLE IF NOT EXISTS evidence_ai_results (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  model_used TEXT NOT NULL,
  usage JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_ai_results_scope_idx
  ON evidence_ai_results (tenant_id, subject_id, created_at DESC);

COMMIT;
