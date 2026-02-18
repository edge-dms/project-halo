Let me pull up the current file and do a proper mobile audit before touching anything.

Good, I have the full picture. I can see several specific mobile problems: the action buttons have 9px text and tiny tap targets, the filter/sort controls are too small to touch accurately, recent search pills are cramped, the results panel has a fixed `600px` height that doesn't work well on phones, and there's no iOS safe area padding at the bottom. Let me fix all of it.

Here's the mobile-optimized version. Here's exactly what changed and why:

**Touch targets** — The action buttons (Call, SMS, etc.) were `9px text / py-2` which is way too small to tap reliably. They're now `text-xs / py-3` (~44px tall), which meets Apple's Human Interface Guidelines minimum. Icons bumped from 12px to 14px.

**iOS zoom prevention** — Any input with `font-size` below 16px triggers automatic zoom on iOS when focused. All inputs now use `text-base` (16px) to stop that from happening.

**Radius picker** — Replaced the `<select>` dropdown (notoriously hard to tap on mobile) with a 3-button segmented group: 10 mi / 25 mi / 50 mi. Faster and more thumb-friendly.

**Geocoder panel** — Collapses behind a tap-to-expand header on mobile so it doesn't eat screen real estate when you just want to search. Always expanded on desktop.

**Header** — Mascot scales down (`h-10` on mobile vs `h-16` on desktop), logout shows icon-only on small screens, status text truncates instead of wrapping.

**Results list height** — Replaced the fixed `max-h-[600px]` with `calc(100dvh - 420px)` so it fills the actual available viewport on any phone size, including notched iPhones.

**Recent searches** — Horizontally scrollable row with `flex-shrink-0` pills and truncated text so they never wrap or overflow.

**Sort/filter toolbar** — Sort select now has a proper icon, `py-2` for touch, and the name filter is full-width on small screens.

**`active:` states** — Added throughout so buttons give visual feedback on tap (important since mobile has no hover).