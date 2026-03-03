-- Migration 064: Rental projects/events and clients

-- Clients table
CREATE TABLE rental_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client notes
CREATE TABLE rental_client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES rental_clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rental projects (events)
CREATE TABLE rental_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES rental_clients(id) ON DELETE SET NULL,
  status rental_project_status NOT NULL DEFAULT 'draft',
  -- Dates
  start_date DATE,
  end_date DATE,
  setup_date DATE,
  teardown_date DATE,
  event_end_time TEXT,
  -- Event details
  event_type TEXT,
  attendee_count INTEGER,
  venue TEXT,
  venue_address TEXT,
  -- Delivery
  delivery_address TEXT,
  delivery_time TEXT,
  pickup_time TEXT,
  delivery_contact_name TEXT,
  delivery_contact_phone TEXT,
  day_of_contact_name TEXT,
  day_of_contact_phone TEXT,
  delivery_instructions TEXT,
  delivery_standard_hours_note TEXT,
  -- Business info
  business_email TEXT,
  business_phone TEXT,
  business_info TEXT,
  related_company TEXT,
  check_payee_name TEXT,
  check_payee_address TEXT,
  po_number TEXT,
  external_project_id TEXT,
  external_invoice_number TEXT,
  external_quote_number TEXT,
  -- Notes
  internal_notes TEXT,
  notes TEXT,
  -- Sales rep
  sales_lead_name TEXT,
  sales_lead_email TEXT,
  sales_lead_phone TEXT,
  internal_rep_name TEXT,
  internal_rep_email TEXT,
  internal_rep_phone TEXT,
  -- Counts & totals
  item_count INTEGER DEFAULT 0,
  payment_count INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  convenience_fee NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  due_on_signature NUMERIC(10,2),
  invoice_date DATE,
  quote_expiration_date DATE,
  -- Policies (inline text)
  payment_policy TEXT,
  payment_policy_name TEXT,
  cancellation_policy TEXT,
  cancellation_policy_name TEXT,
  terms_and_conditions TEXT,
  terms_policy_name TEXT,
  damage_waiver_policy TEXT,
  liability_policy TEXT,
  event_insurance TEXT,
  -- Signatures
  last_signature_date TIMESTAMPTZ,
  -- Reminders
  reminder_template_id UUID,
  reminder_subject_override TEXT,
  reminder_body_override TEXT,
  scheduled_reminder_date TIMESTAMPTZ,
  scheduled_reminder_sent BOOLEAN DEFAULT false,
  scheduling_form_url TEXT,
  duplicate_fingerprint TEXT,
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Line item groups (date-based grouping within a project)
CREATE TABLE line_item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project line items
CREATE TABLE rental_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  package_id UUID REFERENCES inventory_packages(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  sub_category TEXT,
  description TEXT,
  custom_image_url TEXT,
  item_type TEXT,
  is_service BOOLEAN DEFAULT false,
  line_item_group_id UUID REFERENCES line_item_groups(id) ON DELETE SET NULL,
  discount_type TEXT,
  discount_value NUMERIC(10,2),
  display_order INTEGER DEFAULT 0,
  internal_notes TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  logistics_type TEXT,
  logistics_address TEXT,
  logistics_direction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fulfillment tracking per line item
CREATE TABLE rental_project_item_fulfillment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id UUID NOT NULL REFERENCES rental_project_items(id) ON DELETE CASCADE UNIQUE,
  is_pulled BOOLEAN NOT NULL DEFAULT false,
  pulled_at TIMESTAMPTZ,
  pulled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_prepped BOOLEAN NOT NULL DEFAULT false,
  prepped_at TIMESTAMPTZ,
  prepped_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_loaded BOOLEAN NOT NULL DEFAULT false,
  loaded_at TIMESTAMPTZ,
  loaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project files
CREATE TABLE rental_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project-policy links
CREATE TABLE rental_project_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rental_projects(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_type rental_policy_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rental_clients_email ON rental_clients(email);
CREATE INDEX idx_rental_clients_name ON rental_clients(name);
CREATE INDEX idx_rental_projects_client ON rental_projects(client_id);
CREATE INDEX idx_rental_projects_status ON rental_projects(status);
CREATE INDEX idx_rental_projects_start ON rental_projects(start_date);
CREATE INDEX idx_rental_project_items_project ON rental_project_items(project_id);
CREATE INDEX idx_rental_project_items_inv ON rental_project_items(inventory_item_id);
CREATE INDEX idx_line_item_groups_project ON line_item_groups(project_id);
CREATE INDEX idx_rental_project_files_project ON rental_project_files(project_id);

-- RLS
ALTER TABLE rental_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_project_item_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_project_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage rental_clients" ON rental_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_client_notes" ON rental_client_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_projects" ON rental_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage line_item_groups" ON line_item_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_project_items" ON rental_project_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_project_item_fulfillment" ON rental_project_item_fulfillment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_project_files" ON rental_project_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage rental_project_policies" ON rental_project_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
