# CarolinaHQ - Missing Features (PRD Gaps)

> Last updated: 2026-03-14
> Reference: `C:\Users\raviv\CarolinaHQ the real deal\Carolina-Balloons-HQ-PRD.md`

## Gap 1: Auto-response draft not wired to triage (S5)
- **Severity**: MEDIUM
- **Status**: TODO
- **Details**: `draftInitialResponse()` exists in `src/lib/ai/email-drafter.ts` but `triageLead()` in `src/lib/lead-triage.ts` does not call it. New leads go through triage but no auto-response email draft is generated.
- **Fix**: Wire `draftInitialResponse()` call at the end of `triageLead()`, store the draft, and surface it for approval.

## Gap 2: Follow-up pipeline view (S7)
- **Severity**: LOW
- **Status**: TODO
- **Details**: No dedicated page/view to see all cards needing follow-up. The `follow-up-engine.ts` and cron job exist, but follow-ups only surface as push notifications. There's no "all follow-ups" dashboard where Halley can see every card with a pending `follow_up_date`.
- **Fix**: Create a `/follow-ups` page with a table/list of all cards that have `follow_up_date` set, grouped by overdue/today/upcoming.

## Gap 3: Capacity badges on Kanban cards (S15)
- **Severity**: LOW
- **Status**: TODO
- **Details**: The capacity engine (`src/lib/capacity-engine.ts`) computes Busy Weekend and Far Location flags, and the API exists at `/api/capacity/[date]`. But no badge/indicator appears on Kanban cards to show these flags.
- **Fix**: In `BoardCard.tsx`, fetch capacity data for cards with `event_date` and show small "Busy" / "Far" badges.

## Gap 4: Friendor email send button in Venue UI (S9)
- **Severity**: LOW
- **Status**: TODO
- **Details**: `draftFriendorEmail()` exists in `email-drafter.ts` and `friendor_email_sent` flag exists in the venues table. But the Venue list UI (`VenueListView.tsx`) has no "Send Friendor Email" button or flow.
- **Fix**: Add a "Send Intro Email" action button on venue rows where `friendor_email_sent = false`. Draft the email, show preview, send on approval, update the flag.

## Gap 5: Mobile audit cleanup (S26)
- **Severity**: MEDIUM
- **Status**: IN PROGRESS (some fixes applied 2026-03-14)
- **Details**: `MOBILE_AUDIT.md` documents 25 issues. Classic table components and public proposal page were fixed on 2026-03-14. Need to verify which issues remain open.
- **Fix**: Review MOBILE_AUDIT.md, mark resolved items, fix remaining items.

---

## Not In Scope (Deferred)
- Invoice creation flow / QuickBooks integration - Halley creates invoices manually in QuickBooks. Not needed for launch.
- Didn't-book reason controlled dropdown - DB fields exist, may already be handled by card modal custom fields.
