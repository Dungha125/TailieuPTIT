import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def run_user_migrations(db: Session) -> None:
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email) WHERE email IS NOT NULL"))
    db.commit()
    logger.info("User columns ensured")


def run_notes_migrations(db: Session) -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS note_folders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            parent_id INTEGER REFERENCES note_folders(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            folder_id INTEGER REFERENCES note_folders(id) ON DELETE SET NULL,
            title VARCHAR(500) NOT NULL DEFAULT 'Không có tiêu đề',
            content TEXT,
            content_format VARCHAR(20) NOT NULL DEFAULT 'json',
            is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
            trashed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS note_document_links (
            id SERIAL PRIMARY KEY,
            note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            anchor_text VARCHAR(500) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS bookmark_folders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS document_bookmarks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            folder_id INTEGER REFERENCES bookmark_folders(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, document_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS document_views (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            viewed_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, document_id)
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_notes_user_id ON notes(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_notes_folder_id ON notes(folder_id)",
        "CREATE INDEX IF NOT EXISTS ix_notes_updated_at ON notes(updated_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_note_folders_user_id ON note_folders(user_id)",
    ]
    for stmt in statements:
        db.execute(text(stmt))
    db.commit()
    logger.info("Notes/bookmarks tables ensured")
