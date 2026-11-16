# Scripti Writer product specification

The original master specification, kept verbatim. Later changes made in chat are listed below it.

---

Master Prompt: Comprehensive Specifications for ScriptiPlease build/update Scripti, a minimalist, distraction-free writing application for screenwriters and novelists, based on the following master technical and UI specification:1. Main Menu & Project ManagementDefault View on Launch: App starts at the Main Menu with two core options:Create New Story: Triggers a modal with project options:Manuscript: Standard screenplay format.Novel: Simpler, fluid text writing environment for prose/chapters.Plain Story Ideas: Scratchpad for raw notes and ideas.Open Stories: Displays saved projects in a library grid.Project Cards: Display a customizable cover poster thumbnail and format badges on each saved project card in the library.2. Top Navigation & Global LayoutTop Menu Placement: Position the Script tool menu on the top-left, directly adjacent to the View menu.Navigation Tabs: Primary workspace tabs positioned at the top: Script, Title Page, Characters, Locations, Corkboard, Brainstorming.Look / Theme Selector: Include a paint palette/dropdown menu in the top navigation toolbar with four distinct presets that update the entire UI (backgrounds, tabs, sidebars, text):Dark (Default): Pitch-dark background with crisp white/light contrast.Light: Standard modern light mode.Paper / Warm: Ivory/cream background (#F4EBE1) with a subtle natural paper fiber texture overlay and soft charcoal/sepia text (#2C2621).Night Warm: Low-light amber/espresso dark mode (#1E1915) with warm amber/tan text (#E6D5C3).3. Multi-Draft Versioning & Split-Screen ViewBrowser-Style Draft Tabs: Placed directly beneath the main tab navigation bar. Each tab represents a project draft (e.g., Draft 1, Draft 2 - Rewrite).Quick Switch & Duplication: Switching tabs toggles the manuscript state instantly. Includes an inline + button and right-click context menu options to Duplicate, Rename, or Delete draft tabs.Split-Screen View: Includes a toggle button to split the workspace vertically, allowing writers to view and edit two draft tabs side-by-side.4. Script Page EditorTop Toolbar Controls (Centered beneath tabs):Undo / Redo buttons.Text formatting dropdown (Scene Heading, Action, Character, Dialogue, Parenthetical, Transition).Text highlighter tool with a comment popover for marking text and leaving inline feedback.Top-Left Action: Fixed 'Add New Scene' button in the top-left area of the script view.Scene Headings Formatting: Apply a bolder/thicker font weight (e.g., Bold or Semi-Bold Courier) to all INT. / EXT. scene headings to visually separate scene blocks from action lines and dialogue.Margin Notes: An inline margin notes section situated directly between the script page document and the right sidebar edge.5. Title Page EditorInclude a top formatting toolbar with options to adjust font family and text size.6. Novel / Prose Writing ViewMinimalist Top Toolbar: Minimal, non-distracting formatting bar containing:Typography Basics: Font selector, Font size, Bold, Italic.Structure: Text Style Presets (Chapter Heading, Subheading, Body Text) and a Scene Break button (***).Progress: Subtle live word count indicator.Note: Exclude color selection and text highlighting tools to maintain a clean environment.7. Characters & Locations PagesCharacters Page: Remove modal popups when adding characters. Clicking 'Add Character' appends a new profile card directly down the main list, with all text fields expanded and fully visible at all times.Locations Tab: A dedicated section/tab to track scene settings and venue details.8. Brainstorm Page (Infinite Canvas)Grid Background: Subtle, minimalist background grid pattern (dot grid or fine mesh) that scales with zooming and transforms with panning to prevent spatial disorientation.Global Canvas Controls: Top header buttons for global Undo / Redo stepping through all board actions.Marquee Multi-Selection: Click and drag on empty canvas space to select, move, or delete multiple elements as a group.Sticky Note Behaviors:Default background color is White. Palette includes White and Black.Spawning/dragging out a new sticky note automatically cycles background colors.Bug Fix: Moving or clicking an existing sticky note on the canvas preserves its assigned color and does NOT trigger color-cycling.Interactive Canvas Cards (Resizable & Minimizable):Scene Cards: Drag-and-drop tool to place manuscript scenes on the board via a dropdown selector.Character Cards: Drag-and-drop tool to place character profiles on the board.Behavior: Both card types are resizable and collapsible (minimizable). When minimized, they collapse into a title bar while keeping connection handles accessible.Shapes & Freehand Drawing Tools:Shapes Palette: Tool containing Circle, Rectangle, Triangle, and directional lines (Straight Line, Single Arrow, Double Arrow). Includes 360-degree rotation handles and bounding boxes. No internal color options or extra helper shapes.Pencil Tool: Includes stroke-level undo capability to remove recent freehand drawings without disturbing underlying canvas cards or sticky notes.Redesigned Timeline Tool:Dual-orientation support (Horizontal / Vertical toggle).Vector axis line with transparent background and slightly thicker strokes for visibility.Positioned permanently behind all other canvas nodes (lower z-index).Act labels float directly above the line so text is never crossed out or obstructed.Removed default 'Start' and 'End' text labels.Compact Story Beat Nodes:Clicking the Story Beat tool opens a popup menu containing structural beat options: Opening Hook, Theme Stated, Inciting Incident, Debate, Plot Point 1, Conflict, B Story, Fun and Games, Midpoint, False Victory / Defeat, Point of No Return, All Hope Is Lost, Dark Night of the Soul, Break Into 3, Plot Twist, Climax, Resolution, Custom Beat.Imports as small, sleek, minimalist badge nodes without connection dots.Connection Lines & 4-Way Anchors:Sticky notes, scene cards, character cards, and text blocks feature 4 connection dots (Top, Bottom, Left, Right).Lines snap and lock permanently to anchor dots.Lines dynamically auto-route to the nearest anchor dot when cards are moved around the board.Text labels along connection lines automatically scale or truncate when nodes shrink or move close together to prevent text overlap.9. Cross-Page Bi-Directional Automation & SyncingScene Heading $\leftrightarrow$ Locations Auto-Sync: Typing or editing a scene heading (INT. COFFEE SHOP - DAY) automatically creates or updates the entry in the Locations Tab.Smart Autocomplete & Hover Cards: Typing character or location names in the script triggers autocomplete suggestions based on the project database. Hovering over tagged names displays a popover summary card without leaving the document.Canvas $\leftrightarrow$ Script Navigation: Double-clicking a Scene Card or linked Sticky Note on the canvas instantly navigates to that scene in the script manuscript editor. Renaming titles on either view updates both in real time.

---

## Later changes

- Characters: each character gets its own colour automatically (changeable from 8 swatches); labelled fields for name, role, personality, motivation, goal and notes.
- Brainstorm board (superseded in Beta v0.0.4, see below): all tools on a left-side rail (select, pan, pencil, rectangle, circle, triangle, line, arrow, double arrow, note, scene card, character card, story beat, timeline); colour coding and a minimise button for nodes; resizable timeline with Act 1-3 and add/remove acts.
- Dark mode uses a soft blue-tinted palette instead of pure black and grey. Light mode unchanged.
- Version 1.0 (full app): saving to IndexedDB with a live "Saved/Synced" indicator; backup and restore
  of all stories; import of Fountain, Final Draft and backups; export of screenplays (PDF in industry
  format with optional scene numbers, Final Draft, Fountain, text) and novels (manuscript PDF, Word,
  Markdown, text); scene list, chapter list and live page/scene/word counts; focus mode; keyboard
  shortcuts dialog; smart scene headings (typing INT./EXT. turns a line into a heading); library
  search, sort, duplicate and delete with Undo; scene cards keep pointing at the right scene when the
  script changes; renaming a scene from its board card; linked sticky notes jump to their scene;
  phone and tablet layout with a side drawer, pinch to zoom, one-finger pan and double-tap on the
  board; installable app with offline support.
- Mac support: ⌘ shortcut labels, trackpad scrolling pans and pinching zooms the board (including
  Safari gestures), "Add to Dock" install in Safari, and a native Mac app (.dmg, Electron) with a full
  menu bar, built locally with `npm run mac` or automatically by the "Build installers" GitHub workflow, which also makes the Windows setup .exe.
- Characters page toolbar: Undo, Redo (also Ctrl/⌘+Z) and Delete all (with Undo); deleting restores
  board cards and connections on undo.
- Scene headings show a small "SCENE" label and the scene number before the heading, e.g.
  "SCENE 1. INT. LOCATION - DAY".
- The library starts empty; the old test stories are removed. Stories the writer made are never removed by an update.
- Brainstorm tool bar can expand to show each tool's full name (superseded in Beta v0.0.4: the tools
  now float at the bottom of the board, each with a small name under its icon).
- A visible Library (home) button at the top left of every story.
- Export "Everything (.zip)": PDF, Word (.docx), Final Draft, Fountain, text, a story bible (.docx) and
  the Scripti project file in one folder, with an "Open me first" guide. Screenplays also export to Word.

## Scripti Writer betas

- Renamed to **Scripti Writer**, licensed GPL-3.0. Versions before 1.0.0 are betas, shown as
  "Beta v0.0.x". The desktop data folder stays `Scripti` so existing stories open.
- Update notice: the desktop app checks GitHub, shows a banner, and nothing installs until the
  writer clicks Download. Also in Settings → Check for updates and the Help menu.
- About dialog: version, year, "Created by Marc Fussing Rosbach, built with Claude",
  "© Furos Image", the GPL license, and feedback and bug-report buttons.
- Find and replace (Ctrl/⌘+F) in scripts and novels; capitals are kept (MARA → NORA).
- Character cards: name, role, gender, played by, personality, motivation, goal, and look and
  style with a five-colour palette.
- Beta v0.0.4: undo, redo and zoom in a floating island at the top of the board, the tools in an
  island at the bottom; look switch in the library (no icon); title page details at the bottom
  (produced by, copyright, date, email), also in exports; page numbers; two-page book view for
  novels and notes; change a cover or colour and export a PDF from the library card menu; PDF
  export for notes; tabs in the order Title Page, Script, Characters, Locations, Brainstorming,
  Corkboard, centred; the story menu is now **Settings** (cover, split, focus, look, backups,
  shortcuts, updates, about, delete) and a separate **Export** menu.
- Beta v0.0.5: the library is never replaced when the saved stories can't be read; deleting a
  draft can be undone; the desktop app finishes saving before closing; choose the backup folder;
  find works from the book view; looks and clicks no longer mark a story as edited.
- Beta v0.0.6: choose how often automatic backups refresh (1 to 60 minutes) and how many days
  to keep (3 to 90).
- Beta v0.0.7: a fifth look, **Lamplight** (warm dark browns and cream, taken from a photo of a
  lit wall); **Soft glow** in Settings (on by default): a gentle light behind the app, and on
  script, novel and title pages a brighter middle fading to darker edges, with a fine grain.
