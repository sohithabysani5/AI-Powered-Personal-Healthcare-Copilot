"""Deterministic rule-based medical report explainer and local fallback."""

from typing import Dict, Any, List


# Deterministic educational explanations for common tests
TEST_DESCRIPTIONS = {
    "Hemoglobin": "Hemoglobin is an iron-rich protein in red blood cells that carries oxygen from your lungs throughout your body.",
    "Fasting Blood Glucose": "Fasting blood sugar measures blood glucose levels after fasting for at least 8 hours, helping assess how your body manages carbohydrates and insulin.",
    "Post Prandial Blood Glucose": "Post prandial glucose measures blood sugar level 2 hours after a meal to see how effectively insulin handles food intake.",
    "HbA1c": "HbA1c reflects average blood sugar control over the past 2 to 3 months by measuring glucose attached to hemoglobin.",
    "Total Cholesterol": "Total cholesterol measures the overall amount of cholesterol in your bloodstream, an important factor in cardiovascular health.",
    "Serum Creatinine": "Creatinine is a waste product from muscle breakdown filtered by the kidneys, commonly used to gauge kidney filtration function.",
    "Blood Urea Nitrogen": "Blood Urea Nitrogen measures nitrogen waste in your blood from protein breakdown, evaluating kidney function and hydration.",
    "WBC Count": "White blood cells are an essential part of the immune system that defend the body against infections and inflammation.",
    "Platelet Count": "Platelets are small cell fragments that play a crucial role in forming blood clots and preventing excessive bleeding.",
    "Thyroid Stimulating Hormone (TSH)": "TSH is produced by the pituitary gland to control how much thyroid hormone your thyroid gland releases."
}


def generate_deterministic_summary(data: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """
    Generates a clear, clinically safe, deterministic rule-based summary
    without making any external AI calls.
    """
    category = data.get("category", "medical document")
    doc_date = data.get("document_date", "Date not specified")
    provider = data.get("healthcare_provider", "Healthcare facility not specified")
    labs = data.get("lab_tests", [])
    meds = data.get("medications", [])
    diagnoses = data.get("diagnoses", [])

    summary_lines = []
    summary_lines.append(f"**Document Type:** {category.replace('_', ' ').title()}")
    summary_lines.append(f"**Date:** {doc_date}")
    if provider:
        summary_lines.append(f"**Provider:** {provider}")

    findings_lines = []
    flagged_lines = []
    unassessed_lines = []
    
    if labs:
        findings_lines.append("\n**Laboratory Measurements Recorded:**")
        for test in labs:
            name = test.get("test_name", "Test")
            val = test.get("value", "N/A")
            unit = test.get("unit") or ""
            ref = test.get("reference_range")
            flag = test.get("flag") or ("Normal" if ref else "Not assessed")

            ref_str = f"(Reference Range: {ref})" if ref else "(Reference Range not provided in document)"
            flag_str = f"[{flag.upper()}]" if flag in ["High", "Low"] else ""
            
            line = f"• **{name}**: {val} {unit} {flag_str} {ref_str}"
            findings_lines.append(line)

            if flag in ["High", "Low"]:
                flagged_lines.append(f"• **{name}** is reported as **{flag}** relative to the source range ({ref or 'range unlisted'}).")
            elif not ref or flag == "Not assessed":
                unassessed_lines.append(f"• **{name}** cannot be compared because this report does not provide a reference range.")

    if meds:
        findings_lines.append("\n**Medications Identified:**")
        for m in meds:
            name = m.get("name", "Medicine")
            dose = m.get("dosage", "")
            freq = m.get("frequency", "")
            findings_lines.append(f"• **{name}** {dose} - {freq}")

    if diagnoses:
        findings_lines.append("\n**Diagnoses/Impressions Mentioned:**")
        for d in diagnoses:
            findings_lines.append(f"• {d}")

    # General educational explanations
    educational_notes = []
    if labs:
        educational_notes.append("\n**General Information About Tests:**")
        for test in labs:
            name = test.get("test_name")
            if name in TEST_DESCRIPTIONS:
                educational_notes.append(f"• **{name}**: {TEST_DESCRIPTIONS[name]}")

    # Questions to ask doctor
    doctor_questions = [
        "Do any of these test results require further evaluation or follow-up tests?",
        "How do these findings compare with my previous health history?",
        "Are there any lifestyle or dietary adjustments recommended based on these reports?"
    ]
    if flagged_lines:
        doctor_questions.insert(0, "What clinical significance do the flagged high/low values hold for my specific condition?")

    full_explanation = "\n".join(summary_lines + findings_lines + educational_notes)
    if flagged_lines:
        full_explanation += (
            "\n\n**What Stands Out:**\n"
            "These results are marked high or low against ranges printed in this report. "
            "A flag is not a diagnosis.\n"
            + "\n".join(flagged_lines)
        )
    if unassessed_lines:
        full_explanation += (
            "\n\n**Results Without a Comparison Range:**\n"
            + "\n".join(unassessed_lines)
        )

    disclaimer = (
        "\n\n*Educational Notice: This report explanation is generated locally using deterministic clinical rules. "
        "Reference ranges differ between laboratories, age groups, and clinical conditions. "
        "Always consult your doctor or a qualified healthcare specialist for diagnosis and treatment plans.*"
    )
    full_explanation += disclaimer

    return {
        "summary": "\n".join(summary_lines),
        "explanation": full_explanation,
        "doctor_questions": doctor_questions,
        "flagged_items": flagged_lines,
        "is_rule_based": True
    }
