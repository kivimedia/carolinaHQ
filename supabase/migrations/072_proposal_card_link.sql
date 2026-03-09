-- Migration 072: Link proposals to cards (leads) bidirectionally
-- Enables: create proposal from card, show proposal status on card, sync statuses

-- Add card_id to proposals (link proposal to a lead/card)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES cards ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_card ON proposals(card_id);

-- Add latest_proposal_id to cards (quick access to most recent proposal)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS latest_proposal_id UUID REFERENCES proposals ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cards_latest_proposal ON cards(latest_proposal_id);
