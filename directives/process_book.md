# Process Book Directive

## Goal
Process a digital book (EPUB) to extract chapters, analyze them using AI, and generate a study guide.

## Inputs
- `filename`: The name of the EPUB file located in `public/books/`. Example: `my_book.epub`.

## Tools
- `execution/process_book.py`: A Python script that parses the EPUB and calls the Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure the `filename` is provided and the file exists in `public/books/`.
2.  **Run Script**: Execute the Python script with the filename.
    ```bash
    python3 execution/process_book.py --filename "my_book.epub"
    ```
3.  **Output**: The script will generate a JSON file in `data/` with the same basename as the input file (e.g., `data/my_book.json`).

## Error Handling
- If the file is not found, the script will exit with an error.
- If the API call fails, the script should log the error and try to continue or fail gracefully.
