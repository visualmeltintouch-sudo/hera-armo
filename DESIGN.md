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
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: "Circular Std, Geist, Arial, sans-serif"
    fontSize: "1.25rem"
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
- HERA brand accent (#e4379b magenta-pink) reserved for CTAs, focus states, and links — never a background field
- The three HERA hues (verde/ciano/magenta) appear ONLY inside the intro logotype flourish and the final result gradient — never during the quiz itself
- Answers are icon + label cards, not lettered "A/B" choices — every option reads as a concrete thing, not an abstract slot
- Circular Std as the display and body voice everywhere; Geist is the silent fallback

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
**The Withheld Gradient Rule.** The verde/ciano/magenta triad never appears as a background, wash, or ambient tint anywhere the visitor is still answering questions. It exists in exactly two places: the intro logotype ("HERAVIGLIOSA") and the result-screen gradient circle. Any future screen that shows quiz progress must stay neutral (foreground/muted only).

**The One Accent Rule.** Only one saturated color, the UI primary (#e4379b), is live during interaction (buttons, focus, links). It never competes with the reveal palette.

## Typography

**Display Font:** Circular Std (with Geist Sans, Arial fallback)
**Body Font:** Circular Std (with Geist Sans, Arial fallback)

**Character:** Rounded, geometric, friendly without being juvenile — a single humanist grotesque voice carries both the punchy Gen-Z intro copy and the plainer institutional classic-tone copy, so age-group content differs in words, never in typeface.

### Hierarchy
- **Display** (700, clamp(2.5rem, 6vw, 4.5rem), 1.05): intro headline "LA TUA ARMOCROMIA HERAVIGLIOSA", result profile name.
- **Headline** (700, 3rem, 1.1): birth-year prompt, "HAI VINTO!", question text.
- **Title** (600, 1.5rem, 1.3): section labels, progress counter.
- **Body** (400, 1.25rem, 1.5): supporting copy, profile description, answer card labels.
- **Label** (500, 0.875rem, uppercase optional): muted micro-copy (progress "Domanda X di Y", footer hints).

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
- **Primary:** brand-magenta background (#e4379b) or, on the two "big moment" CTAs (Inizia, Scarica postcard), the full HERA verde→ciano→magenta gradient — white text, generous 48px horizontal padding.
- **Hover / Focus:** `hover:scale-105` with the existing shadow, no color shift on the gradient CTAs; solid CTAs use `hover:bg-primary/90`.
- **Secondary / Ghost:** underlined text links in muted or primary color, no fill, used for lower-emphasis moves (skip, restart, disconnect).

### Answer Cards (signature component)
- **Shape:** `rounded-3xl`, 2px hairline border (`border-border`).
- **Content:** large emoji/icon (6xl) stacked above a short label — never a bare "A" / "B" letter.
- **State:** hover raises the border to primary color and adds a shadow; active scales to 0.97. No color fill change on selection — the card's own icon and text carry the meaning, keeping the blank-canvas rule intact.

### Progress Indicator
- **Style:** 2px track in muted, fill in `foreground/70` (neutral dark, never a brand hue) — deliberately colorless so it cannot leak the outcome.

### Result Gradient (signature component)
- **Style:** a circular field (`rounded-full`, 256px) filled with a true `linear-gradient(135deg, ...)` built from exactly one stop per hue, positioned at the midpoint of that hue's cumulative weight share (never two stops of the same color — that produces a hard band, which this system forbids). The Canvas-rendered postcard uses the same weighted-stop math so the downloadable image matches what the visitor saw on screen.

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
