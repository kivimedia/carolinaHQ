// Inventory system TypeScript types
// These map to the Supabase tables created in migrations 061-068

export type InventoryItemType = 'product' | 'service' | 'discount' | 'delivery_logistics' | 'in_store_logistics' | 'vehicle';

export type RentalProjectStatus =
  | 'draft' | 'confirmed' | 'in_progress' | 'completed'
  | 'cancelled' | 'archived' | 'quote_sent' | 'signed'
  | 'billing' | 'lost' | 'action_needed';

export type PolicyType = 'payment' | 'cancellation' | 'terms' | 'receipt_agreement';

export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  web_description: string | null;
  contract_description: string | null;
  status: string;
  quantity: number;
  available_quantity: number;
  buffer_quantity: number;
  rate: number;
  rate_type: string | null;
  item_type: InventoryItemType;
  category_id: string | null;
  sub_category_id: string | null;
  image_url: string | null;
  location: string | null;
  internal_notes: string | null;
  notes: string | null;
  tags: string[] | null;
  // Pricing
  purchase_price: number | null;
  flat_fee_price: number | null;
  hourly_base_rate: number | null;
  hourly_additional_rate: number | null;
  hourly_min_rental_period: number | null;
  one_day_price: number | null;
  three_day_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  percent_of_order: number | null;
  mileage_rate: number | null;
  minimum_fee: number | null;
  // Buffers
  pre_buffer_time: number | null;
  post_buffer_time: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: InventoryCategory;
  sub_category?: InventoryCategory;
  images?: InventoryItemImage[];
}

export interface InventoryItemImage {
  id: string;
  inventory_item_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface InventoryItemAttribute {
  id: string;
  inventory_item_id: string;
  attribute_name: string;
  attribute_value: string;
  is_internal: boolean | null;
  is_client_visible: boolean | null;
  is_on_pullsheet: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryPackage {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  price: number;
  discount_type: string;
  discount_value: number;
  delivery_required: boolean;
  contents_locked: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  items?: InventoryPackageItem[];
}

export interface InventoryPackageItem {
  id: string;
  package_id: string;
  inventory_item_id: string;
  quantity: number;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface SetAside {
  id: string;
  inventory_item_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface DeliveryZone {
  id: string;
  name: string;
  base_rate: number;
  per_mile_rate: number | null;
  minimum_fee: number | null;
  zip_codes: string[] | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface RentalClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface RentalProject {
  id: string;
  name: string;
  client_id: string | null;
  status: RentalProjectStatus;
  start_date: string | null;
  end_date: string | null;
  setup_date: string | null;
  teardown_date: string | null;
  event_type: string | null;
  attendee_count: number | null;
  venue: string | null;
  venue_address: string | null;
  delivery_address: string | null;
  delivery_time: string | null;
  pickup_time: string | null;
  delivery_contact_name: string | null;
  delivery_contact_phone: string | null;
  internal_notes: string | null;
  notes: string | null;
  item_count: number | null;
  payment_count: number;
  subtotal: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  discount_amount: number | null;
  total: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: RentalClient;
}

export interface RentalProjectItem {
  id: string;
  project_id: string;
  name: string;
  inventory_item_id: string | null;
  package_id: string | null;
  quantity: number;
  rate: number;
  amount: number;
  category: string | null;
  description: string | null;
  item_type: string | null;
  is_service: boolean | null;
  line_item_group_id: string | null;
  display_order: number | null;
  created_at: string;
  inventory_item?: InventoryItem;
  fulfillment?: ProjectItemFulfillment;
}

export interface ProjectItemFulfillment {
  id: string;
  project_item_id: string;
  is_pulled: boolean;
  pulled_at: string | null;
  pulled_by: string | null;
  is_prepped: boolean;
  prepped_at: string | null;
  prepped_by: string | null;
  is_loaded: boolean;
  loaded_at: string | null;
  loaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalPayment {
  id: string;
  project_id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  status: string;
  paid_date: string | null;
  due_date: string | null;
  processing_fee: number | null;
  stripe_charge_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalPolicy {
  id: string;
  name: string;
  type: PolicyType;
  content: string;
  description: string | null;
  is_active: boolean | null;
  is_default: boolean | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  primary_color: string | null;
  timezone: string | null;
  default_delivery_rate: number | null;
  default_pickup_rate: number | null;
  minimum_delivery_fee: number | null;
  per_mile_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  jurisdiction: string | null;
  is_active: boolean | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface InventorySettings {
  id: string;
  auto_return_enabled: boolean;
  auto_return_days: number;
  auto_return_status: string;
  return_requires_confirmation: boolean;
  auto_update_available_quantity: boolean;
  pre_buffer_time: number;
  post_buffer_time: number;
  buffer_time_unit: string;
  default_project_buffer: number;
  apply_buffer_to_all_items: boolean;
  created_at: string;
  updated_at: string;
}
