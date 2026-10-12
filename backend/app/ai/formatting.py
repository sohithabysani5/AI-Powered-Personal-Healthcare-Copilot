"""Output cleanup shared by the assistant and report explainer."""

import re


def remove_heading_hashes(text: str) -> str:
    """Keep heading text while removing Markdown hash prefixes."""
    return re.sub(r"(?m)^\s{0,3}#{1,6}[ \t]+", "", text).strip()
