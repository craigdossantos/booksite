# Accordion-Based Progressive Disclosure Implementation Plan

## Overview

Transform the tab-based explore mode into an accordion-based progressive disclosure system with AI sidebar integration. This replaces the 4-tab interface (Summary/Key Points/Deep Dive/Application) with a nested accordion that allows progressive "zoom in" on any content point.

## User Requirements (Confirmed)

- ✅ Replace tabs with nested accordion hierarchy
- ✅ AI sidebar on right (similar to prototype-3-slider design)
- ✅ AI responses inject into accordion at appropriate depth levels
- ✅ Voice-to-text input capability
- ✅ Deletable AI content (hover to show delete button)
- ✅ Emerald/cyan color scheme for AI (not purple)
- ✅ Feature flag to toggle between tab and accordion modes
- ✅ Persist AI content to localStorage

## Architecture Decisions

1. **Create new AccordionPanel component** - Don't refactor DepthPanel, create separate component
2. **AI sidebar on right** - Dedicated panel, responses inject into main accordion
3. **Feature flag** - Allow toggling between DepthPanel (tabs) and AccordionPanel (accordion)
4. **localStorage persistence** - AI content survives page refreshes, keyed by `{bookId}:{chapterId}`
5. **React Context for state** - Manage expansion state and AI content without prop drilling

## Component Structure

```
BookExplorer
├── LearningTree (left sidebar - unchanged)
├── AccordionPanel (NEW - main content, replaces DepthPanel when flag=true)
│   ├── AccordionSection (Level 1 - Summary, always visible)
│   ├── AccordionSection (Level 2 - Key Points, expandable)
│   │   └── AccordionSection (Level 3 - Deep dive, nested)
│   │       └── AIAccordionItem (Level 4 - AI Q&A, deletable)
│   │           └── AIAccordionItem (Level 5 - Follow-ups, deletable)
│   └── RelatedConceptsSection
└── AISidebar (NEW - right panel)
    ├── VoiceInput component (microphone button)
    ├── Text input
    ├── Message history
    └── Confirmation messages
```

## Data Model Changes

### New Types (add to `/src/types/book.ts`)

```typescript
// AI content that nests into accordion
export interface AIContentItem {
  id: string; // unique ID
  parentId: string; // which accordion section it belongs under
  depth: number; // 4 or 5
  type: "question" | "followup";
  question: string;
  answer: string;
  createdAt: string; // ISO date string
  isDeleted?: boolean;
}

// Accordion expansion state
export interface AccordionState {
  expandedItems: Set<string>;
  aiContent: AIContentItem[];
}

// UI action for AI content management
export type UIAction =
  | { type: "navigate"; sectionId: string; highlightText?: string }
  | { type: "openDepthLevel"; nodeId: string; depth: DepthLevel }
  | { type: "addAIContent"; item: AIContentItem; autoExpand?: boolean } // NEW
  | { type: "deleteAIContent"; itemId: string }; // NEW
// ... existing actions
```

## Content Hierarchy Mapping

### For Chapters

```
Level 1 (Blue border, always visible)
└── Summary: chapter.summary

Level 2 (Cyan border, collapsible)
├── Story 1: story.title
│   └── Level 3 (Cyan-dark border, nested)
│       ├── Description: story.description
│       ├── Lesson: story.lesson
│       └── [AI Content nests here at Level 4]
├── Story 2: story.title
│   └── Level 3...
└── Related Concepts
    └── Level 3: Clickable concept chips
```

### For Concepts

```
Level 1 (Blue border, always visible)
└── Definition: concept.definition

Level 2 (Cyan border, collapsible)
├── How It Works
│   └── Level 3
│       └── Mechanism + Feynman explanation
├── Related Projects (if exists)
│   └── Level 3
│       └── Project cards
└── Related Concepts
    └── Level 3: Links to concepts
```

## Implementation Steps

### Step 1: Foundation Setup (2-3 hours)

**1.1 Create AccordionStateContext**

- File: `/src/contexts/AccordionStateContext.tsx`
- Manages expansion state (Set<string>)
- Manages AI content array
- Provides toggle, expand, collapse, expandToSection helpers
- Handles localStorage sync for AI content

**1.2 Create base components**

- File: `/src/components/AccordionSection.tsx`
  - Reusable expandable/collapsible section
  - Props: depth, title, icon, children, isExpanded, onToggle
  - Uses Framer Motion for smooth animations
  - Progressive indentation based on depth
  - Border colors based on depth level

### Step 2: Build AccordionPanel (3-4 hours)

**2.1 Create AccordionPanel component**

- File: `/src/components/AccordionPanel.tsx`
- Props: same as DepthPanel (chapter, concept, feynman, etc.)
- Transform chapter/concept data into accordion structure
- Render Level 1 (summary) - always visible
- Render Level 2 sections (key points/stories) - collapsible
- Render Level 3 (deep dive) nested under Level 2
- Include Related Concepts section at bottom

**2.2 Data transformation helpers**

- Function: `buildChapterAccordion(chapter, stories) => AccordionNode[]`
- Function: `buildConceptAccordion(concept, feynman, projects) => AccordionNode[]`
- Handle edge cases (no stories, no mechanism, etc.)

### Step 3: AI Content Components (2-3 hours)

**3.1 Create AIAccordionItem**

- File: `/src/components/AIAccordionItem.tsx`
- Display AI question + answer at depth 4-5
- Emerald/cyan gradient background (light theme: emerald-50, cyan-50)
- Delete button (hidden by default, visible on hover)
- onClick delete: soft delete (isDeleted=true)
- Animation: slide-in on mount, fade-out on delete

**3.2 Create AISidebar**

- File: `/src/components/AISidebar.tsx`
- Fixed position on right side
- Width: 400px on desktop, full-width drawer on mobile
- Contains: VoiceInput, text input, message history
- Shows confirmation when AI content added to accordion
- "Jump to content" button to scroll to injected section

**3.3 Create VoiceInput**

- File: `/src/components/VoiceInput.tsx`
- Uses Web Speech API (SpeechRecognition)
- Microphone button with recording state (🎤 / 🔴)
- Browser compatibility detection
- Fallback: hide button if not supported
- onTranscript callback returns recognized text

### Step 4: AI Integration (3-4 hours)

**4.1 Modify AI chat backend**

- File: `/src/app/api/chat/route.ts`
- Update AI tools to return `parentSectionId` with responses
- Add context about current chapter structure to AI prompts
- Tool response includes: `{ answer, parentSectionId, depth }`

**4.2 AI response injection logic**

- In AISidebar: on AI response, create AIContentItem
- Determine parentId from AI response (e.g., "story-1")
- Add to AccordionStateContext
- Auto-expand parent sections: expandToSection(parentId)
- Scroll to new content with highlight animation
- Show confirmation message in sidebar

**4.3 localStorage persistence**

- Key pattern: `accordion-ai-${bookId}:${chapterId || conceptId}`
- Save AIContentItem[] on every add/delete
- Load from localStorage on component mount
- Handle migration/versioning for future schema changes

### Step 5: Feature Flag Integration (1-2 hours)

**5.1 Add feature flag to BookExplorer**

- File: `/src/components/BookExplorer.tsx`
- State: `const [useAccordionMode, setUseAccordionMode] = useState()`
- Check localStorage: `accordion-mode-enabled`
- Check URL param: `?accordion=true`
- Conditional render: `{useAccordionMode ? <AccordionPanel /> : <DepthPanel />}`

**5.2 Add toggle UI**

- Button in BookExplorer header
- Toggle between "Tabs Mode" and "Accordion Mode"
- Save preference to localStorage
- Icon: 📑 (tabs) / 🎢 (accordion)

### Step 6: Visual Design & Polish (2-3 hours)

**6.1 Depth-based styling**

```css
/* Indentation */
.depth-1 {
  margin-left: 0;
}
.depth-2 {
  margin-left: 2rem;
}
.depth-3 {
  margin-left: 4rem;
}
.depth-4 {
  margin-left: 6rem;
}
.depth-5 {
  margin-left: 8rem;
}

/* Border colors */
.depth-1 {
  border-left: 4px solid #3b82f6;
} /* Blue */
.depth-2 {
  border-left: 3px solid #06b6d4;
} /* Cyan */
.depth-3 {
  border-left: 2px solid #0891b2;
} /* Cyan-dark */
.depth-4 {
  border-left: 4px solid #10b981;
} /* Emerald - AI */
.depth-5 {
  border-left: 4px solid #f59e0b;
} /* Amber - Follow-up */
```

**6.2 Animations**

- Expand/collapse: Framer Motion height animation
- AI content insert: slide-in from left + glow effect
- Delete: fade-out + slide-left
- Scroll: smooth scroll with easing

**6.3 Mobile responsiveness**

- Reduce indentation on mobile: `ml-2 sm:ml-4 md:ml-8`
- AISidebar becomes bottom drawer on mobile
- Breadcrumb trail for navigation context

### Step 7: Testing & Refinement (2-3 hours)

**7.1 Functionality testing**

- [ ] Accordion expand/collapse works smoothly
- [ ] AI sidebar sends messages
- [ ] Voice input captures speech (Chrome/Edge/Safari)
- [ ] AI responses appear in correct accordion section
- [ ] Delete button appears on hover
- [ ] Deleting AI content works
- [ ] localStorage persists AI content
- [ ] Feature flag toggles between modes
- [ ] Deep linking works (?chapter=X&section=Y)

**7.2 Edge cases**

- [ ] Chapter with no stories
- [ ] Concept with no mechanism
- [ ] AI can't determine parentSectionId (default to top-level)
- [ ] Browser doesn't support SpeechRecognition
- [ ] localStorage quota exceeded

**7.3 Accessibility**

- [ ] Keyboard navigation (Tab, Enter to expand/collapse)
- [ ] ARIA labels for screen readers
- [ ] Focus management when expanding sections
- [ ] Voice input has proper labels

## Critical Files to Create

### New Files

1. `/src/contexts/AccordionStateContext.tsx` - State management
2. `/src/components/AccordionPanel.tsx` - Main accordion container
3. `/src/components/AccordionSection.tsx` - Reusable expandable section
4. `/src/components/AIAccordionItem.tsx` - AI content with delete button
5. `/src/components/AISidebar.tsx` - Right sidebar for AI chat
6. `/src/components/VoiceInput.tsx` - Voice-to-text button

### Files to Modify

1. `/src/components/BookExplorer.tsx` - Add feature flag and conditional rendering
2. `/src/types/book.ts` - Add AIContentItem, update UIAction
3. `/src/app/api/chat/route.ts` - Return parentSectionId in tool responses
4. `/src/lib/uiActions.ts` - Add addAIContent and deleteAIContent actions

### Files to Reference (No Changes)

- `/src/components/DepthPanel.tsx` - Reference for data transformation
- `/src/components/AIChat.tsx` - Reference for AI integration patterns
- `/src/hooks/useUIActions.ts` - Use existing hook

## Success Criteria

✅ User can toggle between tab mode and accordion mode
✅ Accordion shows progressive disclosure: Summary → Stories → Deep Dive
✅ AI sidebar on right with voice input button
✅ AI responses inject into accordion hierarchy at correct depth
✅ AI content persists across page refreshes (localStorage)
✅ Delete buttons appear on hover for AI content
✅ Smooth animations for expand/collapse
✅ Works on mobile (AI sidebar becomes drawer)
✅ Emerald/cyan color scheme for AI content
✅ No purple AI styling

## Implementation Status: ✅ COMPLETED

All steps completed successfully. Implementation includes:

### Components Created

- ✅ AccordionStateContext - State management with localStorage sync
- ✅ AccordionPanel - Main accordion container for chapters/concepts
- ✅ AccordionSection - Reusable expandable section with depth-based styling
- ✅ AIAccordionItem - AI content display with deletable hover button
- ✅ AISidebar - Right sidebar with AI chat integration
- ✅ VoiceInput - Voice-to-text using Web Speech API

### Files Modified

- ✅ BookExplorer.tsx - Feature flag and conditional rendering
- ✅ types/book.ts - Added AIContentItem interface and UI actions
- ✅ globals.css - Added highlight-flash animation for scroll effects

### Bugs Fixed During Testing

1. **Import Error** - Fixed DefaultChatTransport import in AISidebar.tsx (was @/lib/chatTransport, should be ai)
2. **sendMessage TypeError** - Fixed message format from string to { text: string } object
3. **Missing CSS Animation** - Added highlight-flash keyframe animation for scroll highlighting

### Verified Features

- ✅ Accordion expand/collapse with smooth animations
- ✅ Mode toggle persists to localStorage
- ✅ AI sidebar sends messages correctly
- ✅ Voice input integration (browser compatibility detection)
- ✅ Scroll to AI content with emerald glow highlight
- ✅ Delete functionality with hover reveal
- ✅ localStorage persistence for AI content

## Time Estimate

- Step 1 (Foundation): 2-3 hours
- Step 2 (AccordionPanel): 3-4 hours
- Step 3 (AI Components): 2-3 hours
- Step 4 (AI Integration): 3-4 hours
- Step 5 (Feature Flag): 1-2 hours
- Step 6 (Polish): 2-3 hours
- Step 7 (Testing): 2-3 hours

**Total: 15-22 hours**

## Rollout Strategy

**Phase 1 (MVP):** Feature flag OFF by default, opt-in via URL param `?accordion=true`
**Phase 2:** Feature flag ON by default, users can toggle back to tabs
**Phase 3:** Remove DepthPanel, accordion is permanent

## Future Enhancements (Post-MVP)

- Drag-drop to reorganize AI content
- Export AI-enhanced notes as markdown
- Share accordion view with others (unique URL)
- Voice responses (text-to-speech)
- Multi-language voice support
- AI suggests sections to expand based on question
