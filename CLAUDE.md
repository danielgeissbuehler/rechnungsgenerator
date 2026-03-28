# Rechnungsgenerator — Claude Context

Swiss invoice generator for **G Investments & Real Estates AG**.
Single-page app (Vite + vanilla JS ES modules, no framework), Supabase backend, Swiss QR Bill support.

---

## Tech Stack

| Layer       | Details                                                  |
|-------------|----------------------------------------------------------|
| Build       | Vite 6, vanilla JS ES modules                            |
| Styling     | Single CSS file: `src/css/styles.css`, CSS custom props  |
| Backend     | Supabase (Postgres + Auth) via `@supabase/supabase-js`   |
| PDF         | `html2canvas` + `jsPDF` — renders live DOM to PDF        |
| QR Bill     | `swissqrbill` v4 — appended as last A4 page              |
| Dev server  | `npm run dev` (Vite), `npm run build` for dist           |

---

## App Shell Layout

```
┌─────────────────────────────────────────────────────────┐
│  .db-topbar  (58px, always visible, two states below)   │
├────────────┬────────────────────────────────────────────┤
│  .sidebar  │  .db-main                                  │
│  232px     │  (dashboard content OR editor overlay)     │
│  (always   │                                            │
│  visible)  │                                            │
└────────────┴────────────────────────────────────────────┘
```

**The sidebar (`--sidebar-w: 232px`) is ALWAYS visible** — never hidden during view transitions.

### View switching

- `#view-dashboard` stays `display: flex` at all times.
- `#view-editor` is `position: fixed; top: 58px; left: var(--sidebar-w); right: 0; bottom: 0` — it overlays only the `db-main` column when open.
- `showEditor()` / `showDashboard()` in `src/js/dashboard.js` toggle `#view-editor` visibility and swap the topbar state.

### Editor modes (inside `#view-editor > .editor-inner`)

Two editor panels exist, toggled via `.simple-mode` on `#view-editor`:
- **`#editor`** — full editor (Vorlagen mode). `display: none` in simple-mode.
- **`#editor-simple`** — simplified editor (default for normal invoices). `flex: 1`, hidden unless simple-mode.

`showEditor(mode)` sets `simple-mode` for all modes except `'vorlage'`.

### Resize handle & preview scaling

- `#resize-handle` sits between the active editor and `#preview-wrap` in the flex row.
- `initResizeHandle()` in `ui.js` detects which editor is visible and sets its `style.width`.
- `scalePreview()` in `ui.js` computes `--editor-preview-scale` (fit A4 794px into available width). Called on drag, window resize, and editor open.
- CSS applies `transform: scale(var(--editor-preview-scale, 1))` to `.a4-page` inside the editor preview.

### Topbar states (inside `.db-topbar`)
- `#topbar-dash` — dashboard mode: title + search + "Neue Rechnung" button. Uses `display: contents` when active.
- `#topbar-editor` — editor mode: back button + invoice title. Uses `display: contents` when active.

---

## Source File Map

```
src/
  js/
    main.js        — Init, DOMContentLoaded, exposes all fns to window
    state.js       — Global mutable state object + constants (COL_DEFS, etc.)
    render.js      — buildPages() + render() — live invoice preview (HTML → DOM)
    dashboard.js   — View switching, invoice table, detail panel, status changes
    archiv.js      — bucheRechnung, speichereEntwurf, ladeAusArchiv, kopieRechnung
    pdf.js         — downloadPDF(): html2canvas → jsPDF from #preview-wrap .a4-page
    qrbill.js      — buildQRPage(): Swiss QR bill last page
    supabase.js    — All DB/auth calls (fetchRechnungen, saveRechnung, saveEntwurf, …)
    auth.js        — initAuth, handleLogin, handleLogout
    templates.js   — Vorlagen (load/save/delete, cloud + localStorage)
    contacts.js    — Absender + Empfänger CRUD
    columns.js     — Table column visibility and alignment
    positions.js   — addPosition() — adds a line item row
    meta.js        — toggleMetaField() — date/period/reference fields
    editor-simple.js — Einfacher Editor: fillSimpleEditor, syncField, addSimplePosition
    ui.js          — toggleSection, toggleVis, showTab, initResizeHandle, scalePreview
    rte.js         — Rich-text editor commands for textblocks
    utils.js       — Shared helpers
  css/
    styles.css     — All styles, single file, CSS custom properties in :root
index.html         — Full HTML including both views, all inline event handlers
supabase/
  schema.sql       — DB schema (run once in Supabase SQL editor)
  seed.sql         — Example seed data
  migration_v2_status.sql — Status column migration
  migration_rls_fix.sql   — RLS policies scoped to user_id = auth.uid() (run once)
```

---

## Invoice Rendering Pipeline

1. User edits form fields → `oninput="render()"`
2. `render()` in `render.js` calls `buildPages()` which reads all `#f-*` form fields
3. `buildPages()` generates A4 page HTML strings (794×1123px) with page-break logic
4. Pages are inserted into `#preview-wrap` via `setHTMLUnsafe()`
5. If QR Bill enabled: `buildQRPage()` appends a final page
6. PDF export: `html2canvas` captures each `.a4-page` element → `jsPDF` assembles

**Key rule**: The **detail panel** preview also uses `buildPages()` (called `buildPagesFromData(r.daten)`). This means both the editor preview and the detail panel use identical rendering code — do NOT create a second layout system.

---

## Supabase Data Model

| Table               | Key columns                                                        |
|---------------------|--------------------------------------------------------------------|
| `rechnungen`        | `id`, `nummer`, `absender_name`, `empfaenger_name`, `betrag`, `waehrung`, `daten` (JSONB), `status`, `user_id` |
| `absender`          | `id`, `name`, `header_name`, `header_email`, `strasse`, `ort`, `bank_name`, `bank_strasse`, `bank_ort`, `iban`, `start_nummer`, `user_id` |
| `empfaenger`        | `id`, `name`, `strasse`, `ort`, `user_id`                         |
| `vorlagen`          | `id`, `name`, `data` (JSONB), `user_id`                           |
| `rechnungs_counter` | `absender_name`, `user_id`, `aktuell` — atomic invoice numbering  |

Invoice status values: `entwurf` | `offen` | `versendet` | `bezahlt` | `storniert`

Draft invoices: `status = 'entwurf'`, `nummer = null`.
Booked invoices: `status = 'offen'`, `nummer` assigned via `naechste_rechnungsnummer()` RPC.

---

## State Object (`src/js/state.js`)

```js
state = {
  positions: [],            // line items
  posId: 0,                 // auto-increment for position IDs
  expandedPositions: Set,   // which position rows are expanded
  isReadonly: false,        // true when viewing a booked invoice
  currentDraftId: null,     // UUID of the open draft (if any)
  currentRechnungId: null,  // UUID of the booked invoice (if any)
  visibility: { ... },      // which sections/columns are shown
  colAlign: { ... },        // per-column text alignment
}
```

---

## CSS Conventions

- All custom properties defined in `:root` in `styles.css`
- Key vars: `--sidebar-w: 232px`, `--accent`, `--surface`, `--border`, `--muted`, `--radius`, `--shadow`, `--editor-preview-scale`
- A4 invoice pages: `.a4-page` at `794×1123px`
- Mobile breakpoints: `≤900px` (sidebar hidden), `≤600px`
- `#view-editor` uses `position: fixed` — **do not change this to `position: absolute` or static**

---

## Important Conventions

- **No framework** — plain DOM manipulation, no React/Vue/Svelte.
- **All functions exposed to `window`** in `main.js` — required for `onclick="..."` in HTML.
- **Inline event handlers in HTML** — do not refactor to `addEventListener` without updating `main.js`.
- **German UI** — all labels, comments, and variable names are in German.
- **CHF / Swiss formatting** — amounts use `1'234.00` apostrophe separators (not periods or commas).
- **Supabase config** via `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Credentials never hardcoded** — `supabase.js` falls back to `'YOUR_SUPABASE_URL'` placeholder and `isConfigured()` guard.

---

## Security Model

### RLS Policies (Row-Level Security)
All tables use `user_id = auth.uid()` — NOT `auth.uid() IS NOT NULL`.
- Old weak pattern allowed any authenticated user to read/write all rows.
- New pattern strictly scopes each user to their own data.
- `migration_rls_fix.sql` must be run in Supabase SQL editor to apply this on live DB.

### XSS Prevention
- Toast messages use DOM construction (`textContent`) — never `innerHTML` for user-supplied strings.
- `escHtml()` from `utils.js` is available for any HTML context that needs it.
- The SVG icons in toasts are the only thing that goes through `innerHTML`.

### Auth Gate
- `initAuth()` in `auth.js` checks `isConfigured()` first — missing Supabase env vars shows a hard error, never opens the app unauthenticated.
- Login/logout managed entirely through `#view-login` / `#app` visibility toggling (no redirects).

---

## Current Branch: `main` (feature/dashboard-v1 merged via PR #1)
