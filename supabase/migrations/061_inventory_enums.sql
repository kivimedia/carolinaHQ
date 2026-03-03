-- Migration 061: Inventory system enums
-- Part of the Inventory-Plus port into CarolinaHQ

-- Inventory item type enum
CREATE TYPE inventory_item_type AS ENUM (
  'product',
  'service',
  'discount',
  'delivery_logistics',
  'in_store_logistics',
  'vehicle'
);

-- Rental project status enum
CREATE TYPE rental_project_status AS ENUM (
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'archived',
  'quote_sent',
  'signed',
  'billing',
  'lost',
  'action_needed'
);

-- Policy type enum
CREATE TYPE rental_policy_type AS ENUM (
  'payment',
  'cancellation',
  'terms',
  'receipt_agreement'
);
