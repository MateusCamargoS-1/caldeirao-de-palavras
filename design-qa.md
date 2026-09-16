# Design QA

- Source visual truth: `/var/folders/68/d_jpq_910tj3pcmq7278cyjh0000gn/T/codex-clipboard-tvPsLJ.png`
- Implementation evidence: `/private/tmp/caldeirao-final-canvas.png`
- Source pixels: 1663 × 946 at the supplied image density
- Implementation pixels: 363 × 535 at device scale 1
- Browser viewport: 1280 × 575; focused element capture of the left canvas
- State: active round after five accepted characters (`Toda `), with particles settled
- Primary interactions tested: start round, countdown, five individual key presses, one particle per accepted character, word counter update
- Console errors: none reported by the browser error check

## Full-view comparison

The complete app was captured at 1280 × 575 and compared with the supplied 1663 × 946 reference. The responsive viewport changes the right-column width and text wrapping, while the requested left-side canvas preserves the reference hierarchy and proportions: header, counter, wall-mounted faucet, open-shouldered vessel, and bottom-aligned grains.

## Focused-region comparison

The canvas-only capture was used because the requested fidelity target is specifically the vessel, faucet, and particles. Relative to the left panel, the vessel opening, wall height, rounded bottom corners, faucet mounting, pipe direction, dark metal palette, and orange particle color match the reference. The final faucet has one lower outlet. The 4 px grain sits directly against the inner floor line.

## Findings

- No actionable P0, P1, or P2 mismatch remains in the requested canvas region.
- P3: tiny antialiasing differences in the curved pipe and vessel stroke are expected from Canvas rendering at different viewport densities.

## Comparison history

1. Earlier implementation emitted multiple grains per character and used elastic contact correction, producing unstable motion. Fixed by switching to exactly one 4 px grain per accepted character and a fixed-step falling-sand grid.
2. User evidence showed two orange faucet outlets and a visible gap below the sand pile. Fixed by removing the decorative inner orange outlet and bottom-aligning the granular grid from the physical floor line.
3. Post-fix evidence: `/private/tmp/caldeirao-final-canvas.png` shows one outlet and the settled grain touching the floor. Two canvas captures taken two seconds apart produced identical SHA-1 hashes, confirming no idle movement.

## Implementation checklist

- [x] One 4 px particle per accepted character
- [x] Single faucet outlet
- [x] Particle floor aligned with vessel line
- [x] Fixed-step physics
- [x] Stable settled state without idle jitter
- [x] Typecheck and production build passing

final result: passed
