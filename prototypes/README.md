# Progressive Content Disclosure Prototypes

Three visual mockups demonstrating different approaches to progressive content disclosure with integrated AI assistance for the book learning platform.

## Overview

These prototypes explore how to transform the book explore mode from a tab-based interface to an interactive, progressive content disclosure system. Each prototype shows a different UI approach for the same goal: allowing users to "zoom in" on content progressively while keeping AI assistance integrated into the main experience.

## Quick Start

1. Open `prototypes/index.html` in your browser
2. Click on any of the three prototypes to view the layout
3. These are static mockups - they show visual design, not functionality

## The Three Prototypes

### Prototype 1: Nested Accordion Tree 🎢

**File**: `prototype-1-accordion/index.html`

**Concept**: Hierarchical accordion where each level represents increasing depth

**Visual Features**:

- Progressive indentation shows depth hierarchy
- Colored left borders indicate depth levels (blue → cyan → purple)
- Breadcrumb trail at top shows current navigation path
- Expanded sections show full content, collapsed sections are grayed out
- AI responses embed inline with purple gradient styling

**Best For**: Linear learners who prefer step-by-step progression

**Strengths**:

- Low learning curve
- Excellent mobile compatibility
- Clear visual hierarchy
- Natural reading flow

---

### Prototype 2: Card Grid 🎴

**File**: `prototype-2-cards/index.html`

**Concept**: Card-based interface where cards expand to show sub-cards

**Visual Features**:

- Grid layout with cards for each content piece
- Expanded cards show nested sub-cards (Deep Dive, Examples, Ask AI)
- Color-coded left borders indicate content type
- AI responses appear as full-width cards below
- Multiple cards can be viewed simultaneously

**Best For**: Visual learners who like scannable overviews

**Strengths**:

- High scanability - see all key points at once
- Parallel exploration - expand multiple cards
- Visual hierarchy through borders and spacing
- AI feels like a peer content type

---

### Prototype 3: Depth Slider 🎚️

**File**: `prototype-3-slider/index.html`

**Concept**: Slider controls content visibility; AI sidebar injects responses into main content

**Visual Features**:

- Horizontal slider (1-4) controls which depth levels are visible
- All content on single scrollable page
- Depth 1: Summary only
- Depth 2: Summary + Key Points (shown in mockup)
- Depth 3: Deep dive content (faded out in mockup)
- Depth 4: Application projects (faded out in mockup)
- AI sidebar on right with chat interface
- AI responses inject into main content with glow effect

**Best For**: Systematic learners who want explicit control

**Strengths**:

- Clear depth level control
- AI sidebar keeps history visible
- Responses inject into main content
- Desktop-optimized layout

---

## Comparison

| Feature             | Accordion   | Cards         | Slider           |
| ------------------- | ----------- | ------------- | ---------------- |
| **Learning Curve**  | Low         | Medium        | Low              |
| **Mobile-Friendly** | Excellent   | Good          | Fair             |
| **Scanability**     | Medium      | High          | Low              |
| **AI Integration**  | Inline      | Card-based    | Sidebar + Inject |
| **Multi-tasking**   | Sequential  | Parallel      | Sequential       |
| **Depth Clarity**   | Breadcrumbs | Color borders | Slider position  |

## Design System

All prototypes use consistent colors from the booksite:

```css
--color-void: #0a0a0f /* Background dark */ --color-graphite: #1e1e28
  /* Background medium */ --color-electric-blue: #3b82f6 /* Depth 1 / Primary */
  --color-electric-cyan: #06b6d4 /* Depth 2 / Secondary */
  --color-electric-purple: #8b5cf6 /* Depth 3 / AI */;
```

## Mock Data

Shared mock data in `shared/` directory includes:

- **mock-data.js**: GTD chapter with 3 key points, deep dives, examples
- **ai-responses.js**: 5 pre-written AI conversation examples
- **utils.js**: Helper functions (scroll, format, storage)
- **animations.js**: Framer Motion animation variants (if implementing interactivity)

## Evaluation Criteria

When reviewing these prototypes, consider:

1. **Comprehension**: Does the "zoom deeper" metaphor make sense visually?
2. **AI Integration**: Does AI feel integrated or separate?
3. **Information Density**: Can you control how much you see?
4. **Navigation**: Easy to find your way back to overview?
5. **Visual Appeal**: Which layout feels most polished?

## Next Steps

After selecting a preferred approach:

1. Gather stakeholder feedback on all three
2. Vote or rank preferences
3. Identify hybrid opportunities (combine best features)
4. Plan full interactive implementation
5. Integrate with existing BookExplorer component

## Technical Notes

- Built with Tailwind CSS CDN
- Static HTML only (no JavaScript functionality)
- Responsive design (mobile/tablet/desktop)
- Compatible with modern browsers
- Can be viewed directly without build step

## File Structure

```
prototypes/
├── index.html                          # Prototype selector
├── README.md                           # This file
├── prototype-1-accordion/
│   └── index.html                      # Accordion mockup
├── prototype-2-cards/
│   └── index.html                      # Card grid mockup
├── prototype-3-slider/
│   └── index.html                      # Slider mockup
└── shared/
    ├── mock-data.js                    # Chapter content
    ├── ai-responses.js                 # AI conversations
    ├── utils.js                        # Helper functions
    └── animations.js                   # Animation configs
```

## Credits

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Built for progressive content disclosure exploration - January 2025
