---
name: Obsidian Scholar
colors:
  surface: '#0c1324'
  surface-dim: '#0c1324'
  surface-bright: '#33394c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f31'
  surface-container-high: '#23293c'
  surface-container-highest: '#2e3447'
  on-surface: '#dce1fb'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#c4c7c9'
  on-tertiary: '#2d3133'
  tertiary-container: '#8e9193'
  on-tertiary-container: '#272a2c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#0c1324'
  on-background: '#dce1fb'
  surface-variant: '#2e3447'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 32px
  margin-mobile: 20px
  margin-desktop: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 64px
---

## Brand & Style

The design system is engineered for intellectual immersion, positioning the platform as a luxury digital library for high-intent learners. It bridges the gap between high-end entertainment and scholarly pursuit, drawing inspiration from cinematic streaming interfaces.

The aesthetic follows a **Premium Dark-Mode** approach, utilizing **Glassmorphism** for structural depth and **Minimalism** for content focus. The interface should feel "expensive"—achieved through generous negative space, high-contrast typography, and purposeful motion. Every interaction is designed to reduce cognitive load, allowing the beauty of the book covers and high-quality imagery to serve as the primary visual drivers.

## Colors

The palette is anchored in **Obsidian (#020617)** for the deepest background layers and **Charcoal (#0F172A)** for surface containers. This creates a receding effect that makes content "pop."

- **Primary (Electric Indigo):** Used for primary calls to action, active states, and brand-defining moments. It provides a vibrant, high-energy contrast to the dark surroundings.
- **Secondary (Emerald Green):** Reserved exclusively for progression, completion, and positive feedback loops (e.g., "75% Read").
- **Neutrals:** A scale of cool grays and off-whites is used to maintain legibility without breaking the dark-mode immersion. Pure white is avoided to reduce eye strain during long reading sessions.

## Typography

This design system employs a sophisticated typographic pairing to balance editorial tradition with modern utility.

- **Playfair Display:** Used for book titles, section headers, and "Hero" display moments. Its high-contrast serifs evoke the feeling of a physical luxury publication.
- **Inter:** Used for all functional UI elements, body copy, and metadata. Its high x-height and geometric clarity ensure maximum readability across all devices.

Use **Display-LG** sparingly for main landing headers. **Label-MD** should always be used with increased letter spacing for categorization tags (e.g., "HISTORY", "PHILOSOPHY").

## Layout & Spacing

The layout philosophy prioritizes **Content Discovery Tracks**. Unlike enterprise grids, this system uses a fluid horizontal scrolling model for categories and a 12-column fixed-width grid for landing pages.

- **Desktop:** 12 columns with wide 32px gutters to allow elements "room to breathe." Margins are set to a generous 64px to center the focus.
- **Mobile:** A single-column vertical stack with 20px side margins. Horizontal carousels should peek from the right edge to signify more content.
- **Rhythm:** All spacing is derived from an 8px base unit. Use **stack-xl** between major sections to maintain the "premium" airy feel.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.

- **Base Layer:** #020617 (Background Deep).
- **Surface Layer:** #0F172A with a subtle 1px border (#FFFFFF10).
- **Floating Elements (Glass):** Cards and navigation bars use a background blur (20px) and a semi-transparent fill (#0F172A80).
- **Hover Effects:** Instead of rising on the Z-axis, cards should exhibit a **soft indigo glow** (outer shadow: 0 0 20px rgba(99, 102, 241, 0.2)) and a slight scale increase (1.02x). This mimics a backlit screen effect common in high-end media centers.

## Shapes

The design system utilizes **Rounded (0.5rem)** corners as the default for all standard UI components like inputs and small buttons.

For primary content containers and book cover cards, use **rounded-lg (1rem)** to soften the interface and provide a modern, friendly touchpoint. Pill-shapes are reserved exclusively for "status" chips and tags to differentiate them from actionable buttons.

## Components

### Buttons
- **Primary:** Solid Electric Indigo with white text. High-radius (8px) or pill-shaped.
- **Secondary:** Glassmorphic fill (blur 10px) with a subtle white border. 
- **Icon Only:** Transparent background, Indigo icon, appears only on hover.

### Knowledge Cards
The core of the system. Cards must have a 2:3 aspect ratio for book covers. Use a bottom-up gradient overlay (black to transparent) to ensure title legibility if text is overlaid. On hover, the indigo glow is activated.

### Progress Bars
Ultra-thin (4px height). Track color is #1E293B, and the indicator is Emerald Green. No rounded ends on the progress fill; it should feel like a precise technical instrument.

### Inputs
Minimalist approach. No heavy boxes; use a bottom border (2px) that transforms from Charcoal to Indigo on focus. Background is a very subtle dark tint (#FFFFFF05).

### Navigation
A top-fixed, glassmorphic bar. Links are in Inter (Label-MD). The profile/search icons are placed at the far right with significant padding to keep the center of the screen clear for the content titles.