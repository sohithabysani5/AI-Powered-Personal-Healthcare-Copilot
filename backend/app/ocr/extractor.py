"""Medical document text extraction using PyMuPDF and Tesseract OCR."""

import os
import io
import re
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
from app.core.config import settings


def get_tesseract_configured() -> bool:
    """Verify if Tesseract executable is accessible."""
    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_text_from_pdf(file_path: str) -> tuple[str, bool]:
    """
    Extracts text from PDF file.
    Tries native digital text extraction first.
    If extracted text is minimal or missing, attempts OCR page rendering.
    Returns: (extracted_text, ocr_applied)
    """
    full_text = []
    ocr_applied = False
    
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text and len(text.strip()) > 30:
                full_text.append(text)
            else:
                # If digital text is insufficient, try OCR on page image
                if get_tesseract_configured():
                    try:
                        pix = page.get_pixmap(dpi=200)
                        img = Image.open(io.BytesIO(pix.tobytes("png")))
                        ocr_text = pytesseract.image_to_string(img, lang="eng")
                        if ocr_text and len(ocr_text.strip()) > 10:
                            full_text.append(ocr_text)
                            ocr_applied = True
                    except Exception:
                        pass
        doc.close()
    except Exception as e:
        return f"Error extracting PDF: {str(e)}", False

    extracted_result = "\n\n".join(full_text).strip()
    return (extracted_result, ocr_applied)


def extract_text_from_image(file_path: str) -> tuple[str, bool]:
    """
    Extracts text from JPG/PNG image using RapidOCR or Tesseract OCR.
    """
    # 1. Try RapidOCR (embedded pure-Python ONNX engine, highly accurate)
    try:
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
        result, _ = engine(file_path)
        if result:
            lines = [line[1] for line in result]
            extracted_text = "\n".join(lines).strip()
            if len(extracted_text) > 10:
                return (extracted_text, True)
    except Exception:
        pass

    # 2. Try Tesseract OCR if installed
    if get_tesseract_configured():
        try:
            img = Image.open(file_path)
            img_gray = img.convert("L")
            text = pytesseract.image_to_string(img_gray, lang="eng")
            if text and len(text.strip()) > 5:
                return (text.strip(), True)
        except Exception as e:
            return (f"OCR Processing Error: {str(e)}", False)

    return (
        "OCR Notice: No text could be detected in this image.",
        False
    )
