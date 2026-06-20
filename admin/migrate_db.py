from __future__ import annotations

import os
import sqlite3
import psycopg2
from pathlib import Path
from db import init_database, get_connection

BASE_DIR = Path(__file__).resolve().parent
SQLITE_DB = BASE_DIR / "data" / "firm.db"

def migrate() -> None:
    print("Starting database migration from SQLite to PostgreSQL...")

    if not SQLITE_DB.exists():
        print(f"SQLite database not found at {SQLITE_DB}. Skipping data copy.")
        return

    # Ensure PG database is initialized and tables exist
    init_database()

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Connect to PostgreSQL
    pg_conn = get_connection()
    pg_cur = pg_conn.cursor()

    tables = ["admins", "projects", "reviews", "contacts", "services"]

    for table in tables:
        print(f"Migrating table '{table}'...")
        
        # Read from SQLite
        sqlite_cur.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()
        
        if not rows:
            print(f"Table '{table}' has no records in SQLite. Skipping.")
            continue
            
        print(f"Found {len(rows)} records in SQLite for table '{table}'.")

        # Dynamically build insert query with %s placeholders
        sample_row = rows[0]
        columns = list(sample_row.keys())
        
        # Check if 'id' is in columns
        if 'id' not in columns:
            print(f"Warning: 'id' not found in table '{table}'. Sequence reset will be skipped.")

        placeholders = ", ".join(["%s"] * len(columns))
        col_str = ", ".join(columns)
        
        # We use ON CONFLICT (id) DO NOTHING to support idempotent runs
        conflict_clause = "ON CONFLICT (id) DO NOTHING" if "id" in columns else ""
        if table == "reviews" and "id" in columns:
            # reviews table has an existing unique constraint (client_name, company_name, review)
            # but id is the primary key, so ON CONFLICT (id) DO NOTHING works.
            pass

        insert_query = f"INSERT INTO {table} ({col_str}) VALUES ({placeholders}) {conflict_clause}"
        
        count = 0
        for row in rows:
            values = [row[col] for col in columns]
            pg_cur.execute(insert_query, values)
            count += 1
            
        pg_conn.commit()
        print(f"Inserted/Skipped {count} records into PostgreSQL table '{table}'.")

        # Reset serial sequence for auto-increment keys
        if "id" in columns:
            seq_reset_query = f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(max(id), 1)) FROM {table};"
            pg_cur.execute(seq_reset_query)
            pg_conn.commit()
            print(f"Sequence reset completed for table '{table}'.")

    sqlite_conn.close()
    pg_conn.close()
    print("Database migration completed successfully!")

if __name__ == "__main__":
    migrate()
