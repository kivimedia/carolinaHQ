-- Migration 073: Add image_url to templates and options
-- Allows product images to be displayed on template and option cards

ALTER TABLE proposal_templates ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE proposal_options ADD COLUMN IF NOT EXISTS image_url TEXT;
