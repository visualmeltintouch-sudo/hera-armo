---
name: Armocromia Heravigliosa
description: White, minimal HERA-branded quiz totem where the payoff is a real color gradient, revealed only at the end.
colors:
  primary: "#e4379b"
  secondary: "#867cd0"
  background: "#fcfcfc"
  foreground: "#000000"
  card: "#fcfcfc"
  muted: "#f0e8ee"
  muted-foreground: "#645a61"
  border: "#cecece"
  destructive: "#ef4444"
  hera-verde: "#00A651"
  hera-ciano: "#00AEEF"
  hera-magenta: "#EC008C"
typography:
  display:
    fontFamily: "Circular Std, Geist, Arial, sans-serif"
    fontSize: "clamp(3.5rem, 8.4vw, 6.3rem)"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: "Circular Std, Geist, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "1.5rem"
  full: "9999px"
spacing:
  sm: "0.75rem"
  md: "1.5rem"
  lg: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "20px 48px"
  answer-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "40px"
---

# Design System: Armocromia Heravigliosa

## Overview

**Creative North Star: "The Blank Canvas Before the Reveal"**

The totem is a white, near-silent instrument for most of the experience — the visitor answers ten quick questions on a page that gives away nothing. No color, no gradient, no hint of the outcome. Every accent that isn't the HERA identity itself is suppressed until the single moment it's earned: the result screen, where a genuine, continuously-blended gradient (verde → ciano → magenta, weighted by the visitor's actual answers) appears for the first time as one circular field of color. The entire quiz is staged as the empty canvas; the payoff is the paint landing all at once.

This is a deliberate rejection of the earlier build, which painted a faint tri-color wash behind the quiz and showed a hard-edged, three-band "gradient" (really three flat color rectangles glued together) — a gradient in name only. The rebuilt system treats "gradient" as a literal contract: a single smooth CSS/Canvas blend with one stop per hue, positioned by weight, never repeated or hard-stopped.

**Key Characteristics:**
- Pure white/near-white ground (#fcfcfc) for the totem and the whole product, not just admin chrome
- **Buttons (2026-09 revision):** solid HERA hues, never gradients. Magenta (#EC008C) is the default action color; verde (#00A651) marks a positive confirmation; ciano (#00AEEF) marks a neutral/secondary action; red (#ef4444) marks a destructive/disruptive action (reset, restart). This supersedes the earlier "gradient CTA" and "one accent" button rules below — kept for the reveal-only elements (progress bar, result gradient, hero backgrounds), which are unaffected.
- The three HERA hues also appear in the intro hero background and the final result gradient — those remain non-interactive, decorative reveals, distinct from the semantic button colors above.
- Answers are icon + label cards, not lettered "A/B" choices — every option reads as a concrete thing, not an abstract slot
- Circular Std as the display and body voice everywhere; Geist is the silent fallback
- **Type scale ×1.4 (2026-09-11, revised same day):** the totem runs on a 55" screen viewed from a few steps away, so text was first doubled from the original scale, then pulled back 30% after that read as too large — net effect vs. the original scale below is ×1.4.

## Colors

Restrained strategy: neutrals carry the whole surface, one committed accent (HERA magenta-pink) marks every actionable element, and the three brand hues are withheld as a reward, not a wash.

### Primary
- **HERA Magenta-Pink** (#e4379b): every primary action — start button, continue, links, focus rings, progress fill accents in admin. The One Accent Rule below governs its use on the totem.

### Secondary
- **Soft Violet** (#867cd0): admin-only accent for secondary badges (age-group tags, duplicate actions); does not appear on the visitor-facing totem.

### Tertiary — the reveal palette (used only at the result screen)
- **Hera Verde** (#00A651): Ambiente pole of the final gradient.
- **Hera Ciano** (#00AEEF): Acqua pole of the final gradient.
- **Hera Magenta** (#EC008C): Energia pole of the final gradient. (Distinct from the UI accent #e4379b — this is the brand-triad magenta, reserved for the gradient and the intro logotype only.)

### Neutral
- **Paper White** (#fcfcfc): background and card surface, totem and admin light mode alike.
- **Ink** (#000000 / foreground): primary text.
- **Blush Mist** (#f0e8ee): muted surfaces (progress track, input fill).
- **Ash Rose** (#645a61): secondary/muted text.
- **Hairline Grey** (#cecece): borders, dividers, input outlines.

### Named Rules
**The Withheld Gradient Rule (backgrounds only).** The verde/ciano/magenta triad never appears as a background wash or ambient tint anywhere the visitor is still answering questions — it exists in the intro hero background, the result-screen gradient circle, and the postcard. This rule governs decorative surfaces, not buttons: see the Buttons section for the semantic button-color system introduced 2026-09.

**The One Accent Rule — superseded for buttons.** Buttons now use the 4-color semantic system (magenta/verde/ciano/rosso, see Buttons). This rule still governs non-button decorative accents (progress bar fill, focus rings on non-button elements).

## Typography

**Display Font:** Circular Std (with Geist Sans, Arial fallback)
**Body Font:** Circular Std (with Geist Sans, Arial fallback)

**Character:** Rounded, geometric, friendly without being juvenile — a single humanist grotesque voice carries both the punchy Gen-Z intro copy and the plainer institutional classic-tone copy, so age-group content differs in words, never in typeface.

### Hierarchy (×1.4 scale, 2026-09-11 — 55" kiosk viewing distance)
- **Display** (700, clamp(3.5rem, 8.4vw, 6.3rem), 1.05): intro headline "LA TUA ARMOCROMIA HERAVIGLIOSA", result profile name.
- **Headline** (700, 4.2rem, 1.1): birth-year prompt, "HAI VINTO!", question text.
- **Title** (600, 2.1rem, 1.3): section labels, progress counter.
- **Body** (400, 1.75rem, 1.5): supporting copy, profile description, answer card labels.
- **Label** (500, 1.225rem, uppercase optional): muted micro-copy (progress "Domanda X di Y", footer hints).

## Layout

Fixed 1080×1920 portrait canvas — the totem is a kiosk, not a responsive page. Content is centered in a single column with generous vertical rhythm (64–96px between major blocks). A persistent header (logo, centered, ~64px tall) tops every screen state so the brand mark never disappears, even during the blank-canvas quiz stretch. The admin panel and operator terminal are separate, conventional responsive layouts (sidebar + content, or centered card) using the same token set in dark mode.

## Elevation & Depth

Flat by default. The totem uses no shadows during the quiz — cards are distinguished by a 2px hairline border, not elevation. The one exception is the result-screen gradient circle and the primary CTA buttons, which carry a soft ambient shadow (`shadow-lg` / `shadow-2xl`) precisely because they are the reward moment; shadow appears only where the design wants to signal "this is the special thing."

### Named Rules
**The Earned Shadow Rule.** Shadow is not decorative — it marks the one or two elements per screen that are the point (CTA, result gradient). A screen with more than two shadowed elements has diluted the signal.

## Shapes

Rounded-full pills for every primary button (matches the soft, humanist type). Answer cards and containers use a large 24px radius (`rounded-3xl`) — big enough to read as "soft object," not a generic card. Inputs use a simple bottom-border underline on the totem (no boxed field) to keep the blank-canvas screens uncluttered; admin inputs use a full bordered field at 8–10px radius for density.

## Components

### Buttons
- **Shape:** full pill (`rounded-full`).
- **Color is semantic, always solid — no gradients:**
  - **Magenta** (#EC008C) — default/primary action (Partecipa, Avanti, Scatta foto, Scopri il premio).
  - **Verde** (#00A651) — positive confirmation (es. "Ottima! Procedi" dopo il selfie).
  - **Ciano** (#00AEEF) — neutral/secondary action (upload alternativo, tastiera on/off, strumenti di test).
  - **Rosso** (#ef4444) — destructive/disruptive action (Ricomincia dalla schermata premio).
- **Hover / Focus:** `active:scale-95` on touch press, no hover-dependent states (kiosk has no mouse).
- **Secondary / Ghost:** underlined text links in muted color, no fill, used only for de-emphasized moves (skip, cancel) that carry no real risk.

### Answer Cards (signature component)
- **Shape:** `rounded-3xl`, 2px hairline border (`border-border`).
- **Content:** large emoji/icon (6xl) stacked above a short label — never a bare "A" / "B" letter.
- **State:** hover raises the border to primary color and adds a shadow; active scales to 0.97. No color fill change on selection — the card's own icon and text carry the meaning, keeping the blank-canvas rule intact.

### Progress Indicator
- **Style:** 2px track in muted, fill in `foreground/70` (neutral dark, never a brand hue) — deliberately colorless so it cannot leak the outcome.

### Result Gradient (signature component)
- **Style:** a circular field (`rounded-full`, 256px) filled with a true `linear-gradient(135deg, ...)` built from exactly one stop per hue, positioned at the midpoint of that hue's cumulative weight share (never two stops of the same color — that produces a hard band, which this system forbids). The Canvas-rendered postcard uses the same weighted-stop math so the downloadable image matches what the visitor saw on screen.

### Selfie Viewfinder (signature component, revised 2026-09-15)
- **Layout:** fullscreen edge-to-edge on the 1080×1920 canvas — the live feed / captured photo / neutral placeholder fills the entire viewport (9:16, no square crop, no reserved header/footer bands). All chrome (attempt badge, toast, controls) is an *overlay* on top of it, never a separate reserved zone — this is a deliberate Stitch-informed revision of the earlier fixed 200/1080/640 split.
- **Palette stays light.** Unlike the reference mockup's dark Material theme, every overlay here (attempt badge, toast, bottom panel) uses the product's white/frosted chrome (`backdrop-blur` + `bg-background/90` or `bg-white/85`), not black. HERA's semantic button colors (magenta/verde/ciano/rosso) are unchanged.
- **Flow:** the camera opens automatically the instant the visitor lands here (right after the form) — no landing/idle step to tap through first. This is also where the browser's camera-permission prompt fires. If the camera fails, the background shows a neutral placeholder and a transient toast ("Fotocamera non disponibile…") appears; the bottom panel falls back to upload/skip, no separate screen.
- **No centering guide.** The live feed is shown clean, with nothing overlaid on it except the attempt badge — the visitor frames themselves without a forced guide.
- **Shutter:** one large full-width pill button ("SCATTA"), not a small icon-only control — a white circular camera-icon chip on the left, the label filling the rest. Sized for a kiosk-grade touch target, not a phone-camera affordance.
- **Crop deferred to confirm-time.** `capturePhoto`/`handleFileUpload` no longer crop anything — they show the *whole* 9:16 frame in the preview step, "ti piace?" judged on the real photo. The face-aware `adaptiveCrop` (or `centerSquareCrop` fallback) now runs inside `processInBackground`, right before the segmentation step, so the tight square used in the result-screen photo ring is computed once, after confirmation, from the same source the visitor approved.
- **Crop padding:** `adaptiveCrop`'s multipliers (1.6× normal / 1.0× small face / 2.2× large face) intentionally leave more headroom than a tight close-up.
- **Preview buttons:** two-line rich buttons (icon chip + bold label + a smaller subtext line: "(N rimasti)" / "Conferma e procedi"), not plain icon+label — easier to scan at a glance. The *last* remaining attempt turns the Riprova button and its copy destructive red; at zero attempts, "Usa questa foto" spans full width alone.
- **Shutter countdown:** a radial SVG progress ring (draining as the 5→1 count proceeds) around a big number in the HERA verde→ciano→magenta gradient, over the live feed dimmed by a translucent dark scrim (functional, for legibility — not a theme choice) with a soft pulsing glow behind it. A brief white flash fires at the capture instant ("CHEESE!"). The gradient digits are a deliberate exception to the "no gradient text" default, matching the "HAI VINTO!" treatment on the prize screen.
- **Icons:** hand-drawn single-stroke SVGs (`src/components/kiosk/CameraIcons.tsx`) — camera, image, check, refresh — never emoji or unicode glyphs.

### Navigation (admin)
- Dark-mode sidebar (`.dark` token set) with the HERA logo top-left, primary-colored active state, muted inactive links.

## Do's and Don'ts

### Do:
- **Do** keep the quiz screens entirely neutral (white/ink/muted only) — no gradient, tint, or brand-hue accent until the result screen.
- **Do** build every gradient as one stop per color (weighted-midpoint positioning), in both CSS and Canvas renderers, so it always reads as a continuous blend.
- **Do** pair every answer option with an icon and a real label; never fall back to lettered options.
- **Do** use the pill/full-radius button shape for every primary call to action, on totem and operator screens alike.

### Don't:
- **Don't** render a "gradient" using two stops of the same color per hue (start/end pair) — that produces a flat band, the exact defect this rebuild corrected.
- **Don't** introduce the verde/ciano/magenta triad as a background wash anywhere before the result screen.
- **Don't** use more than one saturated UI accent (#e4379b) live at once during interaction; the reveal palette is reserved.
- **Don't** swap Circular Std for a different display face on totem screens — Geist is a silent fallback only, never a visible alternate voice.
