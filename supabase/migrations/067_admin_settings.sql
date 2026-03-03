-- Migration 067: Admin, company settings, activity logs, saved addresses

-- Company settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Carolina Balloons',
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#ec4899',
  tax_id TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  check_payable_to TEXT,
  check_mailing_address TEXT,
  default_delivery_rate NUMERIC(10,2),
  default_pickup_rate NUMERIC(10,2),
  minimum_delivery_fee NUMERIC(10,2),
  per_mile_rate NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity/audit logs
CREATE TABLE inventory_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  project_id UUID REFERENCES rental_projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved addresses (for delivery)
CREATE TABLE saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import sessions tracking
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_activity_logs_project ON inventory_activity_logs(project_id);
CREATE INDEX idx_activity_logs_user ON inventory_activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON inventory_activity_logs(created_at);
CREATE INDEX idx_import_sessions_user ON import_sessions(user_id);

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage company_settings" ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage inventory_activity_logs" ON inventory_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage saved_addresses" ON saved_addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage own import_sessions" ON import_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Insert default company settings
INSERT INTO company_settings (name, email, primary_color, timezone)
VALUES ('Carolina Balloons', 'info@carolinaballoons.com', '#ec4899', 'America/New_York');

-- Insert default inventory settings
INSERT INTO inventory_settings (
  auto_return_enabled, auto_return_days, auto_return_status,
  return_requires_confirmation, auto_update_available_quantity,
  pre_buffer_time, post_buffer_time, buffer_time_unit,
  default_project_buffer, apply_buffer_to_all_items
) VALUES (
  false, 1, 'available',
  true, true,
  0, 0, 'hours',
  0, false
);
