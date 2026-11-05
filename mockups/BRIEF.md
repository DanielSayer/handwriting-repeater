# Redesign brief: handwriting-repeater.com

App: free browser whiteboard for handwriting practice. Users write on a board (optionally tracing faint guide letters, lined paper or a picture), then **replay** their strokes at real pace, and export a GIF. Main users: teachers projecting onto classroom whiteboards and kids at laptops/Chromebooks. Desktop-first (1280–1440 wide, also 1280x720 projectors).

Current app screenshot: `../docs/images/hero.png` (cream notebook/desk look, handwriting font for UI labels, three rails, board ~35% of the screen).

## Goals (from owner)
1. **The board (drawing pad) is the focus**, not text or branding.
2. Whiteboard vibe: it should feel like using a whiteboard.
3. Legible type: no handwriting font in the UI chrome.
4. Strong brand + favicon. The site is handwriting-repeater.com (wordmark "handwriting repeater").

## Decisions already made (challenge them if you think they're wrong)
- UI font: Atkinson Hyperlegible Next (legible for kids, low vision, projectors). Handwriting fonts only appear on the board.
- Minimum UI text 13px, muted text `#5b6372` (AA on white).
- Dry-erase palette: black, blue `#1f5fd1`, red `#d8392f`, green, purple, orange.
- The board is fixed at 12:7 (1.71). At 1440x900 (16:10) it is limited by width, so horizontal bars are almost free. At 1280x720 (16:9) it is limited by height, so side rails are cheaper. Every layout is checked at both sizes.
- Selection rules: compact exclusive choice (tool, size, speed) = ink fill; exclusive choice with a preview (font, lines, board colour) = blue ring + check badge; toggle (Ghost, Loop) = blue tint + blue ring (switches inside menus); colour = ring. Replay is always brand blue.
- "Trace" is renamed **Ghost**: a faint copy of the writing shows during replay (that is what the existing trace mode does).
- Brand mark: `fav/final.svg` (= brand/favicon.svg). It is f1b refined: shallower single wave, shorter arrow arm. Exported PNGs are in brand/ (16, 32, 180, 512).
- Mockups are static. No functionality is needed.

## Feature inventory every layout must expose
undo, redo, wipe (clear), marker/pencil, 3 sizes, 6 colours, trace mode, loop mode, replay (the primary action), replay speed, guide text (edit, move/resize, font), line style (ruled/dotted/grid/blank), board colour (4), background picture (add, fade), timer, save GIF, zoom, feedback link, full screen.

## Files (pass 3)
- `1-tray.html` + `1-tray-empty.html` (blank board with disabled states)
- `2-toolbar.html` + `2-toolbar-setup.html` (Set up panel open). Layout 2 trades: size is a popover, Ghost/Loop/speed sit in a "1× Ghost ▾" replay options menu, More is gone (feedback moved into Set up, full screen into the zoom cluster)
- `3-panel.html` (168px panel, labelled tiles)
- `panels.html` (all popovers/menus incl. empty+loaded picture, set+running timer, replay options)
- `shots/favicons.png`: final, f6b, f1b
- `shots/<name>-1440.png`, `-1280.png` (1280x720), `-1920.png` (1920x1080)
- Re-shoot: `bash shoot.sh <name> [w h]`
