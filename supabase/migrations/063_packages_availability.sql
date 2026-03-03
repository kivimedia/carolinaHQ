-- Migration 063: Packages, set-asides, delivery zones, saved filters

-- Inventory packages (bundles)
CREATE TABLE inventory_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  contract_description TEXT,
  ecommerce_description TEXT,
  ecommerce_same_as_contract BOOLEAN NOT NULL DEFAULT true,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_required BOOLEAN NOT NULL DEFAULT false,
  contents_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items in packages (junction)
CREATE TABLE inventory_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES inventory_packages(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nested packages (packages within packages)
CREATE TABLE inventory_package_nested_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_package_id UUID NOT NULL REFERENCES inventory_packages(id) ON DELETE CASCADE,
  child_package_id UUID NOT NULL REFERENCES inventory_packages(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Package accessories
CREATE TABLE inventory_package_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES inventory_packages(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_included BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item accessories
CREATE TABLE inventory_item_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  accessory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Package file attachments
CREATE TABLE package_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES inventory_packages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set-asides (temporary inventory holds outside of projects)
CREATE TABLE set_asides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery zones
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_mile_rate NUMERIC(10,2),
  minimum_fee NUMERIC(10,2),
  zip_codes TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved inventory filters
CREATE TABLE saved_inventory_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_package_items_package ON inventory_package_items(package_id);
CREATE INDEX idx_package_items_item ON inventory_package_items(inventory_item_id);
CREATE INDEX idx_set_asides_item ON set_asides(inventory_item_id);
CREATE INDEX idx_set_asides_dates ON set_asides(start_date, end_date);
CREATE INDEX idx_saved_filters_user ON saved_inventory_filters(user_id);

-- RLS
ALTER TABLE inventory_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_package_nested_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_package_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_asides ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_inventory_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage inventory_packages" ON inventory_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage inventory_package_items" ON inventory_package_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage inventory_package_nested_packages" ON inventory_package_nested_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage inventory_package_accessories" ON inventory_package_accessories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage inventory_item_accessories" ON inventory_item_accessories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage package_files" ON package_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage set_asides" ON set_asides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage delivery_zones" ON delivery_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage own saved_inventory_filters" ON saved_inventory_filters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
