# Responsive Manager and Admin Views

## Goal
Make the Manager queue, Manager expense detail, Admin dashboard, and shared header comfortable and reliable on phones, tablets, and desktops without changing expense logic.

## Changes
- Rework the shared header into a mobile-safe grid with truncation, touch-sized navigation, and wrapping that cannot clip the account controls.
- Make Manager queue cards use mobile-first spacing, wrap long names and badges, and stack all four actions into stable full-width touch targets on narrow screens.
- Make Manager detail fields, AI analysis, comment area, status badges, and decision actions stack cleanly; prevent long emails, receipt names, and notes from causing overflow.
- Keep Admin metrics and category bars fluid, stack search/export controls on phones, and give the records table a deliberate horizontal scroll area with a practical minimum width.
- Use the existing button design component for interactive actions while preserving the current visual hierarchy and decision colors.
- Adjust shared dialog sizing only if the existing shared dialog styles can overflow a phone viewport.

## Validation
- Check `/manager`, a `/manager/$id` detail route, and `/admin` at phone, tablet, and desktop widths.
- Confirm there is no page-level horizontal overflow, touch targets remain usable, table scrolling stays contained, and existing decisions/search still work.
- Confirm the app builds cleanly and each content route retains complete page metadata.

## Technical details
- Use mobile-first Tailwind utilities, `min-w-0`, `shrink-0`, grid-based mixed-content rows, `overflow-wrap`, and contained `overflow-x-auto` regions.
- Keep all data fetching, role checks, Airtable status updates, and expense calculations unchanged.
