---
description: Premium frontend design and implementation rules for the VoltiQ Next.js application.
---

# VoltiQ Frontend Rule

Before making any frontend/UI change, read and follow:
@VOLTIQ_DESIGN.md

## Scope

These rules apply to the VoltiQ frontend under `frontend/`.

Do not modify backend code unless explicitly requested.

## Existing stack

Use the existing VoltiQ stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Framer Motion
- Lucide
- Recharts
- existing components in `frontend/components/ui`

Do not introduce another UI framework when the existing stack can solve the problem.

## Component reuse

Before creating a new UI primitive:

1. Inspect `frontend/components/ui`.
2. Reuse an existing component when possible.
3. Extend an existing component when appropriate.
4. Only create a new primitive when there is a genuine missing capability.

Avoid duplicate Button, Card, Dialog, Input, Select, Table, Tabs, or similar primitives.

## Design quality

Treat the UI as a real production product.

Prioritize:

- visual hierarchy
- typography
- spacing
- alignment
- information density
- responsive behavior
- accessibility
- interaction states
- consistency

Avoid generic AI-generated SaaS aesthetics.

Do not add visual effects merely because they look impressive in isolation.

## Motion

Use the existing Framer Motion dependency.

Animation must communicate hierarchy, state, navigation, feedback, or progressive disclosure.

Keep motion subtle and purposeful.

Respect reduced-motion preferences.

## Before implementation

Inspect the relevant existing page and components first.

Understand the existing patterns before changing them.

Do not redesign unrelated areas while working on a specific feature.

## After implementation

Verify:

- desktop layout
- mobile layout
- hover states
- focus states
- loading states
- empty states
- error states
- overflow
- typography
- spacing
- accessibility
- visual consistency

Run the relevant checks/build when appropriate.

## Anti-slop test

Before finalizing a UI decision, ask:

"Does this make the product clearer and better, or is it decoration?"

Prefer the former.

When in doubt, simplify.
