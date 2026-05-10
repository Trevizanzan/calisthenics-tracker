# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page calisthenics workout tracking app ("Muscle Up") built with vanilla HTML/CSS/JS. No build system, no dependencies — the entire application lives in `index.html`. Data is persisted to a user's Google Drive as `calisthenics-tracker-data.json` via the Drive REST API. Authentication uses Google Identity Services (OAuth 2.0 implicit flow).

**Live app:** https://trevizanzan.github.io/calisthenics-tracker  
**Repo:** https://github.com/Trevizanzan/calisthenics-tracker  
**Deployment:** GitHub Pages (push to `main` → live immediately, no CI pipeline)

## Design System

The current visual style must be preserved exactly as-is:

- **Background:** `#0a0a0a`
- **Accent:** `#d4ff3a` (neon yellow)
- **Warm:** `#ff7a45` (orange), **Cool:** `#5dc4ff` (blue), **Danger:** `#ff5470` (red)
- **Fonts:** "Bricolage Grotesque" (body) + "JetBrains Mono" (monospace)
- Dark theme, mobile-first responsive layout

Do not alter colors, fonts, or overall visual identity when making changes.

## Running Locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly as `file://` also works but may cause OAuth redirect issues. No build, compile, or install step required.

## Architecture

Everything is in `index.html` (~960 lines), organized into clearly commented sections:

- **CONFIG** — Google Client ID, Drive file name, OAuth scopes
- **SESSIONS DATA** — Exercise definitions for the 3 workout types (A, B, C)
- **AUTH** — Google Sign-In token management and localStorage token caching
- **DRIVE API** — Search, create, read, and write the JSON file on Drive
- **UI RENDERING** — Builds exercise cards dynamically from session data; renders history
- **EVENT HANDLERS** — Tab switching, form submission, delete, sync

### Data flow

1. User authenticates → token stored in `localStorage`
2. App searches for `calisthenics-tracker-data.json` in user's Drive (creates it if absent)
3. Existing logs loaded and rendered in the history section
4. On save: form data is collected, prepended to the logs array, and written back to Drive via PATCH

### Session structure

Each session (A/B/C) defines an array of exercise objects:
```js
{ id, name, description, type: 'sets'|'single', fields: ['rip','kg','sec',...], target }
```
`type: 'sets'` renders a row per set; `type: 'single'` renders one row of inputs.

## Key Constraints

- **Google Cloud OAuth credentials** are hardcoded (`GOOGLE_CLIENT_ID`). The authorized JavaScript origin must include the domain the app is served from, or OAuth will fail.
- The Google Cloud project (`calisthenics-tracker`) is in **test mode** — only `andreatrevi91@gmail.com` is an authorized test user.
- The app stores the Drive file ID in `localStorage` to avoid repeated searches. Clearing localStorage forces a fresh Drive lookup.
- All UI text is in Italian.
- The app is functional on both desktop and mobile.
