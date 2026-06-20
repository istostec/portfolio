from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from db import cursor
from services import repository


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "store.json"


def _read_store() -> dict[str, list[dict[str, Any]]]:
    if not DATA_FILE.exists():
        return {"projects": [], "reviews": [], "contacts": [], "services": []}
    with DATA_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return {
        "projects": data.get("projects", []),
        "reviews": data.get("reviews", []),
        "contacts": data.get("contacts", []),
        "services": data.get("services", []),
    }


def _project_exists(title: str, slug: str) -> bool:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT id FROM projects WHERE title=%s OR slug=%s LIMIT 1", (title, slug))
        return db_cursor.fetchone() is not None


def _contact_exists(contact: dict[str, Any]) -> bool:
    with cursor() as db_cursor:
        db_cursor.execute(
            """
            SELECT id FROM contacts
            WHERE name=%s AND email=%s AND message=%s AND created_at=%s
            LIMIT 1
            """,
            (
                contact.get("name") or "",
                contact.get("email") or "",
                contact.get("message") or "",
                contact.get("created_at") or repository.now(),
            ),
        )
        return db_cursor.fetchone() is not None


def migrate_json_to_db() -> dict[str, int]:
    store = _read_store()
    imported = {"projects": 0, "reviews": 0, "contacts": 0, "services": 0}

    for project in store["projects"]:
        title = (project.get("title") or "").strip()
        category = (project.get("category") or "").strip()
        description = (project.get("description") or "").strip()
        if not title or not category or not description:
            continue
        slug = repository.slugify(project.get("slug") or title)
        if _project_exists(title, slug):
            continue
        repository.create_project(
            {
                "title": title,
                "category": category,
                "description": description,
                "technologies": project.get("technologies") or project.get("tech") or "",
                "image": project.get("image") or "",
                "status": project.get("status") or "Draft",
                "featured": project.get("featured") or project.get("status") == "Featured",
                "created_at": project.get("created_at") or repository.now(),
            }
        )
        imported["projects"] += 1

    for review in store["reviews"]:
        client_name = (review.get("client_name") or review.get("client") or "").strip()
        company_name = (review.get("company_name") or review.get("role") or "").strip()
        message = (review.get("review") or review.get("message") or "").strip()
        if not client_name or not message:
            continue
        if repository.find_review(client_name, company_name, message):
            continue
        repository.create_review(
            {
                "client_name": client_name,
                "company_name": company_name,
                "review": message,
                "rating": review.get("rating") or 5,
                "client_image": review.get("client_image") or "",
                "status": review.get("status") or "Visible",
                "created_at": review.get("created_at") or repository.now(),
            }
        )
        imported["reviews"] += 1

    for contact in store["contacts"]:
        name = (contact.get("name") or "").strip()
        email = (contact.get("email") or "").strip()
        message = (contact.get("message") or "").strip()
        if not name or not email or not message:
            continue
        normalized = {
            "name": name,
            "email": email,
            "phone": contact.get("phone") or "",
            "service": contact.get("service") or "",
            "message": message,
            "status": contact.get("status") or "New",
            "created_at": contact.get("created_at") or repository.now(),
        }
        if _contact_exists(normalized):
            continue
        repository.create_contact(normalized)
        imported["contacts"] += 1

    for service in store["services"]:
        title = (service.get("title") or "").strip()
        description = (service.get("description") or "").strip()
        if not title or not description or repository.find_service(title):
            continue
        repository.create_service(
            {
                "title": title,
                "description": description,
                "icon": service.get("icon") or "",
                "created_at": service.get("created_at") or repository.now(),
            }
        )
        imported["services"] += 1

    return imported


if __name__ == "__main__":
    from db import init_database

    init_database()
    result = migrate_json_to_db()
    print(f"Migration complete: {result}")
