-- Migration 076: QuickBooks Online integrations
-- Stores encrypted OAuth tokens for QuickBooks API access (invoicing, payments)

CREATE TABLE IF NOT EXISTS quickbooks_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  realm_id TEXT NOT NULL,                  -- QuickBooks company ID
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,    -- QB refresh tokens expire after 100 days
  company_name TEXT,
  connected_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one QuickBooks integration per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_quickbooks_integrations_user ON quickbooks_integrations(user_id);

-- Also index by realm_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_integrations_realm ON quickbooks_integrations(realm_id);

-- Owner-only RLS
ALTER TABLE quickbooks_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quickbooks_integrations_owner" ON quickbooks_integrations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for webhook processing
CREATE POLICY "quickbooks_integrations_service" ON quickbooks_integrations
  FOR SELECT TO service_role
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER set_quickbooks_integrations_updated_at
  BEFORE UPDATE ON quickbooks_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
