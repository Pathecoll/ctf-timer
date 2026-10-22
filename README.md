# ctOS Countdown

A countdown timer for the CTF stage screen, in the event's ctOS / Neon-Noir look:
extruded 3D digits (React Three Fiber), bloom, scanlines and a neon grid floor.

```sh
pnpm install
pnpm dev        # http://localhost:3100
pnpm build      # static files in dist/, servable from any folder
```

## Using it

- **Set the time** with a preset, or type `15`, `4:30` or `1:30:00` and press Set.
- **Label** above the clock is editable in place ("Round 1 ends in").
- **Keys:** Space start/pause · R reset · ↑ ↓ ±1 min · F full screen.
- **Links** set it up: `?t=10&label=Round%201` opens a 10-minute timer with that label.
- While it runs and nobody touches anything, the controls and cursor hide after 3 s.
- The clock turns amber in the last minute, red and pulsing in the last 10 seconds,
  and glitches at zero.

The timer is saved in the browser, so a reload keeps it running, and tabs on the
same computer stay in step: run the controls in one tab and put another full
screen on the projector.

## Font

The digits use Chakra Petch Bold, the CTF's HUD font (SIL Open Font License, see
`fonts/OFL.txt`). `public/fonts/chakra-petch-bold.typeface.json` is generated from
it, keeping only the characters the timer draws:

```sh
node scripts/make-font.mjs fonts/ChakraPetch-Bold.ttf public/fonts/chakra-petch-bold.typeface.json
```
