-- Migration 066: Policies, contracts, document templates, email system

-- Policies (payment, cancellation, terms)
CREATE TABLE rental_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type rental_policy_type NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract signatures (digital signing)
CREATE TABLE contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  signer_name TEXT,
  signer_email TEXT,
  signature_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document templates (invoice, quote, contract, etc.)
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  header_text TEXT,
  footer_text TEXT,
  custom_template_url TEXT,
  custom_notes TEXT,
  -- Visibility toggles
  show_client_info BOOLEAN NOT NULL DEFAULT true,
  show_company_logo BOOLEAN NOT NULL DEFAULT true,
  show_item_categories BOOLEAN NOT NULL DEFAULT true,
  show_item_descriptions BOOLEAN NOT NULL DEFAULT true,
  show_item_sku BOOLEAN NOT NULL DEFAULT false,
  show_item_images BOOLEAN NOT NULL DEFAULT false,
  show_line_totals BOOLEAN NOT NULL DEFAULT true,
  show_subtotal BOOLEAN NOT NULL DEFAULT true,
  show_taxes BOOLEAN NOT NULL DEFAULT true,
  show_discount BOOLEAN NOT NULL DEFAULT true,
  show_grand_total BOOLEAN NOT NULL DEFAULT true,
  show_event_dates BOOLEAN NOT NULL DEFAULT true,
  show_venue_info BOOLEAN NOT NULL DEFAULT true,
  show_logistics BOOLEAN NOT NULL DEFAULT true,
  show_payment_schedule BOOLEAN NOT NULL DEFAULT true,
  show_signature_block BOOLEAN NOT NULL DEFAULT true,
  show_terms BOOLEAN NOT NULL DEFAULT true,
  show_policies BOOLEAN NOT NULL DEFAULT true,
  section_order JSONB,
  section_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document sharing links
CREATE TABLE document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  document_template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email templates
CREATE TABLE rental_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email settings
CREATE TABLE rental_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  reply_to_email TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_secure BOOLEAN DEFAULT true,
  email_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contract_signatures_project ON contract_signatures(project_id);
CREATE INDEX idx_contract_signatures_token ON contract_signatures(token);
CREATE INDEX idx_document_links_token ON document_links(token);
CREATE INDEX idx_document_links_project ON document_links(project_id);

-- RLS
ALTER TABLE rental_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage rental_policies" ON rental_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage contract_signatures" ON contract_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage document_templates" ON document_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage document_links" ON document_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_email_templates" ON rental_email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_email_settings" ON rental_email_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public access for contract signing and document viewing
CREATE POLICY "Public can read contract_signatures by token" ON contract_signatures FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update contract_signatures by token" ON contract_signatures FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can read document_links by token" ON document_links FOR SELECT TO anon USING (true);
