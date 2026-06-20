from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from db import cursor, transaction


def now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def unique_slug(title: str, item_id: int | None = None) -> str:
    base = slugify(title)
    slug = base
    counter = 2
    with cursor() as db_cursor:
        while True:
            params: tuple[Any, ...] = (slug,)
            sql = "SELECT id FROM projects WHERE slug = %s"
            if item_id:
                sql += " AND id != %s"
                params = (slug, item_id)
            db_cursor.execute(sql, params)
            if not db_cursor.fetchone():
                return slug
            slug = f"{base}-{counter}"
            counter += 1


def _value(row: Any, key: str, default: Any = "") -> Any:
    if row is None:
        return default
    if isinstance(row, dict):
        return row.get(key, default)
    if hasattr(row, "keys") and key in row.keys():
        return row[key]
    return default


def format_datetime(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    return str(val)


def _project(row: Any) -> dict[str, Any]:
    return {
        "id": str(_value(row, "id", "")),
        "title": _value(row, "title") or "",
        "slug": _value(row, "slug") or "",
        "category": _value(row, "category") or "",
        "description": _value(row, "description") or "",
        "tech": _value(row, "technologies") or "",
        "technologies": _value(row, "technologies") or "",
        "image": _value(row, "image") or "",
        "status": _value(row, "status") or "Draft",
        "featured": bool(_value(row, "featured", 0)),
        "created_at": format_datetime(_value(row, "created_at")),
        "updated_at": format_datetime(_value(row, "updated_at")),
    }


def _review(row: Any) -> dict[str, Any]:
    return {
        "id": str(_value(row, "id", "")),
        "client": _value(row, "client_name") or "",
        "client_name": _value(row, "client_name") or "",
        "role": _value(row, "company_name") or "",
        "company_name": _value(row, "company_name") or "",
        "message": _value(row, "review") or "",
        "review": _value(row, "review") or "",
        "rating": int(_value(row, "rating", 5) or 5),
        "client_image": _value(row, "client_image") or "",
        "status": _value(row, "status") or "Visible",
        "created_at": format_datetime(_value(row, "created_at")),
    }


def _contact(row: Any) -> dict[str, Any]:
    return {
        "id": str(_value(row, "id", "")),
        "name": _value(row, "name") or "",
        "email": _value(row, "email") or "",
        "phone": _value(row, "phone") or "",
        "service": _value(row, "service") or "",
        "message": _value(row, "message") or "",
        "status": _value(row, "status") or "New",
        "created_at": format_datetime(_value(row, "created_at")),
    }


def _service(row: Any) -> dict[str, Any]:
    return {
        "id": str(_value(row, "id", "")),
        "title": _value(row, "title") or "",
        "description": _value(row, "description") or "",
        "icon": _value(row, "icon") or "",
        "created_at": format_datetime(_value(row, "created_at")),
    }


def list_projects(public_only: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM projects"
    params: tuple[Any, ...] = ()
    if public_only:
        sql += " WHERE status IN (%s, %s)"
        params = ("Published", "Featured")
    sql += " ORDER BY created_at DESC, id DESC"
    with cursor() as db_cursor:
        db_cursor.execute(sql, params)
        return [_project(row) for row in db_cursor.fetchall()]


def get_project(item_id: int) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM projects WHERE id = %s", (item_id,))
        row = db_cursor.fetchone()
        return _project(row) if row else None


def create_project(data: dict[str, Any]) -> dict[str, Any]:
    slug = unique_slug(data["title"])
    featured = 1 if data.get("featured") or data.get("status") == "Featured" else 0
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            INSERT INTO projects (title, slug, category, description, technologies, image, status, featured, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data["title"],
                slug,
                data["category"],
                data["description"],
                data.get("technologies") or data.get("tech") or "",
                data.get("image") or "",
                data.get("status") or "Draft",
                featured,
                data.get("created_at") or now(),
            ),
        )
        row = db_cursor.fetchone()
        item_id = row["id"]
    return get_project(item_id)


def update_project(item_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_project(item_id)
    if not existing:
        return None
    title = data.get("title", existing["title"])
    slug = unique_slug(title, item_id)
    featured = 1 if data.get("featured", existing["featured"]) or data.get("status", existing["status"]) == "Featured" else 0
    image = data.get("image") if data.get("image") is not None else existing["image"]
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            UPDATE projects
            SET title=%s, slug=%s, category=%s, description=%s, technologies=%s, image=%s, status=%s, featured=%s
            WHERE id=%s
            """,
            (
                title,
                slug,
                data.get("category", existing["category"]),
                data.get("description", existing["description"]),
                data.get("technologies", data.get("tech", existing["tech"])),
                image,
                data.get("status", existing["status"]),
                featured,
                item_id,
            ),
        )
    return get_project(item_id)


def delete_project(item_id: int) -> bool:
    with transaction() as db_cursor:
        db_cursor.execute("DELETE FROM projects WHERE id = %s", (item_id,))
        return db_cursor.rowcount > 0


def list_reviews() -> list[dict[str, Any]]:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM reviews ORDER BY created_at DESC, id DESC")
        return [_review(row) for row in db_cursor.fetchall()]


def get_review(item_id: int) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM reviews WHERE id = %s", (item_id,))
        row = db_cursor.fetchone()
        return _review(row) if row else None


def create_review(data: dict[str, Any]) -> dict[str, Any]:
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            INSERT INTO reviews (client_name, company_name, review, rating, client_image, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (client_name, company_name, review) DO NOTHING
            RETURNING id
            """,
            (
                data["client_name"],
                data.get("company_name") or "",
                data["review"],
                int(data.get("rating") or 5),
                data.get("client_image") or "",
                data.get("status") or "Visible",
                data.get("created_at") or now(),
            ),
        )
        row = db_cursor.fetchone()
        item_id = row["id"] if row else None
    if not item_id:
        return find_review(data["client_name"], data.get("company_name") or "", data["review"])
    return get_review(item_id)


def find_review(client_name: str, company_name: str, review: str) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute(
            "SELECT * FROM reviews WHERE client_name=%s AND company_name=%s AND review=%s",
            (client_name, company_name, review),
        )
        row = db_cursor.fetchone()
        return _review(row) if row else None


def update_review(item_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_review(item_id)
    if not existing:
        return None
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            UPDATE reviews
            SET client_name=%s, company_name=%s, review=%s, rating=%s, client_image=%s, status=%s
            WHERE id=%s
            """,
            (
                data.get("client_name", existing["client_name"]),
                data.get("company_name", existing["company_name"]),
                data.get("review", existing["review"]),
                int(data.get("rating", existing["rating"])),
                data.get("client_image", existing["client_image"]),
                data.get("status", existing["status"]),
                item_id,
            ),
        )
    return get_review(item_id)


def delete_review(item_id: int) -> bool:
    with transaction() as db_cursor:
        db_cursor.execute("DELETE FROM reviews WHERE id = %s", (item_id,))
        return db_cursor.rowcount > 0


def list_contacts() -> list[dict[str, Any]]:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM contacts ORDER BY created_at DESC, id DESC")
        return [_contact(row) for row in db_cursor.fetchall()]


def get_contact(item_id: int) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM contacts WHERE id = %s", (item_id,))
        row = db_cursor.fetchone()
        return _contact(row) if row else None


def create_contact(data: dict[str, Any]) -> dict[str, Any]:
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            INSERT INTO contacts (name, email, phone, service, message, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data["name"],
                data["email"],
                data.get("phone") or "",
                data.get("service") or "",
                data["message"],
                data.get("status") or "New",
                data.get("created_at") or now(),
            ),
        )
        row = db_cursor.fetchone()
        item_id = row["id"]
    return get_contact(item_id)


def update_contact(item_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_contact(item_id)
    if not existing:
        return None
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            UPDATE contacts SET name=%s, email=%s, phone=%s, service=%s, message=%s, status=%s WHERE id=%s
            """,
            (
                data.get("name", existing["name"]),
                data.get("email", existing["email"]),
                data.get("phone", existing["phone"]),
                data.get("service", existing["service"]),
                data.get("message", existing["message"]),
                data.get("status", existing["status"]),
                item_id,
            ),
        )
    return get_contact(item_id)


def delete_contact(item_id: int) -> bool:
    with transaction() as db_cursor:
        db_cursor.execute("DELETE FROM contacts WHERE id = %s", (item_id,))
        return db_cursor.rowcount > 0


def list_services() -> list[dict[str, Any]]:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM services ORDER BY created_at DESC, id DESC")
        return [_service(row) for row in db_cursor.fetchall()]


def get_service(item_id: int) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM services WHERE id = %s", (item_id,))
        row = db_cursor.fetchone()
        return _service(row) if row else None


def create_service(data: dict[str, Any]) -> dict[str, Any]:
    with transaction() as db_cursor:
        db_cursor.execute(
            """
            INSERT INTO services (title, description, icon, created_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (title) DO NOTHING
            RETURNING id
            """,
            (data["title"], data["description"], data.get("icon") or "", data.get("created_at") or now()),
        )
        row = db_cursor.fetchone()
        item_id = row["id"] if row else None
    if not item_id:
        return find_service(data["title"])
    return get_service(item_id)


def find_service(title: str) -> dict[str, Any] | None:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT * FROM services WHERE title=%s", (title,))
        row = db_cursor.fetchone()
        return _service(row) if row else None


def update_service(item_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_service(item_id)
    if not existing:
        return None
    with transaction() as db_cursor:
        db_cursor.execute(
            "UPDATE services SET title=%s, description=%s, icon=%s WHERE id=%s",
            (
                data.get("title", existing["title"]),
                data.get("description", existing["description"]),
                data.get("icon", existing["icon"]),
                item_id,
            ),
        )
    return get_service(item_id)


def delete_service(item_id: int) -> bool:
    with transaction() as db_cursor:
        db_cursor.execute("DELETE FROM services WHERE id = %s", (item_id,))
        return db_cursor.rowcount > 0


def count_users() -> int:
    with cursor() as db_cursor:
        db_cursor.execute("SELECT COUNT(*) as count FROM admins")
        row = db_cursor.fetchone()
        return row["count"] if row else 0

