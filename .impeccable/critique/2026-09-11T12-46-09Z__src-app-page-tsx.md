---
timestamp: 2026-09-11T12-46-09Z
slug: src-app-page-tsx
---
Method: dual-agent (A: a457550fe9aaacee8 · B: a517c3ca3573951e3)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Selfie bg-removal runs silently during quiz; QR loading shows skeleton with no ETA or failure state |
| 2 | Match System/Real World | 3 | Italian throughout, correct register |
| 3 | User Control and Freedom | 2 | No back button on any screen; only "Riprova" link as exit |
| 4 | Consistency and Standards | 2 | CTA style alternates gradient pill vs underlined text; inconsistent casing |
| 5 | Error Prevention | 1 | Debug test buttons unconditionally rendered in production UI |
| 6 | Recognition Rather Than Recall | 3 | Icon+label answer cards correct; score tiles lack max-score context |
| 7 | Flexibility and Efficiency | n/a | Kiosk — single path by design |
| 8 | Aesthetic and Minimalist Design | 2 | Result screen has 8+ competing focal points |
| 9 | Error Recovery | 1 | Raw DB error strings shown; QR has no failure fallback; bg-removal failure is silent |
| 10 | Help and Documentation | n/a | Kiosk — n/a |
| **Total** | | **16/32** | **Acceptable (borderline Poor)** |

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1 | No aria-pressed on quiz selection; no aria-live for screen transitions |
| 2 | Performance | 2 | MediaPipe instance recreated per photo; no CDN timeout guard |
| 3 | Responsive | 3 | Intentional fixed 1080px; overflow on non-kiosk expected |
| 4 | Theming | 2 | #cecece and #e8e0ec hard-coded in UI |
| 5 | Implementation Integrity | 0 | Three test bypasses in production render; -test bucket hardcoded; no error boundary |
| **Total** | | **8/20** | **Poor** |

## Design Specificity Verdict

The Withheld Gradient rule is correctly implemented and is the sharpest product-specific decision. Below that the execution is largely generic — a scrolling form, a spinner screen, a vertical result stack. The 1080×1920 canvas is not being exploited deliberately. The emotional climax surfaces as 22%-opacity tint, not a full-bleed saturation moment. Specificity exists in intent, severely underdeveloped in execution.

## Priority Issues

**P0 — Three test-bypass UI elements unconditionally rendered in production**
YOUNG/BOOME code buttons, quiz "test" auto-answer button, "download diretto" link — all visible to event attendees. Gate behind NODE_ENV === 'development'.

**P0 — Quiz renders all 10 questions simultaneously on a kiosk**
Questions 5-10 are off-screen with no scroll affordance. CTA greyed out with no explanation. Paginate to one question per screen, auto-advance on selection.

**P1 — No back navigation on any screen**
No escape from code_entry, selfie, or quiz. Add back chevron on code_entry and selfie.

**P1 — Result screen has 8+ competing focal points; prize buried**
Restructure as two beats: gradient reveal + single CTA, then prize screen.

**P1 — No aria-pressed on quiz answers; no aria-live for transitions**
WCAG 2.1 AA violation. Add aria-pressed to answer cards, aria-live region on screen container.

**P2 — MediaPipe instance recreated per photo; no CDN timeout guard**
Cache SelfieSegmentation instance. Add 10s timeout with avatar fallback.

**P2 — QR arrives asynchronously with no failure state**
Add progress label, timeout error state, start upload during calculating screen.

## Persona Red Flags

Jordan: No code hint on intro. Failed code shows unexplained QR. "Salta questo passaggio" ambiguous.
Sam: Touch targets ~28px (below 44px min). No aria-pressed. No aria-live for transitions. Emoji icons not labeled.
Riley: "test" button bypasses quiz. Double upload race on selfie. handleRestart doesn't cancel processInBackground.
Nonno Giacomo: No code hint. Silent case correction confusing. All 10 questions scrollable — won't scroll on kiosk. QR useless without smartphone.

## Questions

1. Has event staff observed users confused by the greyed CTA on the multi-question scroll layout?
2. Should V/C/M numerical scores be shown at all, or should the gradient be the only output?
3. What is the recovery procedure if the kiosk component crashes at an event?
