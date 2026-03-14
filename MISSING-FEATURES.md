# CarolinaHQ - Missing Features (PRD Gaps)

> Last updated: 2026-03-14
> Reference: `C:\Users\raviv\CarolinaHQ the real deal\Carolina-Balloons-HQ-PRD.md`

## Gap 1: Auto-response draft not wired to triage (S5)
- **Severity**: MEDIUM
- **Status**: DONE (commit 32a92ab)
- **Details**: Wired `draftInitialResponse()` into `triageLead()` as fire-and-forget Step 6. AI draft stored as card comment, admins notified.

## Gap 2: Follow-up pipeline view (S7)
- **Severity**: LOW
- **Status**: DONE (commit 0df281d)
- **Details**: Created `/follow-ups` page with stats bar (Overdue/Today/Upcoming/Total), filter tabs, and clickable card rows that navigate to the board. Added sidebar nav link. Uses `getUpcomingFollowUps()` from follow-up engine.

## Gap 3: Capacity badges on Kanban cards (S15)
- **Severity**: LOW
- **Status**: DONE (commit 6cdea32)
- **Details**: Added "Busy" (orange) and "Far" (purple) badges to board cards. Busy = 2+ events on the same date across the board. Far = venue_city outside Charlotte metro LOCAL_CITIES list. Computed client-side from loaded board data, no extra API calls.

## Gap 4: Friendor email send button in Venue UI (S9)
- **Severity**: LOW
- **Status**: DONE (commit 2f75974)
- **Details**: Replaced hardcoded friendor email with AI-powered `draftFriendorEmail()`. Editable preview modal with subject/body before creating Gmail draft. New API at `/api/venues/[id]/friendor-draft`.

## Gap 5: Mobile audit cleanup (S26)
- **Severity**: MEDIUM
- **Status**: DONE (2026-03-14)
- **Details**: All 25 MOBILE_AUDIT.md items reviewed. 23 fully fixed, 2 marked acceptable (tiny badge fonts, card tap targets). Added `overflow-x-auto` to DidntBookAnalytics table. MOBILE_AUDIT.md updated with full status.

---

## Not In Scope (Deferred)
- Invoice creation flow / QuickBooks integration - Halley creates invoices manually in QuickBooks. Not needed for launch.
- Didn't-book reason controlled dropdown - DB fields exist, may already be handled by card modal custom fields.
