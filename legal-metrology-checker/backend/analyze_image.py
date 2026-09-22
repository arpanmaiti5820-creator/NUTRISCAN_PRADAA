from paddleocr import PaddleOCR
from field_extractor import extract_fields


# -----------------------------------------
# Initialize PaddleOCR
# -----------------------------------------

ocr = PaddleOCR(
    lang="en"
)


# -----------------------------------------
# Analyze image
# -----------------------------------------

def analyze_image(image_path):

    print("\n===================================")
    print("        LM CHECK - IMAGE ANALYSIS")
    print("===================================\n")

    print("Image:", image_path)
    print("\nRunning PaddleOCR...\n")

    # Run OCR
    result = ocr.predict(image_path)

    # Store all recognized text
    all_text = []

    for res in result:

        data = res.json

        texts = data["res"]["rec_texts"]

        for text in texts:
            all_text.append(text)

    # Combine OCR text
    ocr_text = "\n".join(all_text)

    # -----------------------------------------
    # Display OCR text
    # -----------------------------------------

    print("-----------------------------------")
    print("          OCR TEXT")
    print("-----------------------------------")

    print(ocr_text)

    # -----------------------------------------
    # Extract fields
    # -----------------------------------------

    extracted_data = extract_fields(ocr_text)

    # -----------------------------------------
    # Display extracted fields
    # -----------------------------------------

    print("\n-----------------------------------")
    print("       EXTRACTED PRODUCT DATA")
    print("-----------------------------------")

    for key, value in extracted_data.items():
        print(f"{key}: {value}")

    return extracted_data


# -----------------------------------------
# Run test
# -----------------------------------------

if __name__ == "__main__":

    image_path = "dataset/images/image.png"

    analyze_image(image_path)