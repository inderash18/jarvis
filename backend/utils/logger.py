"""
JARVIS Logger Utility
─────────────────────────────
Loguru-based structured logging with console + file output.
"""

import sys

from loguru import logger

from app.config import settings


def setup_logging():
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format=(
            "<green>{time:HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan> - "
            "<level>{message}</level>"
        ),
        level=settings.LOG_LEVEL,
    )
    logger.add(
        "logs/jarvis.log",
        rotation="10 MB",
        retention="1 week",
        level="DEBUG",
        compression="zip",
    )
    return logger


log = setup_logging()
