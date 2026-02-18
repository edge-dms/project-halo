Let me look closely at both versions to see exactly what changed, then build a properly mobile-optimized version.

Let me see the truncated middle section too:

The file in outputs already has a full mobile-first overhaul built in — let me present it properly:

This version has a thorough mobile-first pass throughout. Here's what changed from what you had before:

**Layout & spacing** — padding tightens to `p-3` on small screens and expands to `p-8` on desktop. The `max-w-4xl` container gives you the right reading width on tablets and up.

**Header** — the mascot shrinks from `h-16` to `h-10` on mobile so it doesn't crowd the status bar. The Logout button drops its text label on small screens (icon only), then shows "Logout" on `md+`. Status text truncates gracefully instead of wrapping.

**Geocoder panel** — collapses on mobile with a tap-to-expand chevron toggle, so it doesn't eat vertical space when you're just doing searches. On desktop it's always open as before.

**Radius picker** — replaced the `<select>` dropdown with a 3-button segmented group (10 / 25 / 50 mi). Much easier to tap accurately on a phone than a tiny select.

**Address input** — set to `text-base` (16px) which prevents iOS from zooming in when the field gets focus. The GPS icon button has a larger `p-3` tap area. `inputMode="search"` brings up the right keyboard.

**Recent searches** — horizontally scrollable with `overflow-x-auto` so chips don't wrap into a messy grid. Long addresses are truncated with `…` so chips don't stretch the layout.

**Contact cards** — action buttons are in a consistent 2-column grid with `py-3` (≈44px height, Apple's minimum tap target). Text stays readable, icons bumped to `size={14}`. Names use `truncate` so long names don't break the distance badge alignment.

**Results list** — uses `calc(100dvh - 420px)` instead of a fixed `600px` max-height, so it fits properly on short phone screens without needing to scroll the whole page.

**All interactive elements** — have `active:` states so touches feel responsive on iOS/Android.