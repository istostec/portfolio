from __future__ import annotations

import os


class Config:
    SECRET_KEY = os.environ.get("ISTOS_ADMIN_SECRET", "istos-admin-local-secret")
    MYSQL_DATABASE = os.environ.get("FIRM_DB_NAME", "firm_db")
    MYSQL_HOST = os.environ.get("FIRM_DB_HOST", os.environ.get("MYSQL_HOST", "127.0.0.1"))
    MYSQL_PORT = int(os.environ.get("FIRM_DB_PORT", os.environ.get("MYSQL_PORT", "3306")))
    MYSQL_USER = os.environ.get("FIRM_DB_USER", os.environ.get("MYSQL_USER", "root"))
    MYSQL_PASSWORD = os.environ.get("FIRM_DB_PASSWORD", os.environ.get("MYSQL_PASSWORD", ""))
