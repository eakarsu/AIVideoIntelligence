# Operations

Copy `.env.example` to `.env`, replace placeholders, provision PostgreSQL/dependencies, then run `cd backend && npm run migrate`. Start with `./start.sh`.

Startup is read-only and fails closed on missing secrets/schema. Run `npm test` in `backend`. Socket connections require a tenant-bearing JWT; webhooks fail closed without HMAC configuration. Video analytics/SIEM/provider rows are typed receipts only, not claims of live hardware or platform integration. Configure lawful authority/consent, retention, human review, access controls, incident response, and recovery for the deployment jurisdiction.

The legacy seed drops demo tables and is guarded by `ALLOW_DESTRUCTIVE_DEMO_SEED=true`; use it only for an isolated disposable database.
