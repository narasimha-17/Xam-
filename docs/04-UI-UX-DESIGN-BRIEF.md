# Document 04 — UI/UX Design Brief

## Aesthetic
Dark glassmorphism, futuristic-but-clean — translucent frosted-glass panels floating over an ambient dark background with soft blurred glow blobs, on a warm near-black base (not cool navy). Loosely inspired by Whizlabs' structured exam-catalog/dashboard layout (card-based subject catalog, color-coded question palette during exams, stat-tile result summaries), rendered in this darker, more premium visual language rather than Whizlabs' actual bright/corporate look.

## Primary / Accent Color
**Amber → Orange gradient**: `#F59E0B` (amber, primary accent) → `#FB923C` (orange, gradient endpoint / soft variant). Used for primary buttons, active nav state, active question-palette ring, links, icon tiles, and the glow shadow on hover.
- `accent-dim`: `#B45309` (pressed/darker variant)
- This replaced an earlier indigo/violet (`#6366F1` / `#818CF8`) palette used during initial design — the amber/orange direction was chosen explicitly to feel closer to Whizlabs' warm, energetic brand.

## Background Color
`#14100C` — warm near-black base, with two large blurred radial-gradient blobs (amber and orange, ~28% opacity, 120px blur) fixed behind all content for ambient depth. A faint 44px grid overlay fades out toward the bottom of the viewport.

## Text Color
`#F5F1EC` (primary, warm off-white) / `#A8A29E` (muted) / `#78716C` (faintest, e.g. timestamps).

## Semantic Colors
`success`: `#22C55E` (green — correct answers, high scores). `danger`: `#EF4444` (red — incorrect answers, destructive actions, delete buttons). `warning`: `#EAB308` (golden yellow — deliberately distinct from the amber accent so "Draft" badges etc. don't read as an active/highlighted state).

## Font
`Space Grotesk` for headings/display text (h1–h4, stat numbers, logo wordmark), `Inter` for body text and UI labels. Both loaded from Google Fonts.

## Border Radius
Consistently rounded: `rounded-xl`/`rounded-2xl` (Tailwind) on cards, inputs, buttons, and modals — no sharp corners anywhere in the design system.

## Shadows / Glow
No conventional drop shadows. Instead, a custom `shadow-glow` / `shadow-glow-lg` token (a soft amber-tinted glow + 1px accent-colored border ring) appears on primary buttons and the active sidebar nav item, reinforcing the "glass panel with a light source" feel.

## Component Style
- **Cards** (`.glass` class): `rgba(34, 26, 19, 0.55)` background, `backdrop-filter: blur(16px)`, 1px translucent white border — semi-transparent so the ambient background glow shows through.
- **Buttons**: three variants — `primary` (gradient fill + glow), `outline` (bordered, transparent), `ghost` (text-only, hover background).
- **Inputs/Textarea/Select**: consistent dark-translucent fill, accent-colored focus ring.
- **Loader**: a custom two-layer animated ring (pulsing glow + spinning border) rather than a generic spinner — used both inline and full-page.
- **Modal**: centered, backdrop-blurred, Framer Motion fade+scale in/out.

## Dark/Light Mode
Dark only — no light mode toggle. This was an explicit early decision (mood options offered were all dark variants: neon cyberpunk, glassmorphism, or light-futuristic; glassmorphism dark was chosen).

## Reference Apps
Whizlabs (structural/functional reference: course-card catalog, color-coded exam question palette, stat-tile results) — but not its visual palette, which is much lighter/more corporate than Xam+'s actual dark-glass execution.

## Key UI Patterns
- **Card grid catalogs** (Subjects, Discussion subject-picker) with rotating gradient-tinted icon tiles per card for visual variety.
- **Inline contextual admin actions** rather than a separate admin section — "New subject," "Upload PDF," "New exam," publish/unpublish toggles all live directly on the page a student would also see.
- **Color-coded question palette** during exam-taking: neutral gray = unanswered, green-tinted = answered, accent ring = current question.
- **Score visualization**: a CSS `clip-path` ring (no charting library) for the percentage score, plus three stat tiles (Correct / Incorrect / Score%) on the results page, and horizontal score bars (green/amber/red by threshold) on the Progress page.
- **Collapsible sidebar**: icon-only collapsed state with tooltips, smooth width transition, state persisted across navigation and reloads.

## Mobile / Responsiveness
Grids use Tailwind responsive breakpoints (`sm:grid-cols-2 lg:grid-cols-3/4`) so card catalogs and stat tiles reflow on smaller screens. The sidebar itself is not yet adapted into a mobile bottom-nav or off-canvas drawer — this is a known gap, not a deliberate mobile-first design.

## Accessibility
Focus states use a visible accent-colored ring on inputs and interactive elements. Color is never the only signal for correctness (correct/incorrect also gets a check/X icon, not just green/red). Icon-only sidebar (collapsed state) uses `title` attributes for tooltips. Contrast was not formally audited against WCAG thresholds.
