from pathlib import Path
from paddleocr import PaddleOCR
from field_extractor import extract_fields


# ============================================================
# OCR setup
# ============================================================

ocr = PaddleOCR(
    lang="en"
)


# ============================================================
# Image path
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

image_path = BASE_DIR / "dataset" / "images" / "image.png"


# ============================================================
# Run OCR
# ============================================================

result = ocr.predict(str(image_path))


# Collect all detected text
all_text = []

for res in result:
    data = res.json

    for item in data["res"]["rec_texts"]:
        all_text.append(item)


# Combine OCR text
ocr_text = "\n".join(all_text)


# ============================================================
# Show OCR result
# ============================================================

print("\n--- OCR RESULT ---\n")

print(ocr_text)


# ============================================================
# Extract LM Check fields
# ============================================================

fields = extract_fields(ocr_text)


print("\n--- EXTRACTED LM CHECK FIELDS ---\n")


for key, value in fields.items():
    print(f"{key}: {value}")