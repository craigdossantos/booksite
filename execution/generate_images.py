#!/usr/bin/env python3
"""
Generate images for book concepts using Gemini 2.0 Flash Image Generation.

This script reads image_prompts.json and generates actual images using
Google's Gemini 2.0 Flash model with image generation capabilities.
"""

import json
import os
import argparse
import base64
import time
from pathlib import Path
from google import genai
from google.genai import types

# Get API key from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')


def generate_image(prompt: str, style: str, concept_name: str, output_dir: Path, index: int) -> dict | None:
    """Generate an image using Gemini/Imagen Image Generation."""

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Enhance the prompt with style and context
    full_prompt = f"""Generate a high-quality educational illustration:

Style: {style}
Concept: {concept_name}

{prompt}

Guidelines:
- Create a visually striking and memorable image
- Use rich colors and clear composition
- Make it suitable for an educational book/app
- No text overlays or watermarks
- Professional quality artwork"""

    try:
        print(f"  Generating image {index + 1}: {concept_name[:40]}...")

        # Try Gemini 2.0 Flash with image generation first
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp-image-generation",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                )
            )
        except Exception as e1:
            if "not found" in str(e1).lower() or "not supported" in str(e1).lower():
                # Fallback to Imagen 4.0
                print(f"    Trying Imagen 4.0...")
                response = client.models.generate_images(
                    model="imagen-4.0-generate-001",
                    prompt=full_prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                    )
                )
                # Handle Imagen response format
                if response.generated_images:
                    image = response.generated_images[0]
                    safe_name = "".join(c if c.isalnum() or c in "- _" else "_" for c in concept_name)
                    safe_name = safe_name[:50]
                    filename = f"{index:02d}_{safe_name}.png"
                    image_path = output_dir / filename

                    with open(image_path, "wb") as f:
                        f.write(image.image.image_bytes)

                    print(f"    ✓ Saved: {filename}")
                    return {
                        "concept_name": concept_name,
                        "filename": filename,
                        "path": str(image_path),
                        "style": style,
                        "prompt": prompt[:200] + "..." if len(prompt) > 200 else prompt
                    }
                return None
            else:
                raise e1

        # Extract the generated image from response
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    # Save the image
                    image_data = part.inline_data.data
                    extension = part.inline_data.mime_type.split("/")[1]

                    # Create safe filename from concept name
                    safe_name = "".join(c if c.isalnum() or c in "- _" else "_" for c in concept_name)
                    safe_name = safe_name[:50]  # Limit length
                    filename = f"{index:02d}_{safe_name}.{extension}"

                    image_path = output_dir / filename
                    with open(image_path, "wb") as f:
                        f.write(image_data)

                    print(f"    ✓ Saved: {filename}")

                    return {
                        "concept_name": concept_name,
                        "filename": filename,
                        "path": str(image_path),
                        "style": style,
                        "prompt": prompt[:200] + "..." if len(prompt) > 200 else prompt
                    }

        print(f"    ✗ No image generated for {concept_name}")
        return None

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            print(f"    ⚠ Rate limited, waiting 60 seconds...")
            time.sleep(60)
            return generate_image(prompt, style, concept_name, output_dir, index)
        else:
            print(f"    ✗ Error generating image for {concept_name}: {e}")
            return None


def generate_book_images(book_id: str, limit: int = None):
    """Generate images for a specific book."""

    base_path = Path(__file__).parent.parent / "data" / "books" / book_id
    prompts_path = base_path / "image_prompts.json"

    if not prompts_path.exists():
        print(f"No image_prompts.json found for book {book_id}")
        print(f"Expected path: {prompts_path}")
        return

    with open(prompts_path, 'r', encoding='utf-8') as f:
        prompts = json.load(f)

    print(f"Found {len(prompts)} image prompts for book {book_id}")

    # Create images directory
    images_dir = base_path / "images"
    images_dir.mkdir(exist_ok=True)

    # Generate images
    generated = []
    for i, prompt_data in enumerate(prompts):
        if limit and i >= limit:
            break

        result = generate_image(
            prompt=prompt_data.get("prompt", ""),
            style=prompt_data.get("style", "Digital Art"),
            concept_name=prompt_data.get("concept_name", f"concept_{i}"),
            output_dir=images_dir,
            index=i
        )

        if result:
            generated.append(result)

        # Rate limiting - wait between requests
        if i < len(prompts) - 1:
            time.sleep(5)  # 5 seconds between requests

    # Save manifest of generated images
    manifest_path = base_path / "generated_images.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(generated, f, indent=2, ensure_ascii=False)

    print(f"\nGenerated {len(generated)} images")
    print(f"Manifest saved to: {manifest_path}")
    print(f"Images saved to: {images_dir}")


def main():
    parser = argparse.ArgumentParser(description='Generate images for book concepts')
    parser.add_argument('--book_id', type=str, required=True, help='Book ID to generate images for')
    parser.add_argument('--limit', type=int, help='Limit number of images to generate')
    args = parser.parse_args()

    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY environment variable not set")
        return

    generate_book_images(args.book_id, args.limit)


if __name__ == '__main__':
    main()
