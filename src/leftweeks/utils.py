import re


def validate_date(date_str: str) -> None:
    """날짜 형식이 유효한지 확인합니다 (YYYY-MM-DD)."""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise ValueError("날짜는 YYYY-MM-DD 형식이어야 합니다.")
    year, month, day = map(int, date_str.split("-"))
    if not (1 <= month <= 12 and 1 <= day <= 31):
        raise ValueError("유효하지 않은 날짜입니다.")


def process_filename(filename: str) -> str:
    """출력 파일 이름이 .pdf로 끝나는지 확인합니다."""
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    return filename
