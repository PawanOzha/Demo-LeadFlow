---
name: chat-tracker-designer
description: Use this skill when implementing or extending any Chat Tracker UI so new screens match its exact visual tokens, component behavior, layout rhythm, and interaction style.
---

# Chat Tracker — Designer Skill

## Identity & Aesthetic
This UI is a clean, utility-analytics dashboard aesthetic: bright, airy, and data-forward with soft blue surfaces, thin borders, and restrained shadows. It feels operational and technical but still friendly through rounded geometry, compact typography, and emoji/symbol accents. The distinctive signature is a pale-blue gradient shell, mono-accented metrics, capsule badges with translucent tints, and dense table-driven workflows.

## Color System
Core semantic palette is defined in `src/App.jsx` as `C`:

| Semantic token | Hex / value | Typical usage |
|---|---|---|
| `bg` | `#eef4ff` | App-level background |
| `surface` | `#ffffff` | Panels, sidebar, headers, form controls |
| `card` | `#ffffff` | Card backgrounds |
| `card2` | `#f5f9ff` | Tinted elevated surfaces (tooltips/popovers) |
| `border` | `#d9e7ff` | Default borders/dividers |
| `dim` | `#e7f0ff` | Subtle table row separators |
| `accent` | `#2563eb` | Primary actions, key metric accents |
| `cyan` | `#1d4ed8` | Brand headline, team color fallback |
| `violet` | `#2563eb` | Metric accent alias (same as `accent`) |
| `green` | `#16a34a` | Success, completed state |
| `red` | `#dc2626` | Errors, destructive actions, alert states |
| `orange` | `#d97706` | Warning/ongoing and duration metrics |
| `text` | `#111827` | Primary text |
| `muted` | `#6b7280` | Secondary labels/help text |
| `label` | `#4b5563` | Mid-emphasis copy and UI labels |

Additional explicit colors in use:

| Color | Where |
|---|---|
| `#f6f9ff` | Top of main app gradient |
| `#f9fafb` | Table-row hover background |
| `#eaf0ff` | Active sidebar-tab background |
| `#ffffff` | Text on primary buttons/badges |
| `#07090f` | Error-boundary full-screen background |
| `#101828` | Error-boundary panel background |
| `#1c2e4a` | Error-boundary border |
| `#f87171` | Error-boundary heading text |
| `#8bacc8` | Error-boundary stack text |
| `#0000001f` | Notification popover shadow tint |
| `#00000055` | Admin dropdown shadow tint |
| `#1d4ed80f` | Default card shadow tint |

Derived alpha usage pattern:
- `${token}18` for soft tinted backgrounds (approx 9% alpha).
- `${token}30` or `${token}44` for soft border emphasis.
- `${token}80` for active border highlight.
- `${token}22` for focus ring-like glow.

Categorical palettes:
- `TEAM_COLORS`: `#2563eb`, `#7c3aed`, `#0d9488`, `#d97706`, `#db2777`, `#14b8a6`, `#4f46e5`, `#0891b2`
- `ANALYST_COLORS`: `#0ea5e9`, `#6366f1`, `#14b8a6`, `#f59e0b`, `#e11d48`, `#8b5cf6`, `#16a34a`, `#0284c7`

CSS custom properties:
- Active app UI does **not** use a CSS-variable token system; styles are inline JS objects using `C`.
- Legacy file `src/App.css` references these properties: `--accent`, `--accent-bg`, `--accent-border`, `--border`, `--text-h`, `--social-bg`, `--shadow`.

## Typography
Font import source (exact):
- `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`

Font families:
- Sans UI font: `"'DM Sans', sans-serif"` (`SANS`)
- Monospace data font: `"'JetBrains Mono', monospace"` (`MONO`)

Type scale used in production UI:

| Size | Weight(s) | Line-height | Typical usage |
|---|---|---|---|
| `10px` | `700` | default | Notification counter |
| `11px` | `600`, `700` | default | Uppercase labels, table headers, section labels |
| `11.5px` | normal | default | Micro success/help messages |
| `12px` | normal, `600` | `1.5` in some contexts | Helper text, compact body, badges support |
| `12.5px` | normal | default | Auxiliary controls and metadata |
| `13px` | `600` | default | Password toggle, small controls |
| `13.5px` | `500`, `600` | default | Base form/control size |
| `14px` | normal | default | Global shell base size |
| `15px` | normal | default | Loading text |
| `16px` | `700` | default | Secondary headings/user name |
| `18px` | `700` | `1` in metric context | KPI values (small), logo text contexts |
| `20px` | `700` | default | Login title |
| `26px` | `700` | `1` | KPI primary values |
| `44px` | `700` | `1.02` | Main page title |
| `48px` | normal | default | Empty-state icon scale |

Letter spacing values:
- `1.5px`, `1.3px`, `1px`, `0.8px` for uppercase metadata labels.
- `-0.3px` for sidebar brand wordmark.

Heading hierarchy rules:
- H1-like: current tab title at `44px/700`.
- Section headers: uppercase micro label at `11px/700` with letter-spacing.
- Card titles: often `16px/700` when not using section-label pattern.
- Data values (KPIs): mono `26px/700`; preview metrics `18px/700`.

## Spacing System
Base spacing behavior:
- Not tokenized formally, but follows a near-4px rhythm (`4, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32`).
- Most major gaps/padding are 12–24px; shells use 24–32px.

Common spacing values:
- Card paddings: `"18px 22px"`, `"20px 24px"`, `"20px 22px"`, `"24px 26px"`, `"28px 30px"`, `"28px 32px"`.
- Input padding: default `"9px 13px"`; dense controls `"7px 10px"`.
- Button paddings:
  - primary default: `"10px 22px"`
  - ghost small: `"6px 12px"` to `"7px 12px"`
  - compact action: `"8px 14px"` / `"9px 14px"` / `"9px 16px"`
- Table cell padding:
  - `TH`: `"10px 14px"`
  - `TD`: `"10px 14px"`
  - compact action cells: `"8px 14px"` / `"12px 14px"`
- Main content wrapper: `"24px 28px"`.
- Sidebar wrapper: `"16px 12px"`.
- Top header bar: `"14px 24px"`.

## Component Patterns

### Buttons
Primary variant (`btn("primary")`):
- Background `C.accent` (`#2563eb`), text `#fff`, no border.
- Radius `8px`, font `13.5px/600`, padding default `"10px 22px"`.
- Hover is global opacity reduction (`button:hover { opacity: 0.85; }`).

Ghost variant (`btn("ghost")`):
- Transparent bg, text `C.muted`, border `1px solid C.border`.
- Same base radius/typography; frequently used for utility actions.

Danger variant (`btn("danger")`):
- Transparent background, red text, soft red border in-context (`${C.red}44` or `${C.red}30`).

Micro state patterns:
- Disabled behavior relies on native `disabled` with no custom disabled color system.
- Icon-only notification button uses ghost base, fixed `40x40`, radius `10`.

### Cards
Card primitive from `card()`:
- Background `C.card` (`#fff`)
- Border `1px solid C.border`
- Radius `14px`
- Default shadow `0 8px 20px #1d4ed80f`

Card usage tiers:
- Standard content cards: 20–24px internal padding.
- KPI cards: tighter `"18px 22px"`.
- Popover/dropdown cards: stronger shadow (`0 12px 28px #0000001f` or `0 10px 24px #00000055`), often tinted `C.card2`.

### Forms
Input primitive from `input()`:
- Background `C.surface`, border `1px solid C.border`, radius `8px`.
- Padding `"9px 13px"`, font `13.5px`, full width.
- Focus state global CSS: border `C.accent`, halo `0 0 0 3px ${C.accent}18`.

Textarea behavior:
- Uses input primitive with `minHeight` (`52`, `65`, or `70`) and `resize: vertical`.

Labeling pattern:
- Labels above fields, uppercase micro-label style (`11px`, `600`, `letterSpacing: 1`).
- Validation feedback is inline text below actions, mostly `12px` red/green.

### Navigation
Overall shell:
- Full viewport height (`100vh`) with fixed left sidebar + flexible right content column.
- Shell background linear gradient: `linear-gradient(180deg, #f6f9ff 0%, #eef4ff 100%)`.

Sidebar:
- Width `240px`, white surface, right border.
- Tab buttons are text-first with symbol icon prefix, radius `10px`.
- Active tab state: bg `#eaf0ff`, text `C.cyan`, weight `600`; inactive uses `C.muted`.

Top header:
- White bar with bottom border.
- Left: large active page title + subtitle.
- Right: notification popover trigger, role/name, logout ghost button.

### Feedback (badges, alerts, toasts)
Badges:
- Pill shape radius `20` or `999`.
- Padding around `3px 8-10px`.
- Colorized using alpha tint formula:
  - bg `${color}18`
  - border `1px solid ${color}30`
  - text `color`

Status mapping:
- Completed -> `C.green`
- Awaiting reply -> `C.red`
- Ongoing -> `C.orange`

Inline alerts:
- Error text `C.red`, success `C.green`, helper `C.muted`/`C.label`.
- No dedicated toast system; transient notices are inline messages toggled by state.

## Layout System
Primary layout model:
- Mobile behavior is minimal; UI is effectively desktop-optimized.
- Composition uses both Flexbox and CSS Grid.
- Grid patterns:
  - KPI area: `repeat(auto-fit, minmax(210px, 1fr))`
  - Secondary KPI/charts: `minmax(280px, 1fr)`, `minmax(360px, 1fr)`, `minmax(420px, 1fr)`
  - Form rows: fixed fractions (`1fr 1fr 1fr`, `1fr 1fr`, `repeat(4, 1fr)`)

Table system:
- Border-collapse tables, uppercase header row, dense cells, overflow-x wrapper.
- Record table minimum width behavior for admin: `minWidth: 980`.

Max widths / centering:
- Main authenticated app intentionally full-width (`maxWidth: "none"`).
- Auth card max width `430px`.
- Error/boot fallback cards max width `560–760px`.

Breakpoints:
- No app-specific breakpoint token map in active UI.
- Legacy `src/App.css` includes `@media (max-width: 1024px)` patterns.
- Strategy is largely desktop-first in current implementation.

## Motion & Animation
Animation is subtle and quick; no Framer Motion.

Transition timings and easing in code:
- `.15s` transitions on button opacity and control borders.
- `.1s` row background transition.
- `.2s ease` for admin dropdown arrow rotation.
- `all .15s` for nav-item state shift.

Motion style:
- Snappy micro-interactions (<200ms), no page transitions, no spring physics.
- Scrollbars custom-styled (5px) for reduced visual noise.

## Iconography
Icon system style:
- No external icon package (no Lucide/Heroicons/Radix).
- Uses Unicode symbols and emoji directly in UI copy/buttons:
  - Nav: `◈`, `＋`, `≡`, `✎`, `⚙`, `◎`
  - Feedback/actions: `🔔`, `✓`, `✕`, `❌`, `📭`, `⬡`, `⏱`, `🙈`, `👁`

Icon sizing conventions:
- Inline symbol text usually `12–18px`.
- Notification bell `16px`.
- Logo image icon is `24x24`, radius `6`.

Assets:
- Primary brand mark: `/chat-tracker-logo.svg`.
- Additional static assets present: `/favicon.svg`, `/icons.svg`.

## Dark Mode
No dark mode theme system exists for main app surfaces.
- Primary UI is light-only with pale-blue background + white surfaces.
- A dark-styled fallback exists only for render-crash boundary in `main.jsx` (`#07090f` background, dark card), but this is not a user-toggle theme.

## Do's and Don'ts
- Do keep card-based surfaces white with thin blue borders and rounded corners (8/10/14px tiers).
- Do preserve the dual-font strategy: DM Sans for UI copy, JetBrains Mono for metrics, IDs, and temporal values.
- Do use uppercase micro-labels (`11px`, spaced letters) for sections and field labels.
- Do color semantic states exactly (`green` success, `red` error/awaiting, `orange` ongoing, `accent/cyan` primary analytics).
- Do keep interactions lightweight with short opacity/border transitions (~150ms).
- Don’t introduce saturated dark backgrounds or heavy shadows in standard views.
- Don’t replace capsule badges with flat text labels; badge tinting is a core visual cue.
- Don’t introduce third-party icon packs unless replacing all symbol-based iconography consistently.

## Replication Checklist
1. Initialize a React app with Vite and implement global reset (`box-sizing`, full-height root, antialiasing).
2. Add Google Fonts import exactly for DM Sans and JetBrains Mono from the specified URL.
3. Create a JS token object matching `C` with exact hex values, plus `TEAM_COLORS` and `ANALYST_COLORS`.
4. Implement primitives: `card()`, `input()`, `btn()` exactly (radius, paddings, transitions, colors).
5. Build shell layout: `100vh` app, 240px sidebar, top header, scrollable content pane, gradient app background.
6. Recreate navigation tab styling (symbol + label, active `#eaf0ff`, 10px radius, `.15s` transitions).
7. Implement badge system using `${color}18` backgrounds and `${color}30` borders for status/team/analyst chips.
8. Recreate form conventions: 11px uppercase labels, 13.5px controls, focus ring `0 0 0 3px ${accent}18`.
9. Build table styles with `TH`/`TD` spacing (`10px 14px`), uppercase headers, hover `#f9fafb`, mono numeric cells.
10. Reproduce KPI and chart cards using Recharts, with the specified grid layouts and per-series color rules.
11. Add notification popover behavior and inline success/error feedback (no toast framework).
12. Keep light-theme-only surfaces; include optional crash-only dark fallback panel, not a full theme toggle.

