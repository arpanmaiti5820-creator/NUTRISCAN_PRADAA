from pathlib import Path
import json

from paddleocr import PaddleOCR
from field_extractor import extract_fields


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

IMAGE_FOLDER = BASE_DIR / "dataset" / "images"
OUTPUT_FILE = BASE_DIR / "dataset" / "results.json"


# ============================================================
# Initialize PaddleOCR once
# ============================================================

ocr = PaddleOCR(
    lang="en"
)


# ============================================================
# Analyze one image
# ============================================================

def analyze_image(image_path):
    # Run OCR
    result = ocr.predict(str(image_path))

    # Collect recognized text
    all_text = []

    for res in result:
        data = res.json

        texts = data["res"]["rec_texts"]

        for text in texts:
            all_text.append(text)

    # Combine OCR text
    ocr_text = "\n".join(all_text)

    # Extract structured LM Check fields
    fields = extract_fields(ocr_text)

    return {
        "ocr_text": ocr_text,
        "fields": fields
    }


# ============================================================
# Main batch processing
# ============================================================

def main():

    # Check image folder
    if not IMAGE_FOLDER.exists():
        print(f"ERROR: Folder not found:\n{IMAGE_FOLDER}")
        return

    # Find images
    image_files = sorted(
        [
            file
            for file in IMAGE_FOLDER.iterdir()
            if file.suffix.lower() in [".png", ".jpg", ".jpeg"]
        ],
        key=lambda x: x.name.lower()
    )

    print("\n======================================")
    print("       LM CHECK - BATCH ANALYSIS")
    print("======================================")

    print(f"\nFound {len(image_files)} images.\n")

    results = []

    # ========================================================
    # Process every image
    # ========================================================

    for index, image_path in enumerate(image_files, start=1):

        print("--------------------------------------")
        print(f"Processing {index}/{len(image_files)}")
        print(f"Image: {image_path.name}")
        print("--------------------------------------")

        try:
            analysis = analyze_image(image_path)

            results.append({
                "image": image_path.name,
                "ocr_text": analysis["ocr_text"],
                "fields": analysis["fields"]
            })

            print("✓ Completed")

            # Show extracted fields
            print("\nExtracted fields:")

            for key, value in analysis["fields"].items():
                print(f"  {key}: {value}")

            print()

        except Exception as error:

            print("✗ Error:", error)

            results.append({
                "image": image_path.name,
                "error": str(error)
            })


    # ========================================================
    # Save results
    # ========================================================

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            results,
            file,
            indent=4,
            ensure_ascii=False
        )


    # ========================================================
    # Done
    # ========================================================

    print("======================================")
    print("          BATCH COMPLETE")
    print("======================================")

    print(f"\nResults saved to:")
    print(OUTPUT_FILE)

    print(f"\nProcessed {len(results)} images.")


# ============================================================
# Start
# ============================================================

if __name__ == "__main__":
    main()