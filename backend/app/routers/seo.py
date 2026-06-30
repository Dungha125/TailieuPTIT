import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.tag import Tag
from app.services.document_service import get_documents_query
from app.services.slug_service import unique_document_slug, unique_tag_slug
from app.utils.slugify import slugify

logger = logging.getLogger(__name__)

router = APIRouter(tags=["SEO"])


def _site_base() -> str:
    return settings.site_url.rstrip("/")


@router.get("/seo/sitemap.xml", response_class=Response)
def sitemap_xml(db: Session = Depends(get_db)):
    cached = None
    try:
        from app.services.redis_service import redis_service

        cached = redis_service.get("seo:sitemap")
        if cached:
            return Response(content=cached, media_type="application/xml")
    except Exception:
        pass

    base = _site_base()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    urls: list[str] = [
        f"""  <url>
    <loc>{base}/</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>""",
        f"""  <url>
    <loc>{base}/documents</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>""",
        f"""  <url>
    <loc>{base}/search</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>""",
    ]

    tags = db.query(Tag).order_by(Tag.name).all()
    for tag in tags:
        tag_slug = tag.slug or slugify(tag.name)
        urls.append(
            f"""  <url>
    <loc>{base}/danh-muc/{tag_slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>"""
        )

    docs = (
        get_documents_query(db)
        .filter(Document.slug.isnot(None))
        .order_by(Document.updated_at.desc())
        .all()
    )
    for doc in docs:
        lastmod = (doc.updated_at or doc.created_at).strftime("%Y-%m-%d")
        urls.append(
            f"""  <url>
    <loc>{base}/tai-lieu/{doc.slug}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>"""
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )

    try:
        from app.services.redis_service import redis_service

        redis_service.set("seo:sitemap", xml, ttl=3600)
    except Exception as e:
        logger.warning("Sitemap cache error: %s", e)

    return Response(content=xml, media_type="application/xml")


@router.get("/seo/robots.txt", response_class=PlainTextResponse)
def robots_txt():
    base = _site_base()
    content = f"""User-agent: *
Allow: /
Allow: /documents
Allow: /tai-lieu/
Allow: /danh-muc/
Allow: /search

Disallow: /internal-admin-portal/
Disallow: /api/
Disallow: /admin/
Disallow: /auth/

Sitemap: {base}/sitemap.xml
"""
    return PlainTextResponse(content)


def run_seo_migrations(db: Session) -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(db.get_bind())
    doc_cols = {c["name"] for c in inspector.get_columns("documents")}
    tag_cols = {c["name"] for c in inspector.get_columns("tags")}

    if "slug" not in doc_cols:
        db.execute(text("ALTER TABLE documents ADD COLUMN slug VARCHAR(300)"))
        db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_documents_slug ON documents (slug)"))
        db.commit()
        logger.info("Added documents.slug column")

    if "slug" not in tag_cols:
        db.execute(text("ALTER TABLE tags ADD COLUMN slug VARCHAR(120)"))
        db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tags_slug ON tags (slug)"))
        db.commit()
        logger.info("Added tags.slug column")

    docs_without_slug = db.query(Document).filter(Document.slug.is_(None)).all()
    for doc in docs_without_slug:
        doc.slug = unique_document_slug(db, doc.title, exclude_id=doc.id)
    if docs_without_slug:
        db.commit()
        logger.info("Backfilled %d document slugs", len(docs_without_slug))

    tags_without_slug = db.query(Tag).filter(Tag.slug.is_(None)).all()
    for tag in tags_without_slug:
        tag.slug = unique_tag_slug(db, tag.name, exclude_id=tag.id)
    if tags_without_slug:
        db.commit()
        logger.info("Backfilled %d tag slugs", len(tags_without_slug))
