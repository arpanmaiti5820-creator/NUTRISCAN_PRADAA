import re


# ============================================================
# Helper functions
# ============================================================

def clean_value(value):
    """Clean OCR noise from an extracted value."""
    if value is None:
        return None

    value = value.strip()
    value = re.sub(r"\s+", " ", value)

    return value.strip(" :-")


def extract_date(value):
    """
    Extract common Indian package date formats.

    Examples:
        23/07/26
        16 MAY 2026
        07JUL2026
        15 FEB 2027
        07-JUL-2026
    """

    if not value:
        return None

    patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{1,2}[\s-]+[A-Za-z]{3,9}[\s-]+\d{2,4}\b",
        r"\b\d{1,2}[A-Za-z]{3,9}\d{2,4}\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, value, re.IGNORECASE)

        if match:
            return match.group(0)

    return None


def extract_all_dates(value):
    """Return all recognizable dates from a string."""

    if not value:
        return []

    patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{1,2}[\s-]+[A-Za-z]{3,9}[\s-]+\d{2,4}\b",
        r"\b\d{1,2}[A-Za-z]{3,9}\d{2,4}\b",
    ]

    matches = []

    for pattern in patterns:
        matches.extend(
            re.findall(pattern, value, re.IGNORECASE)
        )

    # Remove duplicates while preserving order
    unique = []

    for item in matches:
        if item not in unique:
            unique.append(item)

    return unique


def normalize_quantity(number, unit):
    """Normalize quantity units."""

    unit = unit.lower()

    unit_map = {
        "gm": "g",
        "gram": "g",
        "grams": "g",
        "kg": "kg",
        "g": "g",
        "ml": "ml",
        "l": "l",
        "litre": "l",
        "liter": "l",
    }

    normalized_unit = unit_map.get(unit, unit)

    return f"{number} {normalized_unit}"


def is_unit_price(text, start_position=None):
    """
    Check whether a number belongs to a per-unit price,
    e.g. 0.50/g or 0.30/kg.
    """

    if start_position is None:
        return False

    remaining = text[start_position:]

    return bool(
        re.match(
            r"\s*/\s*(?:kg|g|gm|ml|l|litre|liter)\b",
            remaining,
            re.IGNORECASE
        )
    )


# ============================================================
# Main extraction
# ============================================================

def extract_fields(text):

    data = {
        "net_quantity": None,
        "mrp": None,
        "batch_number": None,
        "packing_date": None,
        "manufacturing_date": None,
        "expiry_date": None,
        "manufacturer": None,
        "manufacturer_address": None,
        "consumer_care": None,
        "barcode": None
    }


    # ========================================================
    # Normalize OCR text
    # ========================================================

    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)

    lines = [
        line.strip()
        for line in text.split("\n")
        if line.strip()
    ]


    # ========================================================
    # NET QUANTITY
    # ========================================================

        # ========================================================
    # NET QUANTITY
    # ========================================================

    quantity_patterns = [

        # Same-line formats:
        # NET WEIGHT: 200 g
        # NET QUANTITY: 200 g
        # NET CONTENTS: 425 gm
        r"(?:NET\s+WEIGHT|NET\s+QUANTITY|NET\s+CONTENTS?)"
        r"\s*[:\-]?\s*"
        r"([\d.]+)\s*"
        r"(kg|g|gm|grams?|ml|l|litre|liter)",

        # OCR variations:
        # NET QTY: 200 g
        # NET WT: 200 g
        # NET MT: 200 g
        r"(?:NET\s*QTY|NET\s*MT|NET\s*WT)"
        r"\s*[:\-]?\s*"
        r"([\d.]+)\s*"
        r"(kg|g|gm|grams?|ml|l|litre|liter)",
    ]

    # --------------------------------------------------------
    # 1. Try same-line quantity
    # --------------------------------------------------------

    for pattern in quantity_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            data["net_quantity"] = normalize_quantity(
                match.group(1),
                match.group(2)
            )
            break

    # --------------------------------------------------------
    # 2. Try label on one line + value on next line
    #
    # Example:
    # Net Contents
    # 425 gm
    # --------------------------------------------------------

    if data["net_quantity"] is None:

        quantity_label = re.compile(
            r"(?:NET\s+WEIGHT|NET\s+QUANTITY|NET\s+CONTENTS?|"
            r"NET\s*QTY|NET\s*WT|NET\s*MT)",
            re.IGNORECASE
        )

        for index, line in enumerate(lines):

            if not quantity_label.search(line):
                continue

            # Check the next 2 lines for a quantity.
            for next_line in lines[index + 1:index + 3]:

                value_match = re.search(
                    r"\b([\d.]+)\s*"
                    r"(kg|g|gm|grams?|ml|l|litre|liter)\b",
                    next_line,
                    re.IGNORECASE
                )

                if value_match:

                    data["net_quantity"] = normalize_quantity(
                        value_match.group(1),
                        value_match.group(2)
                    )
                    break

            if data["net_quantity"]:
                break

    # ========================================================
    # MRP
    # ========================================================

    mrp_labels = re.compile(
        r"(?:"
        r"MRP|"
        r"M\.?\s*R\.?\s*P\.?|"
        r"MAX\.?\s*RETAIL\s*PRICE"
        r")",
        re.IGNORECASE
    )

    for i, line in enumerate(lines):

        label_match = mrp_labels.search(line)

        if not label_match:
            continue

        # Search current line + next two lines.
        search_lines = lines[i:i + 3]
        search_text = " ".join(search_lines)

        after_label = search_text[label_match.end():]

        # Find all possible monetary values.
        number_matches = list(
            re.finditer(
                r"\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b",
                after_label
            )
        )

        for number_match in number_matches:

            value = number_match.group(0)

            start = number_match.end()

            # Ignore unit prices like 0.50/g or 0.30/kg
            if is_unit_price(after_label, start):
                continue

            # Ignore obviously tiny decimal values when they are
            # written as per-unit prices.
            if float(value.replace(",", "")) == 0:
                continue

            data["mrp"] = value.replace(",", "")
            break

        if data["mrp"]:
            break


    # ========================================================
    # BATCH NUMBER
    # ========================================================

    batch_keywords = re.compile(
        r"\b(?:BATCH|BATCHNO|LOT)\b",
        re.IGNORECASE
    )

    batch_stop_words = {
        "NO",
        "NUMBER",
        "DATE",
        "MFD",
        "MFG",
        "USEBY",
        "USE",
        "SEE",
        "SEEBELOW",
        "CODE",
        "INDICATES",
    }

    for i, line in enumerate(lines):

        if not batch_keywords.search(line):
            continue

        search_lines = lines[i:i + 3]

        for candidate_line in search_lines:

            # Try code-like values.
            candidates = re.findall(
                r"[A-Za-z0-9()\-\/]{4,}",
                candidate_line
            )

            for candidate in candidates:

                cleaned = candidate.strip(":-., ")

                upper = cleaned.upper()

                # Must contain at least one digit.
                if not re.search(r"\d", cleaned):
                    continue

                # Reject common OCR false positives.
                if upper in batch_stop_words:
                    continue

                # Reject long date-like values.
                if extract_date(cleaned):
                    continue

                # Reject phone numbers.
                if re.fullmatch(r"[6-9]\d{9}", cleaned):
                    continue

                data["batch_number"] = cleaned
                break

            if data["batch_number"]:
                break

        if data["batch_number"]:
            break


    # ========================================================
    # PACKING DATE
    # ========================================================

    packing_label = re.compile(
        r"(?:"
        r"DATE\s+OF\s+PACKAGING|"
        r"DATE\s+OF\s+PACKING|"
        r"PKG\.?\s*DATE|"
        r"PACKING\s*DATE"
        r")",
        re.IGNORECASE
    )

    for i, line in enumerate(lines):

        match = packing_label.search(line)

        if not match:
            continue

        search_text = " ".join(lines[i:i + 3])

        after = search_text[match.end():]

        date = extract_date(after)

        if date:
            data["packing_date"] = date
            break


    # ========================================================
    # MANUFACTURING DATE
    # ========================================================

    manufacturing_label = re.compile(
        r"(?:"
        r"MFD\.?|"
        r"MFG\.?|"
        r"MANUFACTURING\s+DATE|"
        r"MANUFACTURED\s+DATE"
        r")",
        re.IGNORECASE
    )

    for i, line in enumerate(lines):

        match = manufacturing_label.search(line)

        if not match:
            continue

        search_text = " ".join(lines[i:i + 3])

        after = search_text[match.end():]

        date = extract_date(after)

        if date:
            data["manufacturing_date"] = date
            break


    # ========================================================
    # EXPIRY / USE BY DATE
    # ========================================================

    expiry_label = re.compile(
        r"(?:"
        r"USE\s*BY(?:\s*DATE)?|"
        r"USEBY|"
        r"EXPIRY\s*DATE|"
        r"EXP\.?\s*DATE|"
        r"BEST\s*BEFORE"
        r")",
        re.IGNORECASE
    )

    for i, line in enumerate(lines):

        match = expiry_label.search(line)

        if not match:
            continue

        search_text = " ".join(lines[i:i + 3])

        after = search_text[match.end():]

        date = extract_date(after)

        if date:
            data["expiry_date"] = date
            break


    # ========================================================
    # SPECIAL CASE:
    # Packaging + Use By dates appearing together
    #
    # Example:
    # 07JUL2026  06JUL2027
    # ========================================================

    if (
        data["packing_date"] is None
        or data["expiry_date"] is None
    ):

        combined_date_context = re.search(
            r"(?:DATE\s*OF\s*PACKAGING|DATE\s*OF\s*PACKING|"
            r"PACKAGING|PACKING).*?"
            r"(?:USE\s*BY|USEBY|EXPIRY).*",
            text,
            re.IGNORECASE | re.DOTALL
        )

        if combined_date_context:

            dates = extract_all_dates(
                combined_date_context.group(0)
            )

            if len(dates) >= 2:

                if data["packing_date"] is None:
                    data["packing_date"] = dates[0]

                if data["expiry_date"] is None:
                    data["expiry_date"] = dates[1]


    # ========================================================
    # MANUFACTURER
    # ========================================================

    manufacturer_keywords = [
        "MANUFACTURED BY",
        "MANUFACTURED FOR",
        "MARKETED BY",
        "DISTRIBUTED BY",
        "MFD. & MKTD. BY",
        "MFD & MKTD BY",
        "MFD. & MKTD BY"
    ]

    manufacturer_bad_words = [
        "NO PRESERVATIVES",
        "ADDED COLOURS",
        "COMPLAINT",
        "CONTACT",
        "CUSTOMER CARE",
        "FOR FEEDBACK",
        "INGREDIENT",
        "NUTRITION",
        "INDICATES",
        "DATE OF",
        "BATCH",
        "EXP.",
        "USE BY",
        "LICENSE",
        "LIC. NO",
        "EMAIL",
        "WWW.",
        "FACEBOOK",
        "INSTAGRAM"
    ]

    def valid_manufacturer(candidate):

        if not candidate:
            return False

        candidate = clean_value(candidate)

        if len(candidate) < 5:
            return False

        upper = candidate.upper()

        for bad_word in manufacturer_bad_words:
            if bad_word in upper:
                return False

        # Reject mostly numeric strings.
        digits = sum(char.isdigit() for char in candidate)

        if digits > len(candidate) * 0.5:
            return False

        return True


    for i, line in enumerate(lines):

        found_keyword = None

        for keyword in manufacturer_keywords:

            if keyword.lower() in line.lower():
                found_keyword = keyword
                break

        if not found_keyword:
            continue


        # ----------------------------------------------------
        # Text on the same line
        # ----------------------------------------------------

        after = re.split(
            re.escape(found_keyword),
            line,
            maxsplit=1,
            flags=re.IGNORECASE
        )[-1].strip(" :-")

        if valid_manufacturer(after):
            data["manufacturer"] = after
            break


        # ----------------------------------------------------
        # Look at following lines
        # ----------------------------------------------------

        for next_line in lines[i + 1:i + 6]:

            candidate = clean_value(next_line)

            if valid_manufacturer(candidate):
                data["manufacturer"] = candidate
                break

        if data["manufacturer"]:
            break


    # ========================================================
    # MANUFACTURER ADDRESS
    # ========================================================

    address_patterns = [
        r"(?:Corporate Office|Registered Office)"
        r"\s*:\s*(.+)",

        r"(?:Unit Address|Manufacturing Unit Address)"
        r"\s*:\s*(.+)",

        r"(?:Address)"
        r"\s*:\s*(.+)"
    ]

    # First try explicitly labelled addresses.
    for pattern in address_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            address = clean_value(
                match.group(1)
            )

            if address:
                data["manufacturer_address"] = address
                break


    # Common strong address indicators.
    address_keywords = [
        "ROAD",
        "RD.",
        "STREET",
        "LANE",
        "CROSSING",
        "NAGAR",
        "MARG",
        "SECTOR",
        "HOUSE",
        "KH.",
        "VILLAGE",
        "DISTRICT",
        "DELHI",
        "MUMBAI",
        "KOLKATA",
        "AHMEDABAD",
        "BENGALURU",
        "BANGALORE",
        "NAGPUR",
        "RAIPUR",
        "CHHATTISGARH",
        "GUJARAT",
        "MAHARASHTRA",
        "WEST BENGAL",
        "PIN"
    ]

    def looks_like_address(line):

        upper = line.upper()

        # Strong address clue: Indian PIN code.
        if re.search(r"\b\d{6}\b", line):
            return True

        # Road / location indicators.
        if any(
            keyword in upper
            for keyword in address_keywords
        ):
            return True

        return False


    if not data["manufacturer_address"]:

        # Search around manufacturer section first.
        start_index = 0

        if data["manufacturer"]:

            for i, line in enumerate(lines):

                if data["manufacturer"].lower() in line.lower():
                    start_index = i
                    break

        for line in lines[start_index:start_index + 12]:

            upper = line.upper()

            # Avoid contact/social media lines.
            if any(
                word in upper
                for word in [
                    "EMAIL",
                    "WWW.",
                    "FACEBOOK",
                    "INSTAGRAM",
                    "CALL US",
                    "CUSTOMER CARE",
                    "COMPLAINT"
                ]
            ):
                continue

            if looks_like_address(line):

                data["manufacturer_address"] = clean_value(line)
                break


    # ========================================================
    # CONSUMER CARE
    # ========================================================

    phone_patterns = [
        r"\b[6-9]\d{9}\b",
        r"\b[6-9]\d{4}\s\d{5}\b",
        r"\+91[\s-]?[6-9]\d{9}"
    ]

    # Prefer numbers occurring in customer-care context.
    priority_lines = [
        line
        for line in lines
        if any(
            word in line.upper()
            for word in [
                "CUSTOMER CARE",
                "CONSUMER CARE",
                "CONTACT",
                "COMPLAINT",
                "FEEDBACK",
                "CALL US"
            ]
        )
    ]

    search_phone_lines = priority_lines + lines

    for line in search_phone_lines:

        for pattern in phone_patterns:

            match = re.search(
                pattern,
                line
            )

            if not match:
                continue

            phone = re.sub(
                r"\D",
                "",
                match.group(0)
            )

            if phone.startswith("91") and len(phone) == 12:
                phone = phone[2:]

            if len(phone) == 10:

                data["consumer_care"] = phone
                break

        if data["consumer_care"]:
            break


    # ========================================================
    # BARCODE
    # ========================================================

    # Do NOT guess barcode values from OCR text.
    #
    # Barcode detection/decoding will be implemented separately
    # using an actual image barcode detector/decoder.

    data["barcode"] = None


    return data


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    sample_text = """
    NET WEIGHT:
    200 g

    BATCH NO.:
    (AE)ZGSC230001

    DATE OF PACKING:
    23/07/26

    USE BY DATE:
    22/07/27

    M.R.P.:R
    60.00
    0.30/g

    Marketed by
    Zoff Foods

    Corporate Office:
    Ring Road No.2, Raipur, Chhattisgarh, India

    For feedback complaints contact customer care
    9584822000
    """

    result = extract_fields(sample_text)

    print("\n--- EXTRACTED FIELDS ---\n")

    for key, value in result.items():
        print(f"{key}: {value}")