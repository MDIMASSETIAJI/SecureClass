---
version: alpha
name: Duolingo
description: Feather green. Chunky buttons. Streak energy.
colors:
  primary: "#3C3C3C"
  secondary: "#777777"
  tertiary: "#58CC02"
  neutral: "#F7F7F7"
  surface: "#FFFFFF"
  on-primary: "#FFFFFF"
typography:
  display:
    fontFamily: Nunito
    fontSize: 4.25rem
    fontWeight: 900
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Nunito
    fontSize: 2.25rem
    fontWeight: 800
  body:
    fontFamily: Nunito
    fontSize: 1rem
    lineHeight: 1.55
  label:
    fontFamily: Nunito
    fontSize: 0.75rem
    fontWeight: 800
    letterSpacing: "0.08em"
rounded:
  sm: 8px
  md: 12px
  lg: 16px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
---
## Overview

Duolingo: gamified-learning cheer — bright feather green as the only action color, fat rounded corners, and a friendly heavy sans that reads like a mascot talking.

## Colors

The palette is built around high-contrast neutrals and a single accent that drives interaction.

- **Primary (`#3C3C3C`):** Headlines and core text.
- **Secondary (`#777777`):** Borders, captions, and metadata.
- **Tertiary (`#58CC02`):** The sole driver for interaction. Reserve it.
- **Neutral (`#F7F7F7`):** The page foundation.

## Typography

- **display:** Nunito 4.25rem
- **h1:** Nunito 2.25rem
- **body:** Nunito 1rem
- **label:** Nunito 0.75rem

## Do's and Don'ts

- **Do** use Tertiary for exactly one action per screen.
- **Do** let Neutral carry the composition — negative space is a feature.
- **Don't** introduce gradients. This system is flat on purpose.
- **Don't** mix Tertiary with alternate accents; the single-accent rule is load-bearing.