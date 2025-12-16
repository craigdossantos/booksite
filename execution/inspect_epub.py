import argparse
import zipfile
import os
import sys

def inspect_epub(filename):
    base_dir = os.getcwd()
    books_dir = os.path.join(base_dir, "public", "books")
    file_path = os.path.join(books_dir, filename)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Inspecting EPUB: {filename}")
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            for name in z.namelist():
                if 'cover' in name.lower() or 'jpg' in name.lower() or 'jpeg' in name.lower():
                    print(name)
    except Exception as e:
        print(f"Error reading EPUB as zip: {e}", file=sys.stderr)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect EPUB zip.")
    parser.add_argument("--filename", required=True, help="Filename of the EPUB")
    args = parser.parse_args()
    inspect_epub(args.filename)
