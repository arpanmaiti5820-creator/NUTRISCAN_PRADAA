const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const legalMetrologyRules = require("./rules/legal-metrology-rules");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OCR_API_KEY = process.env.OCR_API_KEY;

if (!OCR_API_KEY) {
    console.warn("WARNING: OCR_API_KEY is missing in .env");
}

const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static("public"));
app.get("/api/legal-metrology-rules", (req, res) => {
    res.json(legalMetrologyRules);
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});

// OCR API
app.post("/api/ocr", upload.single("file"), async (req, res) => {
    try {
        if (!OCR_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "OCR API key is missing. Add OCR_API_KEY to .env"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No image file received."
            });
        }

        const blob = new Blob(
            [req.file.buffer],
            { type: req.file.mimetype }
        );

        const formData = new FormData();

        formData.append("apikey", OCR_API_KEY);
        formData.append("language", "eng");
        formData.append("OCREngine", "2");
        formData.append("scale", "true");
        formData.append("detectOrientation", "true");
        formData.append("isTable", "false");
        formData.append("isOverlayRequired", "false");
        formData.append(
            "file",
            blob,
            req.file.originalname || "product.jpg"
        );

        let result = await callOCR(formData);

        let text = extractOCRText(result);

        // Retry using OCR Engine 1 if result is too short
        if (text.length < 40) {
            const retryForm = new FormData();

            retryForm.append("apikey", OCR_API_KEY);
            retryForm.append("language", "eng");
            retryForm.append("OCREngine", "1");
            retryForm.append("scale", "true");
            retryForm.append("detectOrientation", "true");
            retryForm.append("isTable", "false");
            retryForm.append("isOverlayRequired", "false");
            retryForm.append(
                "file",
                blob,
                req.file.originalname || "product.jpg"
            );

            const retryResult = await callOCR(retryForm);
            const retryText = extractOCRText(retryResult);

            if (retryText.length > text.length) {
                text = retryText;
            }
        }

        if (!text) {
            return res.status(422).json({
                success: false,
                error: "No readable text was found in the image.",
                text: ""
            });
        }

        return res.json({
            success: true,
            text: text
        });

    } catch (error) {
        console.error("OCR ERROR:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "OCR processing failed."
        });
    }
});

async function callOCR(formData) {
    const response = await fetch(
        "https://api.ocr.space/parse/image",
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error(
            `OCR service returned HTTP ${response.status}`
        );
    }

    return await response.json();
}

function extractOCRText(result) {
    if (!result) {
        return "";
    }

    if (result.IsErroredOnProcessing) {
        console.error(
            "OCR processing error:",
            result.ErrorMessage
        );
        return "";
    }

    if (!Array.isArray(result.ParsedResults)) {
        return "";
    }

    return result.ParsedResults
        .map(item => item && item.ParsedText ? item.ParsedText : "")
        .join("\n")
        .trim();
}

// Error handler
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                error: "Image is too large. Maximum size is 10 MB."
            });
        }
    }

    res.status(500).json({
        success: false,
        error: err.message || "Server error."
    });
});

app.listen(PORT, () => {
    console.log("----------------------------------------");
    console.log("Legal Metrology server started");
    console.log(`Open: http://localhost:${PORT}`);
    console.log("----------------------------------------");
});