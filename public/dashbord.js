

/* ============================================================
   1. OCR CONFIG
   ============================================================ */
//    const OCR_API_URL = "/api/ocr";
    

const OCR_MAX_BYTES = 950 * 1024; // stay safely under the 1 MB API limit


/* ============================================================
   2. GLOBAL VARIABLES
   ============================================================ */

let currentUser = null;
let selectedFile = null;
let legalMetrologyRules = [];

/* ============================================================
   3. LOGIN
   ============================================================ */

try {
    currentUser = JSON.parse(
        localStorage.getItem("lmCurrentUser") || "null"
    );
} catch (error) {
    console.error("Login data error:", error);
}

if (!currentUser) {
    window.location.href = "login.html";
}


/* ============================================================
   4. DOM REFERENCES
   ============================================================ */

const navItems = document.querySelectorAll("[data-section]");
const pageSections = document.querySelectorAll(".page-section");

const topUserName = document.getElementById("topUserName");
const topUserRole = document.getElementById("topUserRole");

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileFullName = document.getElementById("profileFullName");
const profileEmailDetail = document.getElementById("profileEmailDetail");

const logoutButton = document.getElementById("logoutButton");

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mobileNavigation =
    document.getElementById("mobileNavigation");

const uploadArea =
    document.getElementById("uploadArea");

const productImage =
    document.getElementById("productImage");

const imagePreview =
    document.getElementById("imagePreview");

const removeImageButton =
    document.getElementById("removeImageButton");

const analyzeButton =
    document.getElementById("analyzeButton");

const analysisResult =
    document.getElementById("analysisResult");

const resultStatus =
    document.getElementById("resultStatus");

const totalInspections =
    document.getElementById("totalInspections");

const compliantCount =
    document.getElementById("compliantCount");

const nonCompliantCount =
    document.getElementById("nonCompliantCount");

const complianceRate =
    document.getElementById("complianceRate");

const overviewPercentage =
    document.getElementById("overviewPercentage");

const progressFill =
    document.getElementById("progressFill");

const recentInspectionTable =
    document.getElementById("recentInspectionTable");

const reportSearch =
    document.getElementById("reportSearch");

const reportStatusFilter =
    document.getElementById("reportStatusFilter");

const reportsTable =
    document.getElementById("reportsTable");

const generateReportButton =
    document.getElementById("generateReportButton");

const historySearch =
    document.getElementById("historySearch");

const historyStatusFilter =
    document.getElementById("historyStatusFilter");

const historyTable =
    document.getElementById("historyTable");


/* ============================================================
   5. USER INFORMATION
   ============================================================ */

function loadUserInformation() {

    if (!currentUser) {
        return;
    }

    const name =
        currentUser.name ||
        currentUser.fullName ||
        "Inspector";

    const role =
        currentUser.role ||
        "Inspector";

    const email =
        currentUser.email ||
        "inspector@example.com";


    if (topUserName) {
        topUserName.textContent = name;
    }

    if (topUserRole) {
        topUserRole.textContent = role;
    }

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileEmail) {
        profileEmail.textContent = email;
    }

    if (profileFullName) {
        profileFullName.textContent = name;
    }

    if (profileEmailDetail) {
        profileEmailDetail.textContent = email;
    }
}

loadUserInformation();


/* ============================================================
   6. NAVIGATION
   ============================================================ */

function showSection(sectionId) {

    pageSections.forEach(section => {

        section.style.display =
            section.id === sectionId
                ? "block"
                : "none";

    });


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.section === sectionId
        );

    });


    if (mobileNavigation) {
        mobileNavigation.classList.remove("active");
    }


    if (sectionId === "dashboard") {
        updateDashboard();
    }

    if (sectionId === "reports") {
        renderReports();
    }

    if (sectionId === "history") {
        renderHistory();
    }
}


navItems.forEach(item => {

    item.addEventListener("click", function (event) {

        const sectionId =
            this.dataset.section;

        if (!sectionId) {
            return;
        }

        event.preventDefault();

        showSection(sectionId);

    });

});


/* ============================================================
   7. MOBILE MENU
   ============================================================ */

if (mobileMenuButton && mobileNavigation) {

    mobileMenuButton.addEventListener(
        "click",
        function () {

            mobileNavigation.classList.toggle(
                "active"
            );

        }
    );

}


/* ============================================================
   8. LOGOUT
   ============================================================ */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "lmCurrentUser"
            );

            window.location.href =
                "login.html";

        }
    );

}


/* ============================================================
   9. LOCAL STORAGE
   ============================================================ */

function getInspections() {

    try {

        const value =
            localStorage.getItem(
                "lmInspections"
            );

        if (!value) {
            return [];
        }

        const parsed =
            JSON.parse(value);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Inspection storage error:",
            error
        );

        return [];

    }

}


function saveInspections(
    inspections
) {

    localStorage.setItem(
        "lmInspections",
        JSON.stringify(inspections)
    );

}


/* ============================================================
   10. IMAGE COMPRESSION (NEW)
   Keeps uploads under the OCR.space free API's 1 MB limit
   while preserving enough resolution for label text to
   remain legible.
   ============================================================ */

function loadImageBitmapSafe(file) {

    /*
       createImageBitmap is fast and widely supported, but we
       fall back to an <img> element for older browsers.
    */

    if (typeof createImageBitmap === "function") {

        return createImageBitmap(file);

    }

    return new Promise((resolve, reject) => {

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = function () {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = function (error) {
            URL.revokeObjectURL(url);
            reject(error);
        };

        img.src = url;

    });

}


async function compressImage(
    file,
    maxBytes = OCR_MAX_BYTES
) {

    if (
        !file ||
        file.size <= maxBytes
    ) {
        return file;
    }


    let source;

    try {

        source =
            await loadImageBitmapSafe(file);

    } catch (error) {

        console.error(
            "Compression source load failed:",
            error
        );

        return file;

    }


    const canvas =
        document.createElement("canvas");

    const context =
        canvas.getContext("2d");


    let width =
        source.width || source.naturalWidth;

    let height =
        source.height || source.naturalHeight;


    if (!width || !height) {
        return file;
    }


    let quality = 0.9;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(source, 0, 0, width, height);


    let blob =
        await new Promise(resolve =>
            canvas.toBlob(resolve, "image/jpeg", quality)
        );


    let attempts = 0;


    while (
        blob &&
        blob.size > maxBytes &&
        attempts < 12
    ) {

        attempts++;


        if (quality > 0.5) {

            quality -= 0.1;

        } else {

            width = Math.round(width * 0.8);
            height = Math.round(height * 0.8);

            canvas.width = width;
            canvas.height = height;

            context.clearRect(0, 0, width, height);
            context.drawImage(source, 0, 0, width, height);

        }


        blob =
            await new Promise(resolve =>
                canvas.toBlob(resolve, "image/jpeg", quality)
            );

    }


    if (!blob) {
        return file;
    }


    console.log(
        `Compressed image: ${(file.size / 1024).toFixed(0)}KB -> ${(blob.size / 1024).toFixed(0)}KB`
    );


    return new File(
        [blob],
        file.name.replace(/\.\w+$/, ".jpg"),
        { type: "image/jpeg" }
    );

}


/* ============================================================
   11. FILE UPLOAD
   ============================================================ */

async function handleSelectedFile(file) {

    if (!file) {
        return;
    }


    if (
        !file.type ||
        !file.type.startsWith("image/")
    ) {

        alert(
            "Please select a valid image file."
        );

        return;

    }


    if (file.size > 10 * 1024 * 1024) {

        alert(
            "Image size must be below 10 MB."
        );

        return;

    }


    /*
       FIX: compress large photos down to the OCR API's
       actual 1 MB limit instead of just alerting and
       hoping OCR.space accepts it. This is what was
       silently breaking report generation.
    */

    let fileToUse = file;

    try {

        fileToUse =
            await compressImage(file);

    } catch (error) {

        console.error(
            "Image compression failed, using original file:",
            error
        );

        fileToUse = file;

    }


    selectedFile = fileToUse;


    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            if (!imagePreview) {
                return;
            }


            imagePreview.innerHTML = `

                <img
                    src="${event.target.result}"
                    alt="Product Preview"
                    style="
                        width:100%;
                        max-height:400px;
                        object-fit:contain;
                        border-radius:12px;
                    "
                >

            `;


            imagePreview.style.display =
                "block";

        };


    reader.readAsDataURL(fileToUse);


    if (analyzeButton) {
        analyzeButton.disabled = false;
    }

}


if (productImage) {

    productImage.addEventListener(
        "change",
        function () {

            if (
                this.files &&
                this.files.length > 0
            ) {

                handleSelectedFile(
                    this.files[0]
                );

            }

        }
    );

}


/* ============================================================
   12. DRAG AND DROP
   ============================================================ */

if (uploadArea) {

    uploadArea.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            uploadArea.classList.add(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        function () {

            uploadArea.classList.remove(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            uploadArea.classList.remove(
                "drag-over"
            );


            if (
                event.dataTransfer.files &&
                event.dataTransfer.files.length > 0
            ) {

                handleSelectedFile(
                    event.dataTransfer.files[0]
                );

            }

        }
    );

}


/* ============================================================
   13. REMOVE IMAGE
   ============================================================ */

if (removeImageButton) {

    removeImageButton.addEventListener(
        "click",
        function () {

            selectedFile = null;


            if (productImage) {
                productImage.value = "";
            }


            if (imagePreview) {

                imagePreview.innerHTML = "";

                imagePreview.style.display =
                    "none";

            }


            if (analysisResult) {

                analysisResult.style.display =
                    "none";

            }


            if (analyzeButton) {
                analyzeButton.disabled = true;
            }

        }
    );

}


/* ============================================================
   14. OCR API
   ============================================================ */

async function performOCR(file) {
    try {
        if (!file) {
            throw new Error("No image selected.");
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ocr", {
            method: "POST",
            body: formData
        });

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error(
                `Server returned invalid response. HTTP ${response.status}`
            );
        }

        console.log("========== NODE OCR RESPONSE ==========");
        console.log(data);

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "OCR processing failed."
            );
        }

        const text = String(data.text || "").trim();

        if (!text) {
            throw new Error(
                "OCR did not detect any readable text. Please upload a clear, close-up image of the product label."
            );
        }

        console.log("========== OCR TEXT ==========");
        console.log(text);

        return text;

    } catch (error) {
        console.error("OCR Error:", error);
        throw error;
    }
}

/* ============================================================
   15. TEXT HELPERS
   ============================================================ */

function normalizeOCRText(text) {

    return String(text || "")

        .replace(/\r/g, "\n")

        .replace(
            /[\u00A0\u2007\u202F]/g,
            " "
        )

        .replace(
            /\t+/g,
            " "
        )

        .replace(
            /[ ]{2,}/g,
            " "
        )

        .replace(
            /[ ]+\n/g,
            "\n"
        )

        .replace(
            /\n[ ]+/g,
            "\n"
        )

        .replace(
            /\n{3,}/g,
            "\n\n"
        )

        .trim();

}


function getLines(text) {

    return normalizeOCRText(text)

        .split("\n")

        .map(
            line =>
                line.trim()
        )

        .filter(Boolean);

}


function cleanValue(value) {

    if (!value) {
        return "";
    }


    return String(value)

        .replace(
            /^[\s:;,.\-–—]+/,
            ""
        )

        .replace(
            /[\s:;,.\-–—]+$/,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ============================================================
   16. NUMBER CLEANING
   ============================================================ */

function cleanNumber(value) {

    return String(value || "")
        .replace(/O/g, "0")
        .replace(/o/g, "0")
        .replace(/I/g, "1")
        .replace(/l/g, "1")
        .replace(/S/g, "5")
        .replace(/B/g, "8");

}


/* ============================================================
   17. PRODUCT NAME
   Generic - NOT FOOD ONLY
   ============================================================ */

function extractProductName(text) {

    const lines =
        getLines(text);


    for (const line of lines) {
    const match = line.match(
        /^:\s*([A-Za-z][A-Za-z0-9 &.'()\-]{2,50})$/
    );

    if (match) {
        const value = cleanProductName(match[1]);

        if (value) {
            return value;
        }
    }
}
    /*
       1. Explicit product-name label.
    */

    for (const line of lines) {

        const match =
            line.match(
                /(?:product\s*name|name\s*of\s*(?:the\s*)?product)\s*[:\-]\s*(.+)/i
            );


        if (
            match &&
            match[1]
        ) {

            return cleanProductName(
                match[1]
            );

        }

    }


    /*
       2. Generic product indicators.

       This is deliberately NOT limited
       to food products.
    */

    for (let i = 0; i < lines.length; i++) {

        const line =
            lines[i];


        const match =
            line.match(
                /^(?:product|brand|item)\s*[:\-]\s*(.+)$/i
            );


        if (
            match &&
            match[1]
        ) {

            return cleanProductName(
                match[1]
            );

        }

    }


    /*
       3. Find likely product title.

       Reject declaration/marketing lines.
    */

    const ignoredPatterns = [

        /manufactur/i,

        /marketed/i,

        /packed\s*by/i,

        /packer/i,

        /net\s*(quantity|qty|weight|wt)/i,

        /mrp/i,

        /maximum\s*retail/i,

        /batch/i,

        /lot\s*(no|number)?/i,

        /expiry/i,

        /use\s*by/i,

        /best\s*before/i,

        /fssai/i,

        /licen[cs]e/i,

        /address/i,

        /pincode/i,

        /pin\s*code/i,

        /barcode/i,

        /ingredients?/i,

        /nutrition/i,

        /contains/i,

        /warning/i,

        /caution/i,

        /storage/i,

        /customer\s*care/i,

        /www\./i,

        /http/i,

        /email/i,

        /phone/i,

        /tel/i,

        /toll\s*free/i,

        /artificial/i,

        /natural/i,

        /keep\s*(in|away)/i,

        /store\s*(in|at)/i,

        /date\s*of/i

    ];


    const candidates = [];


    for (let i = 0; i < lines.length; i++) {

        const line =
            cleanValue(lines[i]);


        if (
            line.length < 3 ||
            line.length > 60
        ) {
            continue;
        }


        if (
            ignoredPatterns.some(
                pattern =>
                    pattern.test(line)
            )
        ) {
            continue;
        }


        /*
           Don't use lines that are
           almost entirely numbers.
        */

        const letters =
            line.replace(
                /[^A-Za-z]/g,
                ""
            );


        if (letters.length < 3) {
            continue;
        }


        if (
            /^\d+[\s\-/.]*[A-Za-z]*$/i.test(line)
        ) {
            continue;
        }


        /*
           Reject obvious long sentences.
        */

        if (
            line.split(" ").length > 12
        ) {
            continue;
        }


        let score = 0;


        /*
           Product titles are often short.
        */

        if (
            line.split(" ").length <= 5
        ) {
            score += 3;
        }


        if (
            /^[A-Z0-9][A-Za-z0-9 &./'()\-]+$/.test(line)
        ) {
            score += 1;
        }


        /*
           Lines near the beginning are often
           brand/product information.
        */

        if (i < 6) {
            score += 1;
        }


        candidates.push({
            line,
            score
        });

    }


    candidates.sort(
        (a, b) =>
            b.score - a.score
    );


    if (candidates.length > 0) {

        return cleanProductName(
            candidates[0].line
        );

    }


    return "";

}


function cleanProductName(value) {

    let result =
        cleanValue(value);


    result =
        result.replace(
            /\b(?:mrp|maximum\s+retail\s+price)\b.*$/i,
            ""
        );


    result =
        result.replace(
            /\b(?:net\s*(?:qty|quantity|weight|wt))\b.*$/i,
            ""
        );


    return cleanValue(
        result
    );

}


/* ============================================================
   18. MANUFACTURER
   ============================================================ */

function extractManufacturer(text) {

    const normalized =
        normalizeOCRText(text);

   const patterns = [
    /manufactured\s*(?:and|&)\s*marketed\s*by\s*[:\-]?\s*([^\n]+)/i,
    /manufactured\s*by\s*[:\-]?\s*([^\n]+)/i,
    /manufacturing\s*by\s*[:\-]?\s*([^\n]+)/i,
    /mfg\.?\s*by\s*[:\-]?\s*([^\n]+)/i,
    /mfd\.?\s*by\s*[:\-]?\s*([^\n]+)/i
    ];
    for (const pattern of patterns) {

        const match =
            normalized.match(pattern);

        if (
            match &&
            match[1]
        ) {

            let value =
                cleanValue(match[1]);

            value =
                cleanManufacturer(value);

            if (value.length >= 3) {
                return value;
            }

        }

    }

    const lines =
        getLines(normalized);

    for (const line of lines) {

        if (
            /\b(ltd|limited|pvt|private|industries|foods|company|corporation|corp|enterprises|manufacturers)\b/i.test(line)
        ) {

            if (
                !/mrp|net\s*(qty|quantity|weight)|batch|expiry|date/i.test(line)
            ) {

                const cleaned =
                    cleanManufacturer(line);

                if (cleaned.length >= 3) {
                    return cleaned;
                }

            }

        }

    }

    return "";
}


function extractMarketedBy(text) {
    const normalized =
        normalizeOCRText(text);

    const match =
        normalized.match(
            /marketed\s*by\s*[:\-]?\s*([^\n]+)/i
        );

    if (match && match[1]) {
        return cleanValue(match[1]);
    }

    return "";
}


function cleanManufacturer(value) {

    let result =
        cleanValue(value);


    /*
       Remove registration/licence information
       from manufacturer name.
    */

    result =
        result.replace(
            /\b(?:regn|registration|reg|licence|license|gstin|fssai)\.?\s*(?:no|number)?\.?\s*[:\-]?\s*[A-Za-z0-9:\-\/]+.*$/i,
            ""
        );


    result =
        result.replace(
            /\b(?:licence|license)\s*(?:no|number)?\.?\s*[:\-]?\s*[A-Za-z0-9:\-\/]+.*$/i,
            ""
        );


    return cleanValue(
        result
    );

}


/* ============================================================
   19. NET QUANTITY
   ============================================================ */

function extractQuantity(text) {

    const normalized =
        normalizeOCRText(text);


    /*
       Strong label-based detection.
    */

    const contextual =
        normalized.match(
            /(?:net\s*(?:quantity|qty|weight|wt)|net\.?\s*w\.?\s*t\.?|net\s*q\.?\s*t\.?)\s*[:=\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(kg|kgs|g|gm|gms|gram|grams|mg|l|ltr|litre|litres|ml|cl|pcs|pc|pieces|piece)\b/i
        );


    if (
        contextual &&
        contextual[1] &&
        contextual[2]
    ) {

        return normalizeQuantity(
            contextual[1],
            contextual[2]
        );

    }


    /*
       Search individual lines.

       IMPORTANT:
       Do NOT blindly convert every I/l into 1.
    */

    const lines =
        getLines(normalized);


    for (const line of lines) {

        const match =
            line.match(
                /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams|mg|l|ltr|litre|litres|ml|cl|pcs|pc|pieces|piece)\b/i
            );


        if (match) {

            /*
               Only accept generic quantities when
               the line looks like a quantity declaration.
            */

            if (
                /net|quantity|weight|volume|vol/i.test(line) ||
                line.trim().length <= 20
            ) {

                return normalizeQuantity(
                    match[1],
                    match[2]
                );

            }

        }

    }


    return "";

}


function normalizeQuantity(
    number,
    unit
) {

    const cleanNum =
        String(number)
            .replace(/,/g, "");


    let cleanUnit =
        String(unit)
            .toLowerCase();


    if (
        ["kgs", "kg"].includes(cleanUnit)
    ) {
        cleanUnit = "kg";
    }

    else if (
        ["g", "gm", "gms", "gram", "grams"]
            .includes(cleanUnit)
    ) {
        cleanUnit = "g";
    }

    else if (
        ["mg"].includes(cleanUnit)
    ) {
        cleanUnit = "mg";
    }

    else if (
        ["l", "ltr", "litre", "litres"]
            .includes(cleanUnit)
    ) {
        cleanUnit = "L";
    }

    else if (
        ["ml"].includes(cleanUnit)
    ) {
        cleanUnit = "ml";
    }

    else if (
        ["cl"].includes(cleanUnit)
    ) {
        cleanUnit = "cl";
    }

    else if (
        ["pcs", "pc", "pieces", "piece"]
            .includes(cleanUnit)
    ) {
        cleanUnit = "pcs";
    }


    return `${cleanNum} ${cleanUnit}`;

}


/* ============================================================
   20. MRP
   ============================================================ */

function extractMRP(text) {

    const normalized =
        normalizeOCRText(text);


    function makePrice(value) {

        if (!value) {
            return "";
        }


        let cleaned =
            String(value)
                .replace(/O/gi, "0")
                .replace(/I/gi, "1")
                .replace(/S/gi, "5")
                .replace(/B/gi, "8")
                .replace(/,/g, "");


        cleaned =
            cleaned.replace(
                /[^0-9.]/g,
                ""
            );


        const number =
            Number(cleaned);


        if (
            !Number.isFinite(number) ||
            number <= 0 ||
            number > 100000
        ) {

            return "";

        }


        return Number.isInteger(number)
            ? `₹${number}`
            : `₹${number.toFixed(2)}`;

    }


    /*
       Explicit MRP.
    */

    const explicit =
        normalized.match(
            /(?:m\s*\.?\s*r\s*\.?\s*p\s*\.?|maximum\s+retail\s+price)[^0-9₹]{0,40}(?:₹|rs\.?|inr|rupees?)?\s*([0-9OoIiSsBb]+(?:[.,][0-9OoIiSsBb]{1,2})?)/i
        );


    if (explicit) {

        const result =
            makePrice(
                explicit[1]
            );


        if (result) {
            return result;
        }

    }


    /*
       Currency symbol.
    */

    const currencyMatches =
        normalized.match(
            /(?:₹|rs\.?|inr|rupees?)\s*[0-9OoIiSsBb]+(?:[.,][0-9OoIiSsBb]{1,2})?/gi
        ) || [];


    for (const match of currencyMatches) {

        const number =
            match.match(
                /[0-9OoIiSsBb]+(?:[.,][0-9OoIiSsBb]{1,2})?/
            );


        if (number) {

            const result =
                makePrice(
                    number[0]
                );


            if (result) {
                return result;
            }

        }

    }


    /*
       Example from your first product:

       500 g 85.00
    */

    const quantityPrice =
        normalized.match(
            /\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|mg|l|ltr|litre|litres|ml)\s+([0-9OoIiSsBb]+(?:[.,][0-9OoIiSsBb]{1,2})?)/i
        );


    if (quantityPrice) {

        const result =
            makePrice(
                quantityPrice[1]
            );


        if (result) {
            return result;
        }

    }
    const standalonePrice = normalized.match(
        /\b([0-9OoIiSsBb]+(?:[.,][0-9OoIiSsBb]{1,2})?)\s*\(\s*USP/i
    );

    if (standalonePrice) {
        const result = makePrice(standalonePrice[1]);

        if (result) {
            return result;
        }
    }


    return "";

}


/* ============================================================
   21. DATES
   ============================================================ */

function extractAllDates(text) {

    const dates = [];


    const patterns = [

        /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*\s+20\d{2}\b/gi,

        /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]20\d{2}\b/g,

        /\b(?:0?[1-9]|1[0-2])[\/\-.]20\d{2}\b/g

    ];


    patterns.forEach(
        pattern => {

            const matches =
                text.match(
                    pattern
                ) || [];


            matches.forEach(
                date => {

                    if (
                        !dates.includes(date)
                    ) {

                        dates.push(date);

                    }

                }
            );

        }
    );


    return dates;

}


/* ============================================================
   22. MANUFACTURING DATE
   ============================================================ */

function extractManufacturingDate(
    text
) {

    const normalized =
        normalizeOCRText(text);


    /*
       Explicit MFG / MFD / PKD.
    */

    const contextual =
        normalized.match(
            /(?:mfg|mfd|manufactured|manufacturing|pkd|packed|packing|date\s*of\s*(?:manufacture|manufacturing|packaging|packing))[^0-9]{0,100}(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*\s+20\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]20\d{2}|(?:0?[1-9]|1[0-2])[\/\-.]20\d{2})/i
        );


    if (
        contextual &&
        contextual[1]
    ) {

        return cleanValue(
            contextual[1]
        );

    }


    /*
       If OCR separates the label and date,
       use the first date.
    */

    const dates =
        extractAllDates(
            normalized
        );


    return dates.length
        ? dates[0]
        : "";

}


/* ============================================================
   23. EXPIRY
   ============================================================ */

function extractExpiry(text) {

    const normalized =
        normalizeOCRText(text);


    const contextual =
        normalized.match(
            /(?:expiry|exp\.?|use\s*by|use\s*before|best\s*before)[^0-9]{0,100}(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*\s+20\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]20\d{2}|(?:0?[1-9]|1[0-2])[\/\-.]20\d{2})/i
        );


    if (
        contextual &&
        contextual[1]
    ) {

        return cleanValue(
            contextual[1]
        );

    }


    const dates =
        extractAllDates(
            normalized
        );


    if (dates.length >= 2) {

        return dates[1];

    }


    return "";

}


/* ============================================================
   24. BATCH NUMBER
   ============================================================ */

function extractBatch(text) {

    const normalized =
        normalizeOCRText(text);


    const lines =
        getLines(normalized);


    const invalidWords = [

        "date",
        "packaging",
        "packaged",
        "packing",
        "use",
        "by",
        "expiry",
        "expire",
        "mfg",
        "mfd",
        "mrp",
        "batch",
        "number",
        "no",
        "ingredients",
        "ingredient",
        "weight",
        "quantity",
        "net",
        "price"

    ];


    function validBatch(value) {

        if (!value) {
            return false;
        }


        const candidate =
            cleanValue(value);


        if (
            candidate.length < 5 ||
            candidate.length > 30
        ) {
            return false;
        }


        if (
            invalidWords.includes(
                candidate.toLowerCase()
            )
        ) {
            return false;
        }


        /*
           A batch code should normally contain
           at least one letter AND one number.
        */

        if (
            !/[A-Za-z]/.test(candidate) ||
            !/\d/.test(candidate)
        ) {
            return false;
        }


        /*
           Reject obvious sentences.
        */

        if (
            candidate.split(" ").length > 3
        ) {
            return false;
        }


        return true;

    }


    /*
       1. Batch No: XXXXX
    */

    for (const line of lines) {

        const match =
            line.match(
                /\b(?:batch\s*(?:no|number)?|lot\s*(?:no|number)?)\b[\s:;=#\-]*([A-Za-z0-9][A-Za-z0-9\-\/_.]{4,})/i
            );


        if (
            match &&
            validBatch(match[1])
        ) {

            return cleanValue(
                match[1]
            );

        }

    }


    /*
       2. Look near the first manufacturing date.

       This prevents:

       Batch → Packaging

       because "Packaging" has no number.
    */

    const dates =
        extractAllDates(
            normalized
        );


    if (dates.length > 0) {

        const index =
            normalized.indexOf(
                dates[0]
            );


        if (index >= 0) {

            const before =
                normalized.substring(
                    Math.max(
                        0,
                        index - 180
                    ),
                    index
                );


            const candidates =
                before.match(
                    /\b[A-Za-z]{1,8}[A-Za-z0-9\-\/_.]{3,}\b/g
                ) || [];


            for (
                let i = candidates.length - 1;
                i >= 0;
                i--
            ) {

                if (
                    validBatch(
                        candidates[i]
                    )
                ) {

                    return cleanValue(
                        candidates[i]
                    );

                }

            }

        }

    }


    /*
       3. General alphanumeric fallback.
    */

    const candidates =
        normalized.match(
            /\b[A-Za-z]{2,}[A-Za-z0-9\-\/_.]{3,}\b/g
        ) || [];


    for (const candidate of candidates) {

        if (
            validBatch(candidate)
        ) {

            if (
                !/packaging|packaged|packing|manufactured|marketed|ingredient|ingredients/i
                    .test(candidate)
            ) {

                return cleanValue(
                    candidate
                );

            }

        }

    }


    return "";

}


/* ============================================================
   25. ADDRESS
   ============================================================ */

function extractAddress(text) {

    const lines =
        getLines(text);


    for (let i = 0; i < lines.length; i++) {

        const line =
            lines[i];


        if (
            /address\s*[:\-]/i.test(line)
        ) {

            const sameLine =
                line.replace(
                    /.*address\s*[:\-]?\s*/i,
                    ""
                );


            if (
                sameLine.length >= 5
            ) {

                return cleanValue(
                    sameLine
                );

            }


            if (
                lines[i + 1]
            ) {

                return cleanValue(
                    lines[i + 1]
                );

            }

        }

    }


    /*
       Address indicators.
    */

    for (const line of lines) {

        if (
            /plot\s*(?:no|number)|road|street|nagar|industrial\s+area|estate|district|pincode|pin\s*code/i
                .test(line)
        ) {

            if (
                line.length >= 10 &&
                !/mrp|batch|expiry/i.test(line)
            ) {

                return cleanValue(
                    line
                );

            }

        }

    }


    return "";

}


/* ============================================================
   26. FSSAI
   ============================================================ */

function extractFSSAI(text) {

    const normalized =
        normalizeOCRText(text);


    const patterns = [

        /fssai[^\d]{0,40}(\d{10,14})/i,

        /licen[cs]e[^\d]{0,40}(\d{10,14})/i

    ];


    for (const pattern of patterns) {

        const match =
            normalized.match(
                pattern
            );


        if (
            match &&
            match[1]
        ) {

            return match[1];

        }

    }


    return "";

}


/* ============================================================
   27. BARCODE
   ============================================================ */

function extractBarcode(text) {

    const normalized =
        normalizeOCRText(text);


    const explicit =
        normalized.match(
            /(?:barcode|bar\s*code)[^\d]{0,30}(\d{8,14})/i
        );


    if (
        explicit &&
        explicit[1]
    ) {

        return explicit[1];

    }


    /*
       Generic long-number fallback.

       We keep it separate from quantity,
       MRP and dates.
    */

    const numbers =
        normalized.match(
            /\b\d{8,14}\b/g
        ) || [];


    if (numbers.length > 0) {

        return numbers[0];

    }


    return "";

}
/* ============================================================
   CONSUMER CARE
   ============================================================ */

function extractConsumerCare(text) {

    const normalized =
        normalizeOCRText(text);

    const patterns = [

        /consumer\s*care\s*(?:details?|no\.?|number)?\s*[:\-]?\s*([^\n]+)/i,

        /customer\s*care\s*(?:details?|no\.?|number)?\s*[:\-]?\s*([^\n]+)/i,

        /helpline\s*[:\-]?\s*([^\n]+)/i,

        /toll\s*free\s*[:\-]?\s*([^\n]+)/i

    ];

    for (const pattern of patterns) {

        const match =
            normalized.match(pattern);

        if (
            match &&
            match[1]
        ) {

            return cleanValue(
                match[1]
            );
        }
    }


    // Email fallback
    const email =
        normalized.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );

    if (email) {
        return email[0];
    }


    // Indian phone number fallback
    const phone =
        normalized.match(
            /(?:\+91[\s-]?)?[6-9]\d{9}\b/
        );

    if (phone) {
        return phone[0];
    }


    return "";
}


/* ============================================================
   COUNTRY OF ORIGIN
   ============================================================ */

function extractCountryOfOrigin(text) {

    const normalized =
        normalizeOCRText(text);

    const patterns = [

        /country\s*of\s*origin\s*[:\-]?\s*([^\n]+)/i,

        /made\s*in\s*[:\-]?\s*([^\n]+)/i,

        /product\s*of\s*[:\-]?\s*([^\n]+)/i,

        /origin\s*[:\-]?\s*([^\n]+)/i

    ];

    for (const pattern of patterns) {

        const match =
            normalized.match(pattern);

        if (
            match &&
            match[1]
        ) {

            return cleanValue(
                match[1]
            );
        }
    }


    return "";
}


/* ============================================================
   UNIT SALE PRICE
   ============================================================ */

function extractUnitSalePrice(text) {

    const normalized =
        normalizeOCRText(text);


    const patterns = [

        /unit\s*sale\s*price\s*[:\-]?\s*(₹?\s*[0-9]+(?:\.[0-9]{1,2})?\s*(?:\/\s*)?(?:kg|g|mg|l|ml|m|cm|number|no\.?|pc|piece))/i,

        /₹?\s*[0-9]+(?:\.[0-9]{1,2})?\s*(?:\/\s*)?(?:kg|g|mg|l|ml|m|cm|number|no\.?|pc|piece)/i

    ];


    for (const pattern of patterns) {

        const match =
            normalized.match(pattern);

        if (
            match &&
            match[1]
        ) {

            return cleanValue(
                match[1]
            );
        }

        if (
            match &&
            match[0]
        ) {

            return cleanValue(
                match[0]
            );
        }
    }


    return "";
}

/* ============================================================
   28. COMPLETE PRODUCT DATA
   ============================================================ */

function parseProductData(
    ocrText
) {

    const text =
        normalizeOCRText(
            ocrText
        );


    const product = {

        productName:
            extractProductName(
                text
            ),

        manufacturer:
            extractManufacturer(
                text
            ),
        marketedBy:
            extractMarketedBy(
            text
        ),


        quantity:
            extractQuantity(
                text
            ),

        mrp:
            extractMRP(
                text
            ),

        manufacturingDate:
            extractManufacturingDate(
                text
            ),

        expiry:
            extractExpiry(
                text
            ),

        batch:
            extractBatch(
                text
            ),

        address:
            extractAddress(
                text
            ),

        fssai:
            extractFSSAI(
                text
            ),

        barcode:
        extractBarcode(
        text
        ),

        consumerCare:
            extractConsumerCare(
                text
            ),

        countryOfOrigin:
            extractCountryOfOrigin(
                text
            ),

        unitSalePrice:
            extractUnitSalePrice(
                text
            ),

        rawText:
            text

    };


    console.log(
        "========== FINAL PRODUCT DATA =========="
    );

    console.table(product);


    return product;

}
/* ============================================================
   LOAD LEGAL METROLOGY RULES
   ============================================================ */

async function loadLegalMetrologyRules() {

    try {

        const response =
            await fetch(
                "/api/legal-metrology-rules"
            );

        if (!response.ok) {
            throw new Error(
                "Could not load Legal Metrology rules."
            );
        }

        legalMetrologyRules =
            await response.json();

        console.log(
            "========== LEGAL METROLOGY RULES =========="
        );

        console.table(
            legalMetrologyRules
        );

    } catch (error) {

        console.error(
            "Legal Metrology rules error:",
            error
        );

        throw error;
    }
}

/* ============================================================
   29. COMPLIANCE
   ============================================================ */

function checkCompliance(product, rules) {

    const results = [];
    const issues = [];

    for (const rule of rules) {

        const value = product[rule.field];

        let status = "GAP";
        let evidence = "";
        let explanation = "";

        // ==========================================
        // RULE TYPE: REQUIRED TEXT
        // ==========================================

        if (rule.checkType === "requiredText") {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                status = "PASS";
                evidence = String(value);

                explanation =
                    `${rule.title} was detected in the OCR result.`;

            } else {

                status = "GAP";

                evidence =
                    "No supporting declaration detected.";

                explanation =
                    `${rule.title} could not be verified from the OCR result.`;
            }
        }


        // ==========================================
        // RULE TYPE: QUANTITY
        // ==========================================

        else if (rule.checkType === "quantity") {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                const quantityText =
                    String(value).trim();

                const quantityPattern =
                    /^\s*[0-9]+(?:\.[0-9]+)?\s*(mg|g|kg|ml|l|cm|m|pcs?|pieces?|no\.?)\s*$/i;

                if (
                    quantityPattern.test(
                        quantityText
                    )
                ) {

                    status = "PASS";

                    evidence =
                        quantityText;

                    explanation =
                        "Net quantity was detected with a recognized unit.";

                } else {

                    status = "FAIL";

                    evidence =
                        quantityText;

                    explanation =
                        "A quantity was detected, but its unit could not be verified as a recognized standard unit.";
                }

            } else {

                status = "GAP";

                evidence =
                    "No net quantity detected.";

                explanation =
                    "Net quantity could not be verified from the OCR result.";
            }
        }


        // ==========================================
        // RULE TYPE: MRP
        // ==========================================

        else if (rule.checkType === "mrp") {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                const mrpText =
                    String(value).trim();

                const mrpNumber =
                    parseFloat(
                        mrpText.replace(/[₹,]/g, "")
                    );

                if (
                    !isNaN(mrpNumber) &&
                    mrpNumber > 0
                ) {

                    status = "PASS";

                    evidence =
                        mrpText;

                    explanation =
                        "An MRP value was detected. The OCR confirms the price value, but tax-inclusive wording should be verified visually when required.";
                } else {

                    status = "FAIL";

                    evidence =
                        mrpText;

                    explanation =
                        "An MRP field was detected, but the extracted value is not a valid positive price.";
                }

            } else {

                status = "GAP";

                evidence =
                    "No MRP detected.";

                explanation =
                    "MRP could not be verified from the OCR result.";
            }
        }


        // ==========================================
        // RULE TYPE: CONDITIONAL DATE
        // ==========================================

        else if (
            rule.checkType === "conditionalDate"
        ) {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                status = "PASS";

                evidence =
                    String(value);

                explanation =
                    "A date declaration was detected. Applicability should be verified according to the commodity and applicable rules.";

            } else {

                status = "GAP";

                evidence =
                    "No applicable date declaration detected.";

                explanation =
                    "A date declaration could not be verified from the OCR result. Applicability depends on the commodity and applicable rules.";
            }
        }


        // ==========================================
        // RULE TYPE: CONDITIONAL EXPIRY
        // ==========================================

        else if (
            rule.checkType === "conditionalExpiry"
        ) {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                status = "PASS";

                evidence =
                    String(value);

                explanation =
                    "Best before / use-by information was detected.";

            } else {

                status = "GAP";

                evidence =
                    "No best before / use-by information detected.";

                explanation =
                    "Best before / use-by information could not be verified. Applicability should be confirmed for the commodity.";
            }
        }


        // ==========================================
        // RULE TYPE: CONDITIONAL IMPORT
        // ==========================================

        else if (
            rule.checkType === "conditionalImport"
        ) {

            const country =
                product.countryOfOrigin;

            if (
                country &&
                String(country).trim() !== ""
            ) {

                status = "PASS";

                evidence =
                    String(country);

                explanation =
                    "Country of origin was detected.";

            } else {

                // We currently do not have enough
                // evidence to determine whether this
                // package is imported.

                status = "GAP";

                evidence =
                    "Country of origin could not be verified.";

                explanation =
                    "The package's import status could not be established from the current extracted data.";
            }
        }


        // ==========================================
        // RULE TYPE: UNIT SALE PRICE
        // ==========================================

        else if (
            rule.checkType === "unitSalePrice"
        ) {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                status = "PASS";

                evidence =
                    String(value);

                explanation =
                    "Unit sale price was detected.";

            } else {

                status = "GAP";

                evidence =
                    "No unit sale price detected.";

                explanation =
                    "Unit sale price could not be verified from the current OCR result. Applicability and exemptions should be checked.";
            }
        }


        // ==========================================
        // UNKNOWN RULE TYPE
        // ==========================================

        else {

            if (
                value &&
                String(value).trim() !== ""
            ) {

                status = "PASS";

                evidence =
                    String(value);

                explanation =
                    `${rule.title} was detected.`;

            } else {

                status = "GAP";

                evidence =
                    "No supporting declaration detected.";

                explanation =
                    `${rule.title} could not be verified.`;
            }
        }


        // ==========================================
        // CREATE RESULT
        // ==========================================

        const result = {

            ruleId:
                rule.id,

            title:
                rule.title,

            requirement:
                rule.requirement,

            legalReference:
                rule.legalReference,

            severity:
                rule.severity,

            checkType:
                rule.checkType,

            status:
                status,

            evidence:
                evidence,

            explanation:
                explanation,

            field:
                rule.field
        };


        results.push(result);


        // GAP and FAIL are issues
        if (
            status === "GAP" ||
            status === "FAIL"
        ) {

            issues.push(result);
        }
    }


    // ==========================================
    // SUMMARY
    // ==========================================

    const passCount =
        results.filter(
            item => item.status === "PASS"
        ).length;

    const gapCount =
        results.filter(
            item => item.status === "GAP"
        ).length;

    const failCount =
        results.filter(
            item => item.status === "FAIL"
        ).length;

    const notApplicableCount =
        results.filter(
            item => item.status === "NOT_APPLICABLE"
        ).length;


    let overallStatus;


    if (failCount > 0) {

        overallStatus =
            "Non-Compliant";

    } else if (gapCount > 0) {

        overallStatus =
            "Review Required";

    } else {

        overallStatus =
            "Compliant";
    }


    return {

        status:
            overallStatus,

        compliant:
            failCount === 0 &&
            gapCount === 0,

        results:
            results,

        issues:
            issues,

        summary: {

            total:
                results.length,

            pass:
                passCount,

            gap:
                gapCount,

            fail:
                failCount,

            notApplicable:
                notApplicableCount
        }
    };
}
/* ============================================================
   30. FIND DECLARATION CARD
   Works with both:
   - 4 cards from current HTML
   - 6 cards from your screenshot
   ============================================================ */

function findDeclarationCard(
    patterns
) {

    const items =
        document.querySelectorAll(
            ".declaration-item"
        );


    for (const item of items) {

        const label =
            item.querySelector(
                "span"
            );


        const text =
            (
                label
                    ? label.textContent
                    : item.textContent
            )
                .trim()
                .toLowerCase();


        if (
            patterns.some(
                pattern =>
                    pattern.test(text)
            )
        ) {

            return item;

        }

    }


    return null;

}


/* ============================================================
   31. UPDATE DECLARATION CARD
   ============================================================ */

function updateDeclarationCard(
    patterns,
    value
) {

    const card =
        findDeclarationCard(
            patterns
        );


    if (!card) {
        return false;
    }


    const strong =
        card.querySelector(
            "strong"
        );


    if (!strong) {
        return false;
    }


    strong.textContent =
        value ||
        "Not Detected";


    return true;

}


/* ============================================================
   32. CREATE MISSING DECLARATION CARD
   ============================================================ */

function createDeclarationCard(
    label,
    value,
    className
) {

    const grid =
        document.querySelector(
            ".declaration-grid"
        );


    if (!grid) {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        `declaration-item ${className || ""}`;


    card.innerHTML = `

        <span>
            ${escapeHTML(label)}
        </span>

        <strong>
            ${escapeHTML(
                value || "Not Detected"
            )}
        </strong>

    `;


    grid.appendChild(
        card
    );

}


/* ============================================================
   33. UPDATE RESULT CARDS
   ============================================================ */

function updateDeclarationUI(
    product
) {

    /*
       Existing cards from your HTML.
    */

    updateDeclarationCard(
        [/^manufacturer$/i, /manufacturer/i],
        product.manufacturer
    );

    updateDeclarationCard(
        [/^manufacturer$/i, /manufacturer/i],
        product.manufacturer
    );

    updateDeclarationCard(
        [/^net quantity$/i, /net\s*quantity/i],
        product.quantity
    );


    updateDeclarationCard(
        [/^mrp$/i, /maximum\s*retail/i],
        product.mrp
    );


    updateDeclarationCard(
        [
            /^manufacturing date$/i,
            /manufacturing\s*date/i
        ],
        product.manufacturingDate
    );


    /*
       Your screenshot has Product and Batch cards,
       but the uploaded HTML currently has only four.
       Add them only when they don't already exist.
    */

    const productCard =
        findDeclarationCard(
            [/^product$/i]
        );


    if (productCard) {

        const strong =
            productCard.querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                product.productName ||
                "Not Detected";

        }

    } else {

        createDeclarationCard(
            "Product",
            product.productName,
            "product-result-card"
        );

    }


    const batchCard =
        findDeclarationCard(
            [/^batch$/i, /batch\s*number/i]
        );


    if (batchCard) {

        const strong =
            batchCard.querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                product.batch ||
                "Not Detected";

        }

    } else {

        createDeclarationCard(
            "Batch",
            product.batch,
            "batch-result-card"
        );

    }


    /*
       Optional expiry card.
    */

    if (product.expiry) {

        const expiryCard =
            findDeclarationCard(
                [/^expiry$/i, /use\s*by/i]
            );


        if (expiryCard) {

            const strong =
                expiryCard.querySelector(
                    "strong"
                );


            if (strong) {

                strong.textContent =
                    product.expiry;

            }

        } else {

            createDeclarationCard(
                "Expiry / Use By",
                product.expiry,
                "expiry-result-card"
            );

        }

    }

}


/* ============================================================
   34. COMPLIANCE MESSAGE
   IMPORTANT:
   Prevent duplicate "No issues detected" messages.
   ============================================================ */

function getComplianceMessageContainer() {

    /*
       First use an existing ID if the user's HTML
       already contains one.
    */

    let container =
        document.getElementById(
            "complianceIssues"
        );


    if (container) {
        return container;
    }


    /*
       Look for an existing "Compliance Issues"
       section in the current HTML.
    */

    const allElements =
        document.querySelectorAll(
            "*"
        );


    for (const element of allElements) {

        if (
            element.children.length > 0
        ) {
            continue;
        }


        const text =
            element.textContent
                .trim()
                .toLowerCase();


        if (
            text === "no issues detected."
            ||
            text === "no issues detected"
        ) {

            container =
                element.parentElement;


            if (container) {

                container.id =
                    "complianceIssues";

                return container;

            }

        }

    }


    /*
       Otherwise create one inside the result.
    */

    if (!analysisResult) {
        return null;
    }


    container =
        document.createElement(
            "div"
        );


    container.id =
        "complianceIssues";


    analysisResult.appendChild(
        container
    );


    return container;

}


/* ============================================================
   35. UPDATE COMPLIANCE MESSAGE
   ============================================================ */

/* ============================================================
   35. UPDATE COMPLIANCE UI
   Shows:
   PASS / GAP / FAIL / NOT APPLICABLE
   + Evidence for every rule
   ============================================================ */

function updateComplianceUI(
    compliance
) {

    const container =
        getComplianceMessageContainer();


    if (!container) {
        return;
    }


    const results =
        compliance.results || [];


    const summary =
        compliance.summary || {
            total: results.length,
            pass: 0,
            gap: 0,
            fail: 0,
            notApplicable: 0
        };


    /*
       Overall status
    */

    let overallClass =
        "review-status";

    let overallIcon =
        "⚠";

    if (
        summary.fail > 0
    ) {

        overallClass =
            "failed-status";

        overallIcon =
            "✗";

    }
    else if (
        summary.gap === 0
    ) {

        overallClass =
            "passed-status";

        overallIcon =
            "✓";

    }


    /*
       Create rule-by-rule HTML
    */

    const ruleHTML =
        results
            .map(
                result => {

                    let statusClass =
                        "gap";

                    let statusIcon =
                        "⚠";

                    if (
                        result.status === "PASS"
                    ) {

                        statusClass =
                            "pass";

                        statusIcon =
                            "✓";

                    }
                    else if (
                        result.status === "FAIL"
                    ) {

                        statusClass =
                            "fail";

                        statusIcon =
                            "✗";

                    }
                    else if (
                        result.status === "NOT_APPLICABLE"
                    ) {

                        statusClass =
                            "not-applicable";

                        statusIcon =
                            "—";

                    }


                    return `

                        <div
                            class="compliance-rule ${statusClass}"
                            style="
                                border:1px solid #ddd;
                                border-radius:12px;
                                padding:16px;
                                margin-bottom:12px;
                            "
                        >

                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    align-items:flex-start;
                                    gap:15px;
                                "
                            >

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            result.ruleId
                                        )}
                                        -
                                        ${escapeHTML(
                                            result.title
                                        )}
                                    </strong>

                                    <p
                                        style="
                                            margin:8px 0;
                                        "
                                    >
                                        ${escapeHTML(
                                            result.requirement
                                        )}
                                    </p>

                                </div>
                                <div style="
                                    margin-top: 8px;
                                    font-size: 13px;
                                    color: #666;
                                ">
                                    <strong>Legal Reference:</strong>
                                    ${escapeHTML(
                                        result.legalReference ||
                                        "Reference not available"
                                    )}
                                </div>


                                <span
                                    style="
                                        font-weight:700;
                                        white-space:nowrap;
                                    "
                                >
                                    ${statusIcon}
                                    ${escapeHTML(
                                        result.status
                                    )}
                                </span>

                            </div>


                            <div
                                style="
                                    margin-top:10px;
                                    padding:10px;
                                    background:#f7f7f7;
                                    border-radius:8px;
                                "
                            >

                                <strong>
                                    Evidence:
                                </strong>

                                <div
                                    style="
                                        margin-top:5px;
                                    "
                                >
                                    ${escapeHTML(
                                        result.evidence ||
                                        "No evidence available."
                                    )}
                                </div>

                            </div>


                            <p
                                style="
                                    margin:10px 0 0;
                                "
                            >
                                <strong>
                                    Explanation:
                                </strong>

                                ${escapeHTML(
                                    result.explanation ||
                                    ""
                                )}
                            </p>


                        </div>

                    `;

                }
            )
            .join("");


    /*
       Final UI
    */

    container.innerHTML = `

        <div
            class="compliance-message ${overallClass}"
            style="
                margin-bottom:20px;
            "
        >

            <strong>
                ${overallIcon}
                Legal Metrology:
                ${escapeHTML(
                    compliance.status
                )}
            </strong>


            <div
                style="
                    display:flex;
                    gap:20px;
                    flex-wrap:wrap;
                    margin-top:12px;
                "
            >

                <span>
                    ✓ PASS:
                    <strong>
                        ${summary.pass}
                    </strong>
                </span>


                <span>
                    ⚠ GAP:
                    <strong>
                        ${summary.gap}
                    </strong>
                </span>


                <span>
                    ✗ FAIL:
                    <strong>
                        ${summary.fail}
                    </strong>
                </span>


                <span>
                    — N/A:
                    <strong>
                        ${summary.notApplicable}
                    </strong>
                </span>

            </div>

        </div>


        <div class="compliance-rules">

            <h3
                style="
                    margin-bottom:15px;
                "
            >
                Rule-by-Rule Verification
            </h3>

            ${ruleHTML}

        </div>

    `;

}

/* ============================================================
   36. UPDATE RESULT
   ============================================================ */

function updateResultUI(
    product,
    compliance
) {

    if (!analysisResult) {
        return;
    }


    analysisResult.style.display =
        "block";


    if (resultStatus) {

        resultStatus.textContent =
            compliance.status;


        resultStatus.classList.remove(
            "compliant",
            "non-compliant"
        );


        resultStatus.classList.add(
            compliance.compliant
                ? "compliant"
                : "non-compliant"
        );

    }


    updateDeclarationUI(
        product
    );


    updateComplianceUI(
        compliance
    );

}


/* ============================================================
   37. API ERROR UI
   ============================================================ */

function showAnalysisError(
    message
) {

    if (!analysisResult) {
        return;
    }


    analysisResult.style.display =
        "block";


    if (resultStatus) {

        resultStatus.textContent =
            "OCR / API Error";

        resultStatus.classList.remove(
            "compliant"
        );

        resultStatus.classList.add(
            "non-compliant"
        );

    }


    const container =
        getComplianceMessageContainer();


    if (container) {

        container.innerHTML = `

            <div class="compliance-message error-message">

                <strong>
                    ⚠ OCR / API Error
                </strong>

                <p>
                    ${escapeHTML(message)}
                </p>

                <p>
                    Please upload a clear, close-up image of the product declaration label.
                </p>

            </div>

        `;

    }

}


/* ============================================================
   38. CREATE INSPECTION RECORD
   ============================================================ */

function createInspectionRecord(
    product,
    compliance
) {

    const inspections =
        getInspections();


    const now =
        new Date();


    const record = {

        id:
            `INS-${now.getTime()}`,

        productName:
            product.productName,

        manufacturer:
            product.manufacturer,

        quantity:
            product.quantity,

        mrp:
            product.mrp,

        manufacturingDate:
            product.manufacturingDate,

        expiry:
            product.expiry,

        batch:
            product.batch,

        address:
            product.address,

        fssai:
            product.fssai,

        barcode:
            product.barcode,

        rawText:
            product.rawText,

        status:
            compliance.status,

        compliant:
            compliance.compliant,

        summary:
            compliance.summary,

        results:
            compliance.results,

        issues:
            compliance.issues,

        date:
            now.toISOString(),

        inspector:
            currentUser
                ? (
                    currentUser.name ||
                    currentUser.fullName ||
                    "Inspector"
                )
                : "Inspector"

    };


    inspections.unshift(
        record
    );


    if (
        inspections.length > 100
    ) {

        inspections.splice(
            100
        );

    }


    saveInspections(
        inspections
    );


    return record;

}


/* ============================================================
   39. ANALYZE PRODUCT
   ============================================================ */

if (analyzeButton) {

    analyzeButton.addEventListener(
        "click",
        async function () {

            if (!selectedFile) {

                alert(
                    "Please upload a product image first."
                );

                return;

            }


            const originalText =
                analyzeButton.innerHTML;


            analyzeButton.disabled =
                true;


            try {

                /*
                   OCR
                */

                analyzeButton.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Reading Product...

                `;


                const ocrText =
                    await performOCR(
                        selectedFile
                    );


                /*
                   Parse
                */

                analyzeButton.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Extracting Details...

                `;


                const product =
                    parseProductData(
                        ocrText
                    );


                /*
                   Compliance
                */

                analyzeButton.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Checking Compliance...

                `;


                await loadLegalMetrologyRules();

                const compliance =
                    checkCompliance(
                        product,
                            legalMetrologyRules
                    );
                /*
                   Display
                */

                updateResultUI(
                    product,
                    compliance
                );


                /*
                   Save
                */

                createInspectionRecord(
                    product,
                    compliance
                );


                /*
                   Refresh dashboard
                */

                updateDashboard();

                renderReports();

                renderHistory();


                /*
                   Scroll to result
                */

                if (analysisResult) {

                    analysisResult.scrollIntoView(
                        {
                            behavior:
                                "smooth",

                            block:
                                "start"
                        }
                    );

                }

            } catch (error) {

                console.error(
                    "========== ANALYSIS ERROR =========="
                );

                console.error(
                    error
                );


                showAnalysisError(
                    error.message ||
                    "Unknown OCR/API error."
                );

            } finally {

                analyzeButton.innerHTML =
                    originalText;


                analyzeButton.disabled =
                    !selectedFile;

            }

        }
    );

}


/* ============================================================
   40. DATE FORMAT
   ============================================================ */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


/* ============================================================
   41. STATUS BADGE
   ============================================================ */

function getStatusBadge(
    status
) {

    const compliant =
        String(
            status || ""
        ).toLowerCase() ===
        "compliant";


    return `

        <span
            class="status-badge ${
                compliant
                    ? "compliant"
                    : "non-compliant"
            }"
        >

            ${
                compliant
                    ? "Compliant"
                    : "Non-Compliant"
            }

        </span>

    `;

}


/* ============================================================
   42. DASHBOARD
   ============================================================ */

function updateDashboard() {

    const inspections =
        getInspections();


    const total =
        inspections.length;


    const compliant =
        inspections.filter(
            item =>
                item.compliant === true ||
                String(
                    item.status || ""
                ).toLowerCase() ===
                "compliant"
        ).length;


    const nonCompliant =
        total -
        compliant;


    const rate =
        total > 0
            ? Math.round(
                (compliant / total) * 100
            )
            : 0;


    if (totalInspections) {
        totalInspections.textContent =
            total;
    }


    if (compliantCount) {
        compliantCount.textContent =
            compliant;
    }


    if (nonCompliantCount) {
        nonCompliantCount.textContent =
            nonCompliant;
    }


    if (complianceRate) {
        complianceRate.textContent =
            `${rate}%`;
    }


    if (overviewPercentage) {
        overviewPercentage.textContent =
            `${rate}%`;
    }


    if (progressFill) {
        progressFill.style.width =
            `${rate}%`;
    }


    const progressStrong =
        document.querySelector(
            ".progress-label strong"
        );


    if (progressStrong) {

        progressStrong.textContent =
            `${compliant} of ${total}`;

    }


    renderRecentInspections();

}


/* ============================================================
   43. RECENT INSPECTIONS
   ============================================================ */

function renderRecentInspections() {

    if (!recentInspectionTable) {
        return;
    }


    const inspections =
        getInspections().slice(
            0,
            5
        );


    if (
        inspections.length === 0
    ) {

        recentInspectionTable.innerHTML = `

            <tr>

                <td colspan="4">
                    No inspections yet.
                </td>

            </tr>

        `;

        return;

    }


    recentInspectionTable.innerHTML =
        inspections
            .map(
                item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.productName ||
                                "Unknown Product"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.date
                            )}
                        </td>

                        <td>
                            ${getStatusBadge(
                                item.status
                            )}
                        </td>

                        <td>

                            <button
                                class="secondary-button"
                                onclick="viewReport('${escapeAttribute(item.id)}')"
                            >

                                <i class="fa-solid fa-eye"></i>
                                View

                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");

}


/* ============================================================
   44. FILTER
   ============================================================ */

function filterInspections(
    searchElement,
    statusElement
) {

    let inspections =
        getInspections();


    const search =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    const status =
        statusElement
            ? statusElement.value
            : "all";


    if (search) {

        inspections =
            inspections.filter(
                item => {

                    const searchable = [

                        item.id,

                        item.productName,

                        item.manufacturer,

                        item.quantity,

                        item.mrp,

                        item.manufacturingDate,

                        item.expiry,

                        item.batch,

                        item.address,

                        item.fssai,

                        item.barcode

                    ]
                        .join(" ")
                        .toLowerCase();


                    return searchable.includes(
                        search
                    );

                }
            );

    }


    if (
        status &&
        status !== "all"
    ) {

        inspections =
            inspections.filter(
                item =>
                    String(
                        item.status || ""
                    ).toLowerCase() ===
                    status.toLowerCase()
            );

    }


    return inspections;

}


/* ============================================================
   45. REPORTS
   Matches your uploaded HTML:
   Report ID | Product | Date | Status | Action
   ============================================================ */

function renderReports() {

    if (!reportsTable) {
        return;
    }


    const inspections =
        filterInspections(
            reportSearch,
            reportStatusFilter
        );


    if (
        inspections.length === 0
    ) {

        reportsTable.innerHTML = `

            <tr>

                <td colspan="5">
                    No inspection reports found.
                </td>

            </tr>

        `;

        return;

    }


    reportsTable.innerHTML =
        inspections
            .map(
                item => {

                    const reportId =
                        `REP-${String(
                            item.id || ""
                        ).replace(
                            "INS-",
                            ""
                        )}`;


                    return `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    reportId
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.productName ||
                                    "Unknown Product"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    item.date
                                )}
                            </td>

                            <td>
                                ${getStatusBadge(
                                    item.status
                                )}
                            </td>

                            <td>

                                <button
                                    class="secondary-button"
                                    onclick="viewReport('${escapeAttribute(item.id)}')"
                                >

                                    <i class="fa-solid fa-eye"></i>
                                    View

                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


if (reportSearch) {

    reportSearch.addEventListener(
        "input",
        renderReports
    );

}


if (reportStatusFilter) {

    reportStatusFilter.addEventListener(
        "change",
        renderReports
    );

}


if (generateReportButton) {

    generateReportButton.addEventListener(
        "click",
        function () {

            showSection(
                "reports"
            );

            renderReports();

        }
    );

}


/* ============================================================
   46. HISTORY
   Matches your uploaded HTML:
   Product | Inspection ID | Date | Status | Action
   ============================================================ */

function renderHistory() {

    if (!historyTable) {
        return;
    }


    const inspections =
        filterInspections(
            historySearch,
            historyStatusFilter
        );


    if (
        inspections.length === 0
    ) {

        historyTable.innerHTML = `

            <tr>

                <td colspan="5">
                    No inspection history found.
                </td>

            </tr>

        `;

        return;

    }


    historyTable.innerHTML =
        inspections
            .map(
                item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.productName ||
                                "Unknown Product"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.id ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.date
                            )}
                        </td>

                        <td>
                            ${getStatusBadge(
                                item.status
                            )}
                        </td>

                        <td>

                            <button
                                class="secondary-button"
                                onclick="viewReport('${escapeAttribute(item.id)}')"
                            >

                                <i class="fa-solid fa-eye"></i>
                                View

                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");

}


if (historySearch) {

    historySearch.addEventListener(
        "input",
        renderHistory
    );

}


if (historyStatusFilter) {

    historyStatusFilter.addEventListener(
        "change",
        renderHistory
    );

}


/* ============================================================
   47. VIEW REPORT
   ============================================================ */

function viewReport(id) {

    const item =
        getInspections().find(
            inspection =>
                inspection.id === id
        );


    if (!item) {
        return;
    }


    const oldModal =
        document.getElementById(
            "reportModal"
        );


    if (oldModal) {
        oldModal.remove();
    }


    const reportId =
        `REP-${String(
            item.id || ""
        ).replace(
            "INS-",
            ""
        )}`;


    const issues =
        Array.isArray(item.issues)
            ? item.issues
            : [];


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "reportModal";


    modal.innerHTML = `

        <div class="report-modal-overlay">

            <div class="report-modal">

                <div class="report-modal-header">

                    <div>

                        <h2>
                            <i class="fa-solid fa-file-lines"></i>
                            Inspection Report
                        </h2>

                        <p>
                            Legal Metrology Product Inspection
                        </p>

                    </div>

                    <button
                        class="report-close-button"
                        id="closeReportModal"
                    >

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>


                <div class="report-info">

                    <div class="report-info-item">

                        <span>
                            Report ID
                        </span>

                        <strong>
                            ${escapeHTML(reportId)}
                        </strong>

                    </div>


                    <div class="report-info-item">

                        <span>
                            Inspection ID
                        </span>

                        <strong>
                            ${escapeHTML(
                                item.id || "-"
                            )}
                        </strong>

                    </div>


                    <div class="report-info-item">

                        <span>
                            Date
                        </span>

                        <strong>
                            ${formatDate(
                                item.date
                            )}
                        </strong>

                    </div>


                    <div class="report-info-item">

                        <span>
                            Inspector
                        </span>

                        <strong>
                            ${escapeHTML(
                                item.inspector ||
                                "Inspector"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="report-section">

                    <h3>
                        <i class="fa-solid fa-box"></i>
                        Product Details
                    </h3>


                    <div class="report-table-scroll">

                        <table class="report-details-table">

                            <tbody>

                                <tr>
                                    <th>Product Name</th>
                                    <td>
                                        ${escapeHTML(
                                            item.productName ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Manufacturer</th>
                                    <td>
                                        ${escapeHTML(
                                            item.manufacturer ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Net Quantity</th>
                                    <td>
                                        ${escapeHTML(
                                            item.quantity ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>MRP</th>
                                    <td>
                                        ${escapeHTML(
                                            item.mrp ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Manufacturing / Packing Date</th>
                                    <td>
                                        ${escapeHTML(
                                            item.manufacturingDate ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Expiry / Use By</th>
                                    <td>
                                        ${escapeHTML(
                                            item.expiry ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Batch Number</th>
                                    <td>
                                        ${escapeHTML(
                                            item.batch ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Address</th>
                                    <td>
                                        ${escapeHTML(
                                            item.address ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>FSSAI</th>
                                    <td>
                                        ${escapeHTML(
                                            item.fssai ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                                <tr>
                                    <th>Barcode</th>
                                    <td>
                                        ${escapeHTML(
                                            item.barcode ||
                                            "Not Detected"
                                        )}
                                    </td>
                                </tr>

                            </tbody>

                        </table>

                    </div>

                </div>


                <div class="report-section">

                    <h3>
                        <i class="fa-solid fa-shield-halved"></i>
                        Compliance Result
                    </h3>


                    <div
                        class="report-compliance ${
                            item.compliant
                                ? "report-compliant"
                                : "report-non-compliant"
                        }"
                    >

                        <div class="report-status-icon">

                            <i
                                class="fa-solid ${
                                    item.compliant
                                        ? "fa-circle-check"
                                        : "fa-circle-exclamation"
                                }"
                            ></i>

                        </div>


                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.status ||
                                    "Unknown"
                                )}
                            </strong>

                            <p>
                                ${
                                    item.compliant
                                        ? "All currently checked declarations were detected."
                                        : "One or more declarations could not be verified."
                                }
                            </p>

                        </div>

                    </div>

                </div>


                <div class="report-section">

        <h3>
            <i class="fa-solid fa-triangle-exclamation"></i>
            Compliance Issues & Evidence
        </h3>

        ${
            issues.length > 0
                ? `
                    <div class="report-rule-list">

                        ${
                            issues
                                .map(
                                    issue => `
                                        
                                        <div class="report-rule-item">

                                            <div style="
                                                display: flex;
                                                justify-content: space-between;
                                                align-items: center;
                                                gap: 15px;
                                                margin-bottom: 10px;
                                            ">

                                                <strong>
                                                    ${escapeHTML(
                                                        issue.ruleId ||
                                                        "Rule"
                                                    )}
                                                    -
                                                    ${escapeHTML(
                                                        issue.title ||
                                                        "Compliance Requirement"
                                                    )}
                                                </strong>

                                                <span class="status-badge">
                                                    ${escapeHTML(
                                                        issue.status ||
                                                        "GAP"
                                                    )}
                                                </span>

                                            </div>


                                            <div style="
                                                margin-bottom: 8px;
                                            ">

                                                <strong>
                                                    Legal Requirement:
                                                </strong>

                                                ${escapeHTML(
                                                    issue.requirement ||
                                                    "Not available"
                                                )}

                                            </div>


                                            <div style="
                                                margin-bottom: 8px;
                                            ">

                                                <strong>
                                                    Legal Reference:
                                                </strong>

                                                ${escapeHTML(
                                                    issue.legalReference ||
                                                    "Reference not available"
                                                )}

                                            </div>


                                            <div style="
                                                margin-bottom: 8px;
                                            ">

                                                <strong>
                                                    Evidence:
                                                </strong>

                                                ${escapeHTML(
                                                    issue.evidence ||
                                                    "No supporting evidence detected."
                                                )}

                                            </div>


                                            <div>

                                                <strong>
                                                    Explanation:
                                                </strong>

                                                ${escapeHTML(
                                                    issue.explanation ||
                                                    "Manual verification required."
                                                )}

                                            </div>

                                        </div>

                                    `
                                )
                                .join("")
                        }

                    </div>
                `
                : `
                    <p class="no-issues">
                        No detected compliance issues.
                    </p>
                `
        }

    </div>


                <div class="report-modal-footer">

                    <button
                        class="secondary-button"
                        id="closeReportButton"
                    >
                        Close
                    </button>


                    <button
                        class="primary-button"
                        id="printReportButton"
                    >

                        <i class="fa-solid fa-print"></i>
                        Print Report

                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    function closeModal() {

        const current =
            document.getElementById(
                "reportModal"
            );


        if (current) {
            current.remove();
        }

    }


    const closeButton =
        document.getElementById(
            "closeReportModal"
        );


    const closeReportButton =
        document.getElementById(
            "closeReportButton"
        );


    const printButton =
        document.getElementById(
            "printReportButton"
        );


    const overlay =
        modal.querySelector(
            ".report-modal-overlay"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (closeReportButton) {

        closeReportButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (printButton) {

        printButton.addEventListener(
            "click",
            function () {

                window.print();

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    closeModal();

                }

            }
        );

    }

}


/* ============================================================
   48. ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(value) {

    return String(
        value || ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );

}


/* ============================================================
   49. INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           Hide all sections initially.
        */

        pageSections.forEach(
            section => {

                section.style.display =
                    "none";

            }
        );


        /*
           Show dashboard.
        */

        const dashboard =
            document.getElementById(
                "dashboard"
            );


        if (dashboard) {

            dashboard.style.display =
                "block";

        }


        navItems.forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.section ===
                    "dashboard"
                );

            }
        );


        updateDashboard();

        renderReports();

        renderHistory();

    }
);


/* ============================================================
   50. GLOBAL FUNCTIONS
   ============================================================ */

window.viewReport =
    viewReport;


/* ============================================================
   END OF DASHBOARD.JS
   ============================================================ */
   