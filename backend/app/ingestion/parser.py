"""File → raw table/text extraction for csv, xlsx, pdf, and plain text uploads."""

from dataclasses import dataclass, field

import pandas as pd
import pdfplumber


@dataclass
class ParsedDocument:
    """Raw extraction result, before any LLM column-mapping or categorization happens."""

    tables: list[pd.DataFrame] = field(default_factory=list)
    text: str = ""
    warning: str | None = None


def parse_csv(path: str) -> ParsedDocument:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    return ParsedDocument(tables=[df])


def parse_xlsx(path: str) -> ParsedDocument:
    sheets = pd.read_excel(path, sheet_name=None, dtype=str, engine="openpyxl")
    tables = [df.fillna("") for df in sheets.values() if not df.empty]
    return ParsedDocument(tables=tables)


def parse_pdf(path: str) -> ParsedDocument:
    tables: list[pd.DataFrame] = []
    text_parts: list[str] = []
    failed_pages: list[int] = []
    total_pages = 0

    with pdfplumber.open(path) as pdf:
        total_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            try:
                page_text = page.extract_text() or ""
                if page_text:
                    text_parts.append(page_text)
                for raw_table in page.extract_tables():
                    if not raw_table or len(raw_table) < 2:
                        continue
                    header, *rows = raw_table
                    header = [str(h or f"col_{j}") for j, h in enumerate(header)]
                    df = pd.DataFrame(rows, columns=header).fillna("")
                    tables.append(df)
            except Exception:  # noqa: BLE001 — one bad page must not sink the whole document
                failed_pages.append(i)

    warning = None
    if failed_pages:
        parsed_pages = total_pages - len(failed_pages)
        warning = (
            f"Couldn't parse page(s) {', '.join(str(p) for p in failed_pages)} of {total_pages} "
            f"— using {parsed_pages} of {total_pages} pages."
        )

    return ParsedDocument(tables=tables, text="\n".join(text_parts), warning=warning)


def parse_txt(path: str) -> ParsedDocument:
    with open(path, encoding="utf-8", errors="replace") as f:
        return ParsedDocument(text=f.read())


def parse_file(path: str, file_type: str) -> ParsedDocument:
    if file_type == "csv":
        return parse_csv(path)
    if file_type == "xlsx":
        return parse_xlsx(path)
    if file_type == "pdf":
        return parse_pdf(path)
    if file_type == "txt":
        return parse_txt(path)
    raise ValueError(f"Unsupported file type: {file_type}")
