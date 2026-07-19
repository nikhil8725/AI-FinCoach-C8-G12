"""Console logging so you can watch each agent and the RAG pipeline work while the server runs.
Separate from `llm.py`'s `logs/llm.jsonl` file (that's for cost/latency auditing; this is for
watching the analysis/chat pipeline live in the terminal).
"""

import logging
import sys

_CONFIGURED = False


def setup_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    # Log messages quote real currency figures (e.g. "₹1,45,000") — on Windows, stdout defaults
    # to the system codepage (often cp1252/cp1256), which raises UnicodeEncodeError on ₹. Force
    # UTF-8 so a log line never crashes the handler.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s  %(name)-22s %(message)s", datefmt="%H:%M:%S")
    )
    logger = logging.getLogger("fincoach")
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    logger.propagate = False
    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"fincoach.{name}")
