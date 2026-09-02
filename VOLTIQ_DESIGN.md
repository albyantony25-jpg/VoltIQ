# VoltiQ — Frontend Design System

## Product character

VoltiQ should feel like a premium modern energy-management product:
precise, intelligent, technical, trustworthy, and quietly sophisticated.

The interface should feel designed by a strong product-design team, not generated from a generic SaaS template.

## Explicit tokens
- Background: #0A0E14 (or your actual bg token)
- Surface: #121821
- Border: #1E2733
- Text primary: #E8ECF1 / muted: #8B96A5
- Gold accent: #E3A857 — use only for emphasis, key numbers, active states
- Mode: dark by default. Gold is the only accent; for multi-series charts, use gold at varying opacity/tints rather than a second hue, unless comparison genuinely requires two distinguishable series color — confirm with me before adding a second accent color.

## Numerical typography
kWh, currency, and percentage values should use a monospace or tabular-figure font for alignment and scanability, distinct from body/heading type.

## Signature motif
VoltiQ should have exactly one deliberate visual element tied to electricity (e.g. a live waveform strip, a radial meter dial) used sparingly as a hero/anchor element — not decoration repeated across every screen.


## Core aesthetic

Use a restrained black / white / warm-gold visual language.

Prefer:
- strong typography
- generous but intentional spacing
- clean alignment
- high information density where useful
- subtle borders
- restrained shadows
- clear hierarchy
- purposeful animation
- excellent responsive behavior

Avoid:
- excessive gradients
- excessive glassmorphism
- excessive rounded cards
- glowing neon effects
- decorative blobs
- random illustrations
- excessive drop shadows
- oversized empty hero sections
- unnecessary animations
- generic dashboard-card grids
- "AI-generated SaaS" visual patterns

## Color

Existing semantic tokens in `globals.css` are the source of truth.

Primary visual language:
- black
- white / off-white
- restrained neutral grays
- VoltiQ gold accent

Gold should communicate emphasis, energy, achievement, or important state.
Do not use gold everywhere.

## Typography

Typography must establish a clear hierarchy.

Use:
- strong display/section headings
- readable body text
- compact labels
- clear numerical hierarchy for energy metrics

Numbers and measurements should feel especially deliberate and easy to scan.

## Layout

Use a consistent spacing rhythm.

Prefer:
- strong vertical rhythm
- aligned content edges
- meaningful whitespace
- consistent container widths
- responsive layouts that collapse intentionally

Do not stretch content simply to fill empty space.

## Components

Existing components in `components/ui` are the foundation.

Reuse and improve existing components rather than creating duplicates.

New components should be:
- composable
- accessible
- responsive
- consistent with the existing token system
- visually coherent with the rest of VoltiQ

## Cards

Cards should have a clear purpose.

Do not put every element inside a card.

Prefer:
- sections
- dividers
- typography
- whitespace
- grouped content

Use cards when they genuinely improve hierarchy or interaction.

## Data visualization

Charts should prioritize readability and insight.

Avoid:
- excessive colors
- unnecessary decoration
- chart junk
- overly rounded chart containers

Use the VoltiQ visual language consistently.

## Motion

Use the existing Framer Motion dependency.

Animation should communicate:
- hierarchy
- state changes
- navigation
- feedback
- progressive disclosure

Prefer short, subtle, purposeful transitions.

Avoid:
- animating everything
- long entrance animations
- distracting parallax
- animation for decoration alone

## Interaction

Every interactive element should have:
- clear hover state
- clear focus state
- clear active state
- clear disabled state
- sensible loading state

Interactions should feel immediate and polished.

## Responsive design

Design mobile deliberately rather than simply shrinking desktop layouts.

Check:
- navigation
- tables
- charts
- forms
- dialogs
- dashboard layouts
- touch targets
- text wrapping

## Accessibility

Maintain:
- keyboard navigation
- visible focus
- appropriate contrast
- semantic HTML
- accessible labels
- reduced-motion support

## Anti-AI-Slop rule

Before implementing a UI, ask:

"Would a thoughtful human product designer have made this choice?"

If the answer is no, simplify it.

Favor product clarity and hierarchy over visual novelty.

## Implementation rule

Do not introduce a new library when an existing VoltiQ dependency can solve the problem.

Inspect the existing implementation before creating a new component.

Make the smallest coherent change necessary.

After UI changes:
1. check the affected component
2. check responsive behavior
3. check interaction states
4. check visual consistency
5. remove unnecessary decoration