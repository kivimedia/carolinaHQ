-- Migration 070: Add image_url column to product_catalog
-- Stores external image URLs from CarolinaBalloons.com WooCommerce catalog

ALTER TABLE product_catalog
  ADD COLUMN IF NOT EXISTS image_url TEXT;
