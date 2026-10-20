# What If ?

A phone-layout web toy. Pull the question mark, choose a hand, and play on the console —
every button makes the sound of the hand you picked.

## Run it (VS Code)
1. Open this folder in VS Code (the folder that contains `index.html`).
2. Install the **Live Server** extension (Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server** (or click **Go Live** in the status bar).
4. On your phone: connect to the same Wi-Fi and open `http://<your-computer-ip>:5500`
   (Live Server shows the address). Sound needs a first tap/touch to start — that's a browser rule.

You can also just double-click `index.html`; it works from `file://` too (sounds fall back to embedded copies).

## Pages
1. **Pull** the `?` of the logo — stretch sound plays while you hold; let go and it springs back.
2. **Choose your hand** — Sausage / Marshmallow / Human. Tap one to preview its sound, then "pick this hand".
3. **Touch the box** — a cube with six materials: wood, metal, fabric (first view), then *turn the box* for glass, stone, jelly.
   - **Tap** a face = one short knock.
   - **Move / drag** over a face = a rub that plays only while your hand is moving, louder the faster you go. Keep still and it goes quiet.
     Slide across an edge and the sound changes with the material. With a mouse, hover and move to rub, click to tap.
   - **Turn the box** by dragging in the space around it (or switch the *rub / turn* toggle to turn it by dragging on the faces too). *flip it* snaps to the other three faces.
   - Switch hand any time with the three round buttons at the bottom, to compare the same material across hands.

## Sounds
The 18 material sounds (6 materials x 3 hands) are generated live in the browser (Web Audio), so there are no extra files.
To tune them, edit `HAND`, `TAP` and the `startRub` recipes inside the `Box` block of `index.html`.
The three hand preview sounds on page 2 are still plain files:
The hand sounds are plain files in `assets/`:
`sausage_hand.mp3`, `marshmallow_hand.mp3`, `human_hand.mp3` — replace them (keep the names) and refresh.
(Served through Live Server these files are used; opened straight from disk, the embedded copies in
`assets/hands_audio.js` are used instead.) The stretch sound lives in `assets/stretch_audio.js`.

## Files
- `index.html` – all markup, styles and code (page 1 physics, page 2 picker, page 3 texture box)
- `index-console-game.html` – the previous version with the game console (kept as a backup; open it the same way)
- `assets/` – logo pieces, hand images (`hand_*.webp`), console body + buttons (`body.webp`, `btn_*.webp`), sounds
