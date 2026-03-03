-- Migration 062: Core inventory tables
-- Categories, items, images, attributes

-- Inventory categories (hierarchical)
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Main inventory items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  web_description TEXT,
  contract_description TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  buffer_quantity INTEGER NOT NULL DEFAULT 0,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_type TEXT DEFAULT 'per_day',
  item_type inventory_item_type NOT NULL DEFAULT 'product',
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  location TEXT,
  internal_notes TEXT,
  notes TEXT,
  tags TEXT[],
  -- Pricing tiers
  purchase_price NUMERIC(10,2),
  purchase_price_ecommerce BOOLEAN DEFAULT false,
  flat_fee_price NUMERIC(10,2),
  flat_fee_price_ecommerce BOOLEAN DEFAULT false,
  hourly_base_rate NUMERIC(10,2),
  hourly_additional_rate NUMERIC(10,2),
  hourly_min_rental_period INTEGER,
  hourly_price_ecommerce BOOLEAN DEFAULT false,
  one_day_price NUMERIC(10,2),
  one_day_price_ecommerce BOOLEAN DEFAULT false,
  three_day_price NUMERIC(10,2),
  three_day_price_ecommerce BOOLEAN DEFAULT false,
  weekly_price NUMERIC(10,2),
  weekly_price_ecommerce BOOLEAN DEFAULT false,
  monthly_price NUMERIC(10,2),
  monthly_price_ecommerce BOOLEAN DEFAULT false,
  percent_of_order NUMERIC(5,2),
  percent_of_line_item_group NUMERIC(5,2),
  mileage_rate NUMERIC(10,2),
  minimum_fee NUMERIC(10,2),
  -- Buffer times
  pre_buffer_time INTEGER,
  post_buffer_time INTEGER,
  -- Soft delete
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item images (multiple per item)
CREATE TABLE inventory_item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item custom attributes (key-value pairs)
CREATE TABLE inventory_item_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_client_visible BOOLEAN DEFAULT true,
  is_on_pullsheet BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attribute templates (reusable attribute definitions)
CREATE TABLE inventory_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  options TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global inventory settings
CREATE TABLE inventory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_return_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_return_days INTEGER NOT NULL DEFAULT 1,
  auto_return_status TEXT NOT NULL DEFAULT 'available',
  return_requires_confirmation BOOLEAN NOT NULL DEFAULT true,
  auto_update_available_quantity BOOLEAN NOT NULL DEFAULT true,
  pre_buffer_time INTEGER NOT NULL DEFAULT 0,
  post_buffer_time INTEGER NOT NULL DEFAULT 0,
  buffer_time_unit TEXT NOT NULL DEFAULT 'hours',
  default_project_buffer INTEGER NOT NULL DEFAULT 0,
  apply_buffer_to_all_items BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-category buffer settings
CREATE TABLE category_buffer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE UNIQUE,
  buffer_quantity INTEGER NOT NULL DEFAULT 0,
  buffer_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  use_percentage BOOLEAN NOT NULL DEFAULT false,
  pre_buffer_time INTEGER NOT NULL DEFAULT 0,
  post_buffer_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_archived ON inventory_items(archived_at);
CREATE INDEX idx_inventory_item_images_item ON inventory_item_images(inventory_item_id);
CREATE INDEX idx_inventory_item_attrs_item ON inventory_item_attributes(inventory_item_id);

-- RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_attribute_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_buffer_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all inventory data
CREATE POLICY "Authenticated users can read inventory_categories" ON inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_items" ON inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_item_images" ON inventory_item_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_item_attributes" ON inventory_item_attributes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_attribute_templates" ON inventory_attribute_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read inventory_settings" ON inventory_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read category_buffer_settings" ON category_buffer_settings FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can manage inventory_categories" ON inventory_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_items" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_item_images" ON inventory_item_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_item_attributes" ON inventory_item_attributes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_attribute_templates" ON inventory_attribute_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_settings" ON inventory_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage category_buffer_settings" ON category_buffer_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
