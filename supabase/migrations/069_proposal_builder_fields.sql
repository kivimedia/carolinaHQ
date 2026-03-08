-- Add builder-specific fields to proposal_drafts for standalone proposals
ALTER TABLE proposal_drafts
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email_address TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_city TEXT,
  ADD COLUMN IF NOT EXISTS personal_note TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users;
