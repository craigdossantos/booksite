# Generate Critical Inquiry Directive (Stage 2d)

## Goal
Force critical thinking. Passive agreement kills learning. Users must critique the author. This aligns with **McMullen Inquiry** pedagogy.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_inquiry.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_inquiry.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/inquiry.json`

## Inquiry Definition
A "Critical Inquiry" set consists of 3 types of questions:
1.  **The Skeptic**: Challenge the evidence. "Is this always true? What about X case?"
2.  **The Application**: Challenge the utility. "This sounds nice, but how does it work for a single parent with 2 jobs?"
3.  **The Extension**: Challenge the scope. "If everyone did this, what would happen?"

## AI Prompt Strategy
"You are a Devil's Advocate. Read this chapter and generate 3 hard questions.
1. **Evidence Check**: Find a weak point in the argument.
2. **Reality Check**: Find a scenario where this advice fails.
3. **Future Check**: What are the long-term side effects?"
