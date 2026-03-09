-- Migration 071: Proposal-Poppers full schema
-- Integrates the proposal-poppers Lovable app into CarolinaHQ
-- Creates 18 new tables, enums, functions, triggers, storage buckets
-- Handles overlaps with existing tables (pricing_rules, proposal_patterns, profiles)

-- ============================================================================
-- ENUMS (safe create with exception handling)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'birthday', 'corporate', 'wedding', 'baby_shower', 'graduation',
    'sweet_16', 'grand_opening', 'gender_reveal', 'photo_shoot',
    'fundraiser', 'anniversary', 'prom', 'holiday', 'church',
    'school', 'memorial', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM (
    'draft', 'ready', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE confidence_tier_enum AS ENUM (
    'no_brainer', 'suggested', 'needs_human'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_rule_type AS ENUM (
    'minimum', 'delivery', 'surcharge', 'discount'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_value_type AS ENUM (
    'flat', 'percent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Safe updated_at trigger function (may already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate proposal numbers in CB-YYYY-NNN format
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    current_year := EXTRACT(YEAR FROM now())::TEXT;
    SELECT COALESCE(MAX(
      CASE
        WHEN proposal_number ~ ('^CB-' || current_year || '-\d+$')
        THEN CAST(SUBSTRING(proposal_number FROM '\d+$') AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM proposals;
    NEW.proposal_number := 'CB-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: products (enhanced product catalog - separate from product_catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  proposal_description TEXT,
  sizes JSONB DEFAULT '[]',
  base_price NUMERIC(10,2) DEFAULT 0,
  price_modifiers JSONB DEFAULT '[]',
  color_presets JSONB DEFAULT '[]',
  setup_time_minutes INTEGER DEFAULT 30,
  historical_frequency INTEGER DEFAULT 0,
  historical_conversion_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "products_select" ON products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "products_all" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: product_images
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "product_images_select" ON product_images FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "product_images_all" ON product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ============================================================================
-- TABLE: proposals (the full proposal system - separate from proposal_drafts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  status proposal_status NOT NULL DEFAULT 'draft',
  confidence_tier confidence_tier_enum,
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_logo_url TEXT DEFAULT '',
  event_type TEXT DEFAULT '',
  event_date DATE,
  start_time TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  guests TEXT DEFAULT '',
  color_theme TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  lead_source TEXT DEFAULT '',
  subtotal NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  surcharges JSONB DEFAULT '[]',
  discounts JSONB DEFAULT '[]',
  total NUMERIC(10,2) DEFAULT 0,
  total_override NUMERIC(10,2),
  personal_note TEXT DEFAULT '',
  template_name TEXT DEFAULT 'celebration-elegance',
  hero_image_url TEXT,
  payment_options JSONB DEFAULT '[]',
  valid_days INTEGER DEFAULT 14,
  image_display_mode TEXT DEFAULT 'regular',
  gallery_layout TEXT DEFAULT 'grid',
  selected_option_ids UUID[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  matched_pattern_id UUID REFERENCES proposal_patterns ON DELETE SET NULL,
  ai_match_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposals_select_auth" ON proposals FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposals_insert_auth" ON proposals FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposals_update_auth" ON proposals FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposals_delete_auth" ON proposals FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposals_select_anon" ON proposals FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

-- Triggers
DROP TRIGGER IF EXISTS generate_proposal_number_trigger ON proposals;
CREATE TRIGGER generate_proposal_number_trigger
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION generate_proposal_number();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: proposal_line_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  selected_size TEXT,
  selected_color TEXT DEFAULT 'Custom',
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_line_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_line_items_select" ON proposal_line_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_line_items_all" ON proposal_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal ON proposal_line_items(proposal_id);

-- ============================================================================
-- TABLE: proposal_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_types TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  default_line_items JSONB DEFAULT '[]',
  default_personal_note TEXT DEFAULT '',
  default_notes TEXT DEFAULT '',
  default_delivery_fee NUMERIC DEFAULT 0,
  default_surcharges JSONB DEFAULT '[]',
  default_discounts JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_templates_select" ON proposal_templates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_templates_all" ON proposal_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_options (bundle packages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_options ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_options_manage" ON proposal_options FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_options_view" ON proposal_options FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_option_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_option_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES proposal_options ON DELETE CASCADE,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  selected_size TEXT DEFAULT '',
  selected_color TEXT DEFAULT 'Custom',
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_option_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_option_items_select" ON proposal_option_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_option_items_all" ON proposal_option_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: template_options (junction: template <-> option)
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES proposal_templates ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES proposal_options ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  price_override NUMERIC DEFAULT NULL,
  UNIQUE(template_id, option_id)
);

ALTER TABLE template_options ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "template_options_select" ON template_options FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "template_options_all" ON template_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_documents (PDF tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  template_used TEXT DEFAULT 'celebration-elegance',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_documents_select" ON proposal_documents FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_documents_all" ON proposal_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_tokens (client access tokens for public portal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  viewed_at TIMESTAMPTZ,
  pdf_downloaded_at TIMESTAMPTZ,
  payment_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_tokens_select" ON proposal_tokens FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_tokens_all" ON proposal_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_proposal_tokens_token ON proposal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_proposal_tokens_proposal ON proposal_tokens(proposal_id);

-- ============================================================================
-- TABLE: proposal_outcomes (learning data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  ai_confidence_tier confidence_tier_enum,
  was_modified BOOLEAN DEFAULT false,
  modifications JSONB DEFAULT '[]',
  time_to_decision_hours NUMERIC,
  final_amount NUMERIC(10,2),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_outcomes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_outcomes_select" ON proposal_outcomes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_outcomes_all" ON proposal_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_emails (email send tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  email_provider_id TEXT,
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_emails ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_emails_select" ON proposal_emails FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_emails_all" ON proposal_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_revisions (snapshot history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  revision_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, revision_number)
);

ALTER TABLE proposal_revisions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_revisions_select" ON proposal_revisions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_revisions_all" ON proposal_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'tag',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proposal_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_tags_manage" ON proposal_tags FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_tags_view" ON proposal_tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: proposal_tag_assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES proposal_tags ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, tag_id)
);

ALTER TABLE proposal_tag_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "proposal_tag_assignments_select" ON proposal_tag_assignments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_tag_assignments_all" ON proposal_tag_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: user_settings (business config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  business_name TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  item_label TEXT DEFAULT 'designs',
  allow_item_removal BOOLEAN DEFAULT true,
  ai_master_prompt TEXT DEFAULT '',
  minimum_orders JSONB DEFAULT '{"Birthday":300,"Corporate":500,"Wedding":500,"Other":300}',
  surcharges JSONB DEFAULT '[{"label":"Delivery Fee","value":50,"enabled":true},{"label":"Weekend Premium","value":15,"enabled":false,"isPercent":true},{"label":"Rush Order","value":20,"enabled":false,"isPercent":true}]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "user_settings_select" ON user_settings FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: chat_conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "chat_conversations_select" ON chat_conversations FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "chat_conversations_insert" ON chat_conversations FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "chat_conversations_delete" ON chat_conversations FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: chat_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-pdfs', 'proposal-pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images
DO $$ BEGIN
  CREATE POLICY "product_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "product_images_update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policies for proposal-pdfs
DO $$ BEGIN
  CREATE POLICY "proposal_pdfs_select" ON storage.objects FOR SELECT USING (bucket_id = 'proposal-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "proposal_pdfs_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'proposal-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policies for chat-uploads
DO $$ BEGIN
  CREATE POLICY "chat_uploads_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "chat_uploads_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- REALTIME (optional - enable for live updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_line_items;
