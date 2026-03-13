-- Migration 075: Proposal-Poppers v2 features
-- Adds: background removal support, option images, slug fields, anonymous RLS policies

-- 1. Background removal: nobg_url on product_images
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS nobg_url text DEFAULT NULL;

-- 2. Option cover images
ALTER TABLE public.proposal_options ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- 3. Pretty URL slugs
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS slug text DEFAULT '';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS url_slug text DEFAULT '';

-- 4. Anonymous RLS policies for public proposal links (no login required)

-- Allow anonymous users to view proposals via public links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_proposals' AND tablename = 'proposals'
  ) THEN
    CREATE POLICY anon_view_proposals ON public.proposals FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anonymous users to accept proposals (update status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_accept_proposals' AND tablename = 'proposals'
  ) THEN
    CREATE POLICY anon_accept_proposals ON public.proposals FOR UPDATE TO anon
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Allow anonymous users to view user_settings (for branding on public proposals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_user_settings' AND tablename = 'user_settings'
  ) THEN
    CREATE POLICY anon_view_user_settings ON public.user_settings FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anonymous users to view line items on public proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_line_items' AND tablename = 'proposal_line_items'
  ) THEN
    CREATE POLICY anon_view_line_items ON public.proposal_line_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anonymous users to view proposal options
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_options' AND tablename = 'proposal_options'
  ) THEN
    CREATE POLICY anon_view_options ON public.proposal_options FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anonymous users to view option items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_option_items' AND tablename = 'proposal_option_items'
  ) THEN
    CREATE POLICY anon_view_option_items ON public.proposal_option_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anonymous users to view product images (for public proposal display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_view_product_images' AND tablename = 'product_images'
  ) THEN
    CREATE POLICY anon_view_product_images ON public.product_images FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 5. Ensure product-images storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
