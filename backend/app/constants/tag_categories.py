from fastapi import HTTPException, status

FACULTY = "faculty"
SUBJECT = "subject"
DOC_TYPE = "type"
YEAR = "year"

TAG_CATEGORIES = (FACULTY, SUBJECT, DOC_TYPE, YEAR)

TAG_CATEGORY_LABELS: dict[str, str] = {
    FACULTY: "Khoa / Viện",
    SUBJECT: "Môn học",
    DOC_TYPE: "Loại tài liệu",
    YEAR: "Năm học",
}


def validate_tag_category(category: str) -> str:
    value = (category or "").strip()
    if value not in TAG_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhóm danh mục không hợp lệ",
        )
    return value
