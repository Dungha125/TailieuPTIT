"""Run pending DB migrations manually.

Usage on VPS:
  docker exec tailieuptit-backend python -m app.migrate
"""

import logging

from app.database import SessionLocal
from app.routers.seo import run_seo_migrations
from app.services.classify_service import backfill_classify_from_legacy, run_classify_migrations
from app.services.tag_service import run_tag_migrations
from app.services.user_migrations import run_notes_migrations, run_user_migrations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    db = SessionLocal()
    try:
        run_seo_migrations(db)
        run_classify_migrations(db)
        run_tag_migrations(db)
        run_user_migrations(db)
        run_notes_migrations(db)
        count = backfill_classify_from_legacy(db)
        logger.info("Classify backfill updated %s documents", count)
    finally:
        db.close()


if __name__ == "__main__":
    main()
