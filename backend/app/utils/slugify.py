import re
import unicodedata


def slugify(text: str, max_length: int = 200) -> str:
    if not text:
        return "tai-lieu"
    normalized = unicodedata.normalize("NFD", text.strip())
    without_accents = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    lowered = without_accents.lower()
    cleaned = re.sub(r"[^\w\s-]", "", lowered)
    slug = re.sub(r"[\s_]+", "-", cleaned).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return (slug[:max_length] or "tai-lieu").strip("-")
