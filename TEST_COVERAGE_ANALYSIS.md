# Test Coverage Analysis & Recommendations

## Executive Summary

The BookSite codebase currently has **0% test coverage** with no testing framework configured. This document outlines the current state and provides prioritized recommendations for improving test coverage.

| Metric | Current State |
|--------|---------------|
| Test Files | 0 |
| Test Framework | None configured |
| Test Coverage | 0% |
| TypeScript/React Files | 30 |
| API Routes | 7 |
| Python Scripts | 18 |

---

## Current Codebase Overview

### Technology Stack
- **Frontend**: React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Python subprocess execution
- **AI/LLM**: Anthropic Claude SDK, Google Generative AI (Gemini)
- **State Management**: Zustand, React Context

### Key Areas Requiring Tests

| Category | Files | Lines of Code | Risk Level |
|----------|-------|---------------|------------|
| Utility Functions | `src/lib/bookContext.ts` | ~576 | **CRITICAL** |
| State Management | `src/contexts/AccordionStateContext.tsx` | ~250 | **HIGH** |
| API Routes | 7 routes in `src/app/api/` | ~400 | **HIGH** |
| React Components | 15 components | ~2,000 | **MEDIUM-HIGH** |
| Custom Hooks | 2 hooks in `src/hooks/` | ~150 | **MEDIUM** |
| Event Bus | `src/lib/uiActions.ts` | ~110 | **MEDIUM** |
| Python Pipeline | 18 scripts in `execution/` | ~3,000+ | **CRITICAL** |

---

## Priority 1: Critical - Utility Functions

### `src/lib/bookContext.ts`

This file contains core business logic for data loading and search. **These functions are pure or near-pure and highly testable.**

#### Functions to Test

1. **`loadBookData(bookId: string)`**
   - Test: Returns complete BookData structure for valid book ID
   - Test: Throws/returns null for non-existent book
   - Test: Handles malformed JSON gracefully
   - Test: Properly merges chapter data with concepts/quizzes/stories

2. **`getBookContext(bookId: string, options?)`**
   - Test: Returns enriched context with default options
   - Test: Respects `maxChapters`, `maxConcepts` limits
   - Test: Includes/excludes optional fields based on options

3. **`searchBookContent(bookId: string, query: string)`**
   - Test: Returns matching chapters by title/content
   - Test: Returns matching concepts by name/description
   - Test: Returns matching quiz questions
   - Test: Returns matching stories
   - Test: Case-insensitive search
   - Test: Returns empty results for no matches
   - Test: Handles special characters in query

4. **`getConceptDetails(bookId: string, conceptId: string)`**
   - Test: Returns concept with all depth levels
   - Test: Includes related concepts
   - Test: Returns null for non-existent concept

5. **`generateTopicQuiz(bookId: string, topic: string, count: number)`**
   - Test: Returns correct number of questions
   - Test: Filters by topic correctly
   - Test: Returns all available if count exceeds available

6. **`extractExcerpt(text: string, query: string, contextLength: number)`**
   - Test: Extracts text around match with proper context
   - Test: Handles query at start/end of text
   - Test: Returns empty for no match

#### Suggested Test File
```typescript
// src/lib/__tests__/bookContext.test.ts
import {
  loadBookData,
  searchBookContent,
  getConceptDetails,
  extractExcerpt
} from '../bookContext';

describe('bookContext utilities', () => {
  describe('searchBookContent', () => {
    it('should find chapters matching query', async () => {
      const results = await searchBookContent('test-book', 'introduction');
      expect(results.chapters).toContainEqual(
        expect.objectContaining({ title: expect.stringContaining('Introduction') })
      );
    });

    it('should return empty results for non-matching query', async () => {
      const results = await searchBookContent('test-book', 'xyznonexistent');
      expect(results.chapters).toHaveLength(0);
      expect(results.concepts).toHaveLength(0);
    });
  });

  describe('extractExcerpt', () => {
    it('should extract text with surrounding context', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const excerpt = extractExcerpt(text, 'fox', 10);
      expect(excerpt).toContain('fox');
      expect(excerpt.length).toBeLessThanOrEqual(text.length);
    });
  });
});
```

---

## Priority 2: High - State Management & Context

### `src/contexts/AccordionStateContext.tsx`

This context manages critical UI state for the accordion-based learning interface.

#### Behaviors to Test

1. **Expansion State Management**
   - Test: `toggleSection` expands collapsed section
   - Test: `toggleSection` collapses expanded section
   - Test: `expandSection` is idempotent for already-expanded section
   - Test: `collapseAll` resets all sections

2. **AI Content Management**
   - Test: `setAIContent` adds content to section
   - Test: `clearAIContent` removes content from section
   - Test: AI content persists across re-renders

3. **Scroll State**
   - Test: `setScrollTarget` updates target section
   - Test: `clearScrollTarget` clears after navigation

#### Suggested Test File
```typescript
// src/contexts/__tests__/AccordionStateContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { AccordionStateProvider, useAccordionState } from '../AccordionStateContext';

describe('AccordionStateContext', () => {
  const wrapper = ({ children }) => (
    <AccordionStateProvider>{children}</AccordionStateProvider>
  );

  it('should toggle section expansion', () => {
    const { result } = renderHook(() => useAccordionState(), { wrapper });

    act(() => {
      result.current.toggleSection('section-1');
    });

    expect(result.current.expandedSections).toContain('section-1');

    act(() => {
      result.current.toggleSection('section-1');
    });

    expect(result.current.expandedSections).not.toContain('section-1');
  });
});
```

---

## Priority 3: High - API Routes

### API Route Testing Requirements

| Route | Key Test Cases |
|-------|----------------|
| `POST /api/chat` | Valid message handling, tool execution, streaming response, error handling |
| `POST /api/process-book` | Book ID validation, process spawning, error propagation |
| `GET /api/books/[id]/cover` | Valid cover serving, 404 for missing, content-type headers |
| `GET /api/books/[id]/images` | JSON array response, empty array for no images |
| `GET /api/books/[id]/images/[filename]` | Valid image serving, path traversal prevention |

#### Suggested Test File
```typescript
// src/app/api/__tests__/books.test.ts
import { GET } from '../books/[id]/cover/route';
import { NextRequest } from 'next/server';

describe('GET /api/books/[id]/cover', () => {
  it('should return cover image for valid book', async () => {
    const request = new NextRequest('http://localhost/api/books/test-book/cover');
    const response = await GET(request, { params: { id: 'test-book' } });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^image\//);
  });

  it('should return 404 for non-existent book', async () => {
    const request = new NextRequest('http://localhost/api/books/nonexistent/cover');
    const response = await GET(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });
});
```

---

## Priority 4: Medium-High - React Components

### Components Requiring Tests

#### `AIChat.tsx` (Critical)
- Test: Renders message list correctly
- Test: Handles tool call parsing from assistant messages
- Test: Dispatches UI actions on tool results
- Test: Shows loading state during streaming
- Test: Handles error states gracefully

#### `LearningInterface.tsx`
- Test: Renders all child components
- Test: Passes book data correctly to children
- Test: Handles loading/error states

#### `QuizMode.tsx`
- Test: Displays question and options
- Test: Validates answer selection
- Test: Calculates and displays score
- Test: Handles quiz completion

#### `BookCard.tsx`
- Test: Renders book metadata
- Test: Handles missing cover image
- Test: Click navigates to book

#### Suggested Test Structure
```typescript
// src/components/__tests__/AIChat.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChat } from '../AIChat';

describe('AIChat', () => {
  const mockMessages = [
    { role: 'user', content: 'What is this book about?' },
    { role: 'assistant', content: 'This book covers...' }
  ];

  it('should render message history', () => {
    render(<AIChat bookId="test" messages={mockMessages} />);

    expect(screen.getByText('What is this book about?')).toBeInTheDocument();
    expect(screen.getByText('This book covers...')).toBeInTheDocument();
  });

  it('should show input field for new messages', () => {
    render(<AIChat bookId="test" messages={[]} />);

    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument();
  });
});
```

---

## Priority 5: Medium - Custom Hooks

### `src/hooks/useUIActions.ts`

#### Behaviors to Test
- Test: Subscribes to UIActionBus on mount
- Test: Unsubscribes on unmount
- Test: Callback receives dispatched actions
- Test: Multiple subscribers receive same action

### `src/lib/uiActions.ts` (UIActionBus)

#### Behaviors to Test
- Test: `subscribe` adds listener
- Test: `unsubscribe` removes listener
- Test: `dispatch` notifies all subscribers
- Test: Action creators return properly typed actions

```typescript
// src/lib/__tests__/uiActions.test.ts
import { UIActionBus, navigate, openDepthLevel } from '../uiActions';

describe('UIActionBus', () => {
  let bus: UIActionBus;

  beforeEach(() => {
    bus = new UIActionBus();
  });

  it('should notify subscribers on dispatch', () => {
    const handler = jest.fn();
    bus.subscribe(handler);

    const action = navigate('chapter', 'ch-1');
    bus.dispatch(action);

    expect(handler).toHaveBeenCalledWith(action);
  });

  it('should not notify after unsubscribe', () => {
    const handler = jest.fn();
    const unsubscribe = bus.subscribe(handler);
    unsubscribe();

    bus.dispatch(navigate('chapter', 'ch-1'));

    expect(handler).not.toHaveBeenCalled();
  });
});
```

---

## Priority 6: Critical - Python Pipeline Tests

The `execution/` directory contains 18 Python scripts that form the book processing pipeline. These require separate testing with `pytest`.

### Recommended Python Test Structure

```
execution/
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Shared fixtures
│   ├── test_convert_epub.py
│   ├── test_extract_concepts.py
│   ├── test_generate_quizzes.py
│   └── fixtures/
│       └── sample.epub
```

### Key Python Functions to Test

| Script | Functions to Test |
|--------|-------------------|
| `convert_epub_to_markdown.py` | EPUB parsing, markdown conversion, chapter splitting |
| `extract_concepts.py` | Concept extraction, deduplication |
| `generate_quizzes.py` | Quiz formatting, difficulty assignment |
| `aggregate_concepts.py` | Concept merging, relationship building |

---

## Implementation Roadmap

### Phase 1: Setup (Immediate)

1. **Install testing dependencies**
```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

2. **Configure Jest** (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

3. **Add test scripts to `package.json`**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Phase 2: Critical Path Tests (Week 1-2)

1. Unit tests for `bookContext.ts` utilities
2. Unit tests for `uiActions.ts` event bus
3. Context tests for `AccordionStateContext`

### Phase 3: API & Component Tests (Week 2-3)

1. API route integration tests
2. Component tests for `AIChat`, `QuizMode`, `LearningInterface`

### Phase 4: Integration & E2E (Week 3-4)

1. End-to-end tests with Playwright or Cypress
2. Python pipeline tests with pytest

---

## Test Coverage Targets

| Phase | Target Coverage | Focus Areas |
|-------|-----------------|-------------|
| Phase 1 | Setup complete | Framework configuration |
| Phase 2 | 30% | Utilities, state management |
| Phase 3 | 60% | API routes, critical components |
| Phase 4 | 80% | Integration, E2E flows |

---

## Recommended Testing Tools

| Tool | Purpose |
|------|---------|
| **Jest** | Test runner, assertions, mocking |
| **React Testing Library** | Component testing |
| **MSW (Mock Service Worker)** | API mocking |
| **Playwright** | E2E testing |
| **pytest** | Python unit/integration tests |
| **pytest-cov** | Python coverage reporting |

---

## Summary of Key Recommendations

1. **Start with utilities** - `bookContext.ts` functions are pure and highly testable with immediate ROI
2. **Test state management** - The accordion context is central to the UX
3. **Add API route tests** - Prevent regressions in data serving
4. **Component tests for AI features** - The chat interface is complex and error-prone
5. **Python pipeline tests** - The processing scripts are critical infrastructure
6. **Set up CI/CD** - Run tests automatically on every commit

The current 0% coverage represents significant technical debt. Implementing these recommendations will dramatically improve code reliability and enable confident refactoring and feature development.
