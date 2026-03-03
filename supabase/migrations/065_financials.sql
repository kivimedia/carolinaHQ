-- Migration 065: Financial tables - payments, invoices, taxes

-- Payments
CREATE TABLE rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'payment',
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date DATE,
  due_date DATE,
  processing_fee NUMERIC(10,2),
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice schedule milestones
CREATE TABLE invoice_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_send_date DATE,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  recipient_name TEXT,
  recipient_email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice payment tokens (Stripe payment links)
CREATE TABLE invoice_payment_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  invoice_schedule_id UUID REFERENCES invoice_schedule(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  client_name TEXT,
  client_email TEXT,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_client_secret TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice email logs
CREATE TABLE invoice_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  invoice_schedule_id UUID REFERENCES invoice_schedule(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote email logs
CREATE TABLE quote_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax rates
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(5,4) NOT NULL,
  jurisdiction TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote expiration settings
CREATE TABLE quote_expiration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_expiration_days INTEGER NOT NULL DEFAULT 30,
  send_reminder_before_days INTEGER DEFAULT 3,
  auto_expire BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote expiration reminders
CREATE TABLE quote_expiration_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rental_payments_project ON rental_payments(project_id);
CREATE INDEX idx_rental_payments_status ON rental_payments(status);
CREATE INDEX idx_invoice_schedule_project ON invoice_schedule(project_id);
CREATE INDEX idx_invoice_payment_tokens_token ON invoice_payment_tokens(token);
CREATE INDEX idx_invoice_payment_tokens_project ON invoice_payment_tokens(project_id);
CREATE INDEX idx_quote_expiration_reminders_project ON quote_expiration_reminders(project_id);

-- RLS
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_expiration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_expiration_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage rental_payments" ON rental_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage invoice_schedule" ON invoice_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage invoice_payment_tokens" ON invoice_payment_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage invoice_emails" ON invoice_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage quote_emails" ON quote_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage tax_rates" ON tax_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage quote_expiration_settings" ON quote_expiration_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage quote_expiration_reminders" ON quote_expiration_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public access to payment tokens (for pay-invoice public page)
CREATE POLICY "Public can read invoice_payment_tokens by token" ON invoice_payment_tokens FOR SELECT TO anon USING (true);
