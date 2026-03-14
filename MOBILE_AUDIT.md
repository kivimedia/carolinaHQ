# Mobile Responsiveness Audit - Carolina HQ

> Last updated: 2026-03-14
> All items resolved.

## Issue Table

| # | File | Issue | Status |
|---|------|-------|--------|
| 1 | `app/layout.tsx` | Missing viewport meta tag | FIXED - Has full viewport + PWA meta tags |
| 2 | `Sidebar.tsx` | No mobile drawer | FIXED - Mobile drawer with overlay, translate-x toggle |
| 3 | `Header.tsx` | No hamburger button | FIXED - Hamburger button `md:hidden` |
| 4 | `BoardHeader.tsx` | Controls overflow on mobile | FIXED - SearchBar hidden, quick-create shown, controls collapse |
| 5 | `SearchBar.tsx` | Too wide on mobile | FIXED - Responsive widths, hidden on mobile board header |
| 6 | `CardModal.tsx` | Properties panel overflow | FIXED - `w-full sm:w-72`, full-width on mobile |
| 7 | All pages | No mobile hamburger toggle | FIXED - Sidebar drawer + hamburger on all auth pages |
| 8 | `BoardList.tsx` | Kanban padding too wide | FIXED - `p-3 sm:p-6` responsive padding |
| 9 | `ListView.tsx` | Table overflow | FIXED - `overflow-auto` + responsive padding |
| 10 | `BoardHeader.tsx` | ViewSwitcher overflow | FIXED - Labels hidden on mobile, icons only |
| 11 | `DashboardContent.tsx` | Padding too wide | FIXED - `p-4 sm:p-6` |
| 12 | `BottomNavBar.tsx` | Content not padded | FIXED - Views use `pb-24` for clearance |
| 13 | `Modal.tsx` | Max-height too small | FIXED - `max-h-[92vh] sm:max-h-[88vh] md:max-h-[80vh]` |
| 14 | `BoardHeader.tsx` | Touch targets too small | ACCEPTABLE - Icons are 44px+ with padding |
| 15 | `settings/page.tsx` | Padding too wide | FIXED - `p-4 sm:p-6` |
| 16 | `BulkSelectToolbar.tsx` | Conflicts with BottomNavBar | FIXED - `overflow-x-auto`, `w-[calc(100vw-2rem)]` |
| 17 | `CreateBoardModal.tsx` | Form padding | FIXED - Inherits Modal responsiveness |
| 18 | `FilterDropdown.tsx` | Edge overflow | FIXED - `w-[min(16rem, calc(100vw-1rem))]` |
| 19 | `BoardCard.tsx` | Small tap targets | ACCEPTABLE - Card body is full clickable area |
| 20 | Analytics tables | No overflow-x | FIXED - Added `overflow-x-auto` + `min-w` |
| 21 | Team page | Layout breaks | FIXED - Responsive grid |
| 22 | `CalendarView.tsx` | Calendar grid overflow | FIXED - Mobile list view, grid hidden |
| 23 | `GanttView.tsx` | Gantt chart overflow | FIXED - `overflow-auto` + `overflow-x-auto` |
| 24 | All pages | Font sizes too small | ACCEPTABLE - `text-[10px]` used sparingly for badges |
| 25 | `ChatPanel.tsx` | Positioning on mobile | FIXED - Adapts to screen size |

## Classic Proposals Tables (added 2026-03-14)

All classic proposal tables (Dashboard, Products, Options, Templates) have `overflow-x-auto` wrappers and `hidden md:table-cell` for less important columns on mobile.

## Public Proposal Page

`FunPublicProposal.tsx` has responsive padding (`p-5 sm:p-8`), overflow-hidden on cards, and truncated product names.
