# Senaryo Timeline Editörü

## Project Overview
A screenplay timeline editor with Firebase real-time collaboration. Single-page application built with vanilla JavaScript, deployed to Firebase Hosting.

## Architecture
- **Namespace pattern:** All modules live under `App.*` (e.g., `App.Utils`, `App.Store`, `App.Timeline`)
- **Module format:** Each module is an IIFE that returns a public API object
- **State management:** `App.Store` is the central state with event bus (`on`/`emit`), snapshot-based undo/redo
- **Real-time sync:** Firebase Realtime Database via compat SDK (v10.12.0)

## File Structure
```
index.html              # Monolithic version (development fallback)
src/
  index.html            # HTML shell with CSS/JS placeholders
  css/styles.css        # All CSS
  js/
    utils.js            # App.Utils — helpers, escHtml, sanitizeColor, $() DOM cache
    store.js            # App.Store — state, undo/redo, event bus
    ui.js               # App.UI — toast, modal, tooltip, context menu, status bar
    mention.js          # App.Mention — shared mention popup factory
    auth.js             # App.Auth — Firebase email/password auth
    autosave.js         # App.AutoSave — debounced save to Firebase
    projects.js         # App.Projects — CRUD, sharing, invitations
    timeline.js         # App.Timeline — vertical timeline rendering
    screenplay.js       # App.Screenplay — scene-based screenplay panel
    screenplay-editor.js # App.ScreenplayEditor — professional Celtx-style editor
    interaction.js      # App.Interaction — drag, resize, selection, keyboard
    panels.js           # App.Panels — right panel (edit, warn, analysis, etc.)
    analysis.js         # App.Analysis — warnings, character analysis, tempo
    changelog.js        # App.Changelog — change history tracking
    notes.js            # App.Notes — collaborative notes
    ai.js               # App.AI — AI assistant (Anthropic/OpenAI/Gemini)
    io.js               # App.IO — JSON/DOCX import/export
    app.js              # Firebase config, Sync, Demo data, init
scripts/
  build.js              # Build script: inlines CSS/JS into public/index.html
public/
  index.html            # Built output for Firebase Hosting
```

## Development
```bash
# Start local dev server (serves root index.html)
python3 -m http.server 8080

# Build for production (creates public/index.html)
node scripts/build.js

# Deploy
npm run build && firebase deploy
```

## Key Conventions
- **HTML escaping:** Always use `U.escHtml()` for user-provided text in innerHTML templates
- **Color sanitization:** Use `U.sanitizeColor()` for any color value in style attributes
- **DOM caching:** Use `U.$('elementId')` instead of `document.getElementById()` for frequently accessed elements
- **Input validation:** Use `U.validateText(str, field)` to enforce character limits
- **Mention system:** Use `App.Mention.createInstance(opts)` — do NOT duplicate mention logic
- **Firebase IDs:** Generated via `U.genId(prefix)` — format: `prefix_timestamp_random` (e.g., `ev_1771963448926_pbyzg`)

## Firebase
- **Project:** senaryo-7e7fb
- **Hosting:** https://senaryo-7e7fb.web.app
- **Database:** Realtime Database with rules in `database.rules.json`
- **Auth:** Email/password only (anonymous auth disabled)

## Testing
After any changes, verify:
1. All view modes work (Timeline, Screenplay, Split)
2. Firebase auth login/register
3. Project CRUD and sharing
4. Event drag-drop, undo/redo
5. Import/export JSON
6. Responsive layout (mobile + tablet)
7. No console errors
