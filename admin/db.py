from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash


class DatabaseError(RuntimeError):
    pass


def get_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise DatabaseError("DATABASE_URL environment variable is not set.")
    # Normalize postgres:// to postgresql:// (Render compatibility)
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    try:
        connection = psycopg2.connect(db_url)
        return connection
    except Exception as e:
        raise DatabaseError(f"Failed to connect to PostgreSQL: {e}")


@contextmanager
def cursor(dictionary: bool = True, commit: bool = False) -> Iterator[Any]:
    connection = get_connection()
    if dictionary:
        db_cursor = connection.cursor(cursor_factory=RealDictCursor)
    else:
        db_cursor = connection.cursor()
    try:
        yield db_cursor
        if commit:
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        db_cursor.close()
        connection.close()


@contextmanager
def transaction() -> Iterator[Any]:
    connection = get_connection()
    db_cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        yield db_cursor
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        db_cursor.close()
        connection.close()


def init_tables() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'admin',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            category VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            technologies TEXT,
            image VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'Draft',
            featured INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            client_name VARCHAR(255) NOT NULL,
            company_name VARCHAR(255),
            review TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 5,
            client_image VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'Visible',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_review UNIQUE(client_name, company_name, review)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            service VARCHAR(255),
            message TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'New',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            description TEXT NOT NULL,
            icon VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]
    with transaction() as db_cursor:
        for statement in statements:
            db_cursor.execute(statement)


def create_default_admin() -> None:
    with transaction() as db_cursor:
        db_cursor.execute("SELECT id FROM admins WHERE email = %s", ("admin@firm.com",))
        if db_cursor.fetchone():
            return
        db_cursor.execute(
            """
            INSERT INTO admins (name, email, password_hash, role)
            VALUES (%s, %s, %s, %s)
            """,
            ("ISTOS Admin", "admin@firm.com", generate_password_hash("admin123"), "admin"),
        )


def init_database() -> None:
    init_tables()
    create_default_admin()
